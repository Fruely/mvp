# Service intent extraction — `POST /api/intent/extract`

Shadow-mode endpoint. It turns free user text into a typed structured intent, a
preliminary safety result and at most one clarifying question.

The endpoint itself creates no `service_requests` row, publishes nothing,
notifies nobody and changes no matching behaviour. The only client that calls
it is the conversational intake on `/{lang}/request`, and only when
`SERVICE_INTENT_EXTRACTION_ENABLED` is exactly `true`. With the flag off that
page keeps the existing questionnaire, so production behaviour does not change.

## Why one call

A single standard model call does all of it at once: structured extraction,
which critical data is missing, the next question and the preliminary safety
signal. There is no mandatory second call per request.

Escalating a hard case to a stronger model stays architecturally possible —
`requestAiJson` takes the model from the caller's `auth` value — but no escalation
runs automatically in this phase. A future escalation would be a second, explicit
decision made by code after inspecting confidence, not an automatic retry.

## Request

```json
{
  "raw_text": "Нужен сантехник в Гамбурге завтра после 18:00",
  "locale": "ru",
  "time_zone": "Europe/Berlin",
  "known_context": {
    "work_format": "offline",
    "city": "Hamburg",
    "postal_code": "20095",
    "country_code": "DE",
    "radius_km": 30,
    "preferred_language": "ru",
    "resolved_fields": ["work_format"]
  }
}
```

- `raw_text`: 1 to `DESCRIPTION_MAX_LEN` (5000) characters, same ceiling as a
  service request description.
- `locale`: `ru`, `ua` or `de`.
- `time_zone`: a valid IANA zone. The **server** decides the current date from its
  own clock plus this zone; a client-supplied timestamp is never trusted.
- `known_context`: optional, only non-personal form data the client already has.
  `resolved_fields` lists what the person already settled, including an explicit
  "does not matter", so the same question is never asked twice.

Name, email and phone are not part of extraction and are rejected as unknown
fields. Any unknown key, an over-long text or an invalid zone is refused by
ordinary programmatic validation **before** the model is called, so malformed
input costs nothing.

## Response

`200` returns `ServiceIntentExtraction` (see `contract.ts`): `schema_version`,
`extraction_version`, `direction`, `raw_text`, `requested_service`,
`source_language`, `preferred_language`, `work_format`, `location`, `timing`,
`availability_note`, `recurrence`, `budget_text`, `category`, `confidence`,
`missing_fields`, `next_question`, `safety`.

Three fields are server-owned and the model is never asked for them:
`schema_version`, `extraction_version` and `raw_text`. `raw_text` is returned
byte-identical to the request — never rewritten, translated or corrected — so
text inside it cannot rewrite the envelope.

### Language

Three separate things: the language the text was written in
(`source_language`), the interface language (`locale`) and the language the
person wants to communicate in (`preferred_language`). Writing in Russian does
not by itself mean a Russian-speaking specialist is required, and an unknown
communication language stays `null`. It is never defaulted to `de`.

### Work format

`hybrid` means "genuinely both", never "unknown" and never "any". An
undetermined format is `null`, and becomes a missing field only when it actually
affects matching.

### Timing

Output maps onto the existing platform timing domain (`ServiceTimingFields`);
no second timing model is introduced. The model reports a descriptor of what was
said and the server owns all calendar arithmetic, on local year/month/day values
so a date can never shift through UTC conversion. When an expression cannot be
converted exactly, the original wording stays in the timing note and timing
confidence drops.

### The clarifying question

`next_question` is `null` when the data suffices. Otherwise it carries a stable
`field_code`, a short question in the `locale` language, optional short options
and whether "does not matter" is a sensible answer. Code, not the model, decides
which single field is asked; the model only contributes wording. Priority: what
exactly is needed, then where or online, then when, then communication language,
then one service-specific detail. Contacts are never asked here.

### Category

The person never sees a category. `category` is a hidden compatibility value
resolved by calling `suggestCategories` as a plain internal function — there is
no HTTP loopback between platform endpoints and no extra model call. `id` stays
`null` when nothing matches, and the category is never required.

### Safety is preliminary

`safety.verdict` is one of `allowed`, `restricted`, `manual_review`, `blocked`,
with stable reason codes, a confidence and a localizable message code.

- Medicine, legal, financial and veterinary work are legitimate services. They
  are `restricted` or `manual_review` and are never auto-blocked.
- Doubt resolves to `manual_review`, never to `blocked`.
- The model's opinion is clamped by ordinary code in `safety.ts`. It has no
  power over the database, it makes no publication decision, and the endpoint
  writes nothing and notifies nobody.

A small deterministic pre-check rejects content with too few letters to describe
anything, before any spend. It is not a banned-word list.

## Errors

Stable machine codes only; provider text, prompts and stack traces never leave
the server.

| Code | Status |
| --- | --- |
| `invalid_request`, `unsupported_locale`, `invalid_time_zone` | 400 |
| `rate_limited` | 429 |
| `feature_disabled`, `rate_limiter_unavailable`, `ai_unavailable` | 503 |
| `ai_timeout` | 504 |
| `invalid_model_response` | 502 |
| `internal_error` | 500 |

## Feature flag and environment

Server-only, never `NEXT_PUBLIC_*`:

- `SERVICE_INTENT_EXTRACTION_ENABLED` — off by default. Without an explicit
  `true` the endpoint answers `feature_disabled` and makes no model call.
- `SERVICE_INTENT_EXTRACTION_MODEL` — optional model override for this feature
  only. Defaults of the other AI features are untouched.

Credentials reuse the schemes already present in the repository, in order:
`AI_GATEWAY_API_KEY`, then `VERCEL_OIDC_TOKEN` (both via the AI Gateway), then
`OPENAI_API_KEY` directly. With none of them the endpoint reports
`ai_unavailable` instead of calling anything.

Rate limiting uses the existing Upstash configuration
(`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

## Cost protection

This is a public, paid endpoint, so it does not fail open in production:

- flag off → no model call;
- 20 requests per hour per IP, plus 60 per hour per authenticated user, where the
  user id comes only from a verified bearer token and never from the body;
- in production an unreachable or unconfigured rate-limit backend returns
  `rate_limiter_unavailable` **before** the model call. Outside production a
  missing Upstash configuration is tolerated.

The general `checkRateLimit` semantics used by every other endpoint are
unchanged; the fail-closed behaviour lives in a separate wrapper for paid AI
operations (`lib/ai/aiRateLimit.ts`).

Transport rules (`lib/ai/aiJsonClient.ts`): strict `json_schema` response format,
a timeout via `AbortSignal`, and at most one retry — for a network error, 429 or
5xx only. An ordinary 4xx, a timeout and any parsing failure are not retried.

A response cache is **not** implemented yet; see `TECH_DEBT.md` (TD-001). A
missing cache is acceptable in production, a missing rate limit is not.

## Logging

Logged: correlation id, schema name, transport, attempt number, duration,
outcome code, HTTP status, and for the category lookup only an error name.

Never logged: the raw text, the sanitized text, the model output, a name, an
email, a phone, an address, prompts or credentials.

Before the text is sent to the provider, contacts are stripped by the canonical
`lib/ai/textSanitize.ts` (shared with the promotion draft generator): email,
links, social handles and phone numbers become neutral markers. The user still
receives their own original text back.

## Conversational intake

`lib/serviceIntent/intake.ts` is the state of the screen on `/{lang}/request`.
It is not a new request type. A follow-up answer is sent as its own `raw_text`
together with the existing `known_context`; it is not appended to a transcript,
and fields already recognized are kept. At most three clarification steps, then
review. `service_detail` and other values the create contract does not require
are not asked just because they are null.

Name, email and phone are collected on the review screen and are sent only to
`POST /api/service-requests`, after the person presses the submit button.
`blocked` never builds that body. `restricted` and `manual_review` do, which is
the existing safety policy. An explicit "does not matter" for format is stored
as `hybrid`, the value the current questionnaire already saves for that answer.
