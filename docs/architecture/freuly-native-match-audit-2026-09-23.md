# Freuly Native Match — repository audit

Date: 2026-09-23

## Scope

This audit covers the Freuly `mvp` repository at `origin/main` (`ba1d361`) and
the first additive Match Engine slice on `feat/freuly-match-foundation`.

The separate Cursor workspace/repository named `Froli Native` was not mounted
in the available filesystem and could not be audited. Native UI completion is
therefore **unknown**, not zero. The Freuly backend contracts built for Native
are present in `mvp` and were audited here.

No retailer repository was available in this workspace. Reuse claims about the
retailer are architectural until that code is mounted and compared.

## Executive conclusion

Freuly already has most of the marketplace substrate. It is not only a visual
prototype. The shortest path is to keep the current canonical records and add
automatic distribution, push delivery, and an atomic response lifecycle.

Do not create a third request system.

- `service_requests` is the persistent client intent.
- `specialists` + `specialist_profiles` + `specialist_services` are supply intent.
- `request_offers` is the match/distribution record.
- Existing entitlement and contact-redaction code remains the privacy boundary.

## What already exists

| Layer | Existing implementation | Readiness for the new product |
|---|---|---:|
| Client demand | Public and Bearer create API, idempotency, ownership, history, detail, cancellation, structured timing/location/language | High |
| Specialist supply | Profile, services, media, language, work format, PLZ, coordinates, service radius, publication lifecycle | High |
| Native backend contract | Bearer auth for profile, services, media, leads; client request ownership/history; billing plan/history and native checkout return | High |
| Search | Language, category, free-text synonyms, service/profile text, online mode, city/PLZ and dual-radius local search | High |
| Lead Engine | `request_offers`, pricing rules, shadow prices, direct pay-per-lead checkout, Stripe-backed entitlements | Medium-high |
| Client privacy | Locked DTOs, contact redaction and server-authoritative unlock | High |
| Web install surface | PWA manifest, service worker, install flow, app-like shell | Medium; this is not the native app |
| Automatic matching | No live service-request distribution before this branch | Low → foundation added |
| Specialist opportunity inbox | Direct leads exist; matched `request_offers` do not yet have a dedicated Native inbox API | Low |
| Push notifications | No APNs/FCM/Expo token registry, outbox or delivery worker | Not implemented |
| Atomic claim/scarcity | Schema snapshots exist; no transactional claim of matched offers/max buyers | Not implemented |
| AI intent normalization | Static multilingual synonyms and structured form data only | Low |
| Auction | Pricing rules exist; bidding/auction state does not | Not implemented and not MVP |

## Important findings

### 1. The backend was already prepared for Native

Merged code supports Bearer-first Native access for the specialist profile,
services, media and leads. Client request creation accepts Bearer auth and binds
`client_user_id`. Billing supports a Native return target without trusting a
client-supplied redirect URL.

### 2. The existing Lead Engine is reusable

`request_offers` already supports both `direct_lead` and `service_request`
origins, a matched reason, pricing segments, subscription/pay-per-lead modes,
price snapshots, lifecycle timestamps and future buyer limits. Dynamic pricing
rules and direct-lead pay-per-lead fulfillment already exist.

The missing piece was production code that creates matched offers for open
`service_requests`.

### 3. Push is genuinely absent

Current notifications are owner/admin email or Telegram-oriented. The service
worker does not implement Web Push, and there is no mobile device-token model.
Push requires a dedicated registration table, notification outbox, provider
adapter, retry/idempotency policy and user notification preferences.

### 4. “First to take it” is not yet safe

The current schemas contain reservation/payment concepts, but matched-offer
capacity is not claimed atomically. A read-count-write implementation would
oversell under concurrency. Claim must be one database transaction/RPC with a
row lock or conditional update.

### 5. Categories can disappear from the UI, not from the backend

The current free-text search and synonym layer is useful as a fallback. The
category/service ontology should remain internal for matching, pricing,
compliance and analytics. Native can expose one free-text field while the server
normalizes the text into the existing taxonomy.

## Implemented in this branch

The first additive vertical slice introduces shadow automatic distribution:

1. A newly created `service_request` is treated as persistent demand.
2. Existing search is reused for language, category/free text, online/local and
   radius rules.
3. Hybrid requests search both local and online supply.
4. Candidate specialists are deduplicated and capped.
5. One idempotent, PII-free matched `request_offer` is created per candidate.
6. Existing shadow pricing can be attached.
7. The entire path is fail-open and disabled by default behind
   `LEAD_ENGINE_SERVICE_REQUEST_MATCHING_ENABLED`.

This slice does **not** unlock contacts, charge specialists, send push messages,
or change production behaviour until explicitly enabled.

## Recommended implementation sequence

### Slice 2 — opportunity inbox

- Add Bearer endpoint for a specialist's matched `request_offers`.
- Return anonymized request details only.
- Add viewed/declined lifecycle mutations with ownership checks.
- Reuse current billing access resolver rather than duplicating plan logic.

### Slice 3 — atomic response/claim

- Add database RPC for accepting an offer and claiming buyer capacity.
- Enforce request status, offer expiry and `max_buyers` in one transaction.
- Make retries idempotent.
- Only then expose “Take request” in Native.

### Slice 4 — push foundation

- Register APNs/FCM/Expo device tokens per authenticated user/device.
- Store notification preferences and locale.
- Write an outbox event when offers are created or accepted.
- Deliver asynchronously with deduplication, retry and invalid-token cleanup.
- Deep-link into the exact request/offer screen.

### Slice 5 — server-side intent normalization

- Accept free text as the primary Native input.
- Persist original text unchanged.
- Produce versioned normalized fields: service/category, language, format,
  location/radius, timing and confidence.
- Low-confidence normalization must remain reviewable and must not silently send
  sensitive demand to unrelated specialists.
- Re-run open demand when a specialist publishes or changes supply.

### Slice 6 — Native integration

- Audit the actual `Froli Native` repository.
- Connect authentication and existing account-capability endpoints.
- Implement the minimal client states: create intent, my requests, matches,
  specialist opportunities and profile/supply intent.
- Add push permission/onboarding only after value is explained.

### Later — dynamic competition, not first release

Start with deterministic pay-per-lead/subscription rules. Add an auction only
after several eligible specialists regularly compete for the same request and
lead quality/refund rules are measurable. Otherwise an auction adds latency and
complexity without price discovery.

## Release gates

- Production schema verified against the migration records.
- RLS/advisors checked after any new table/RPC.
- No client PII in locked offer DTOs, logs or push payloads.
- End-to-end test: intent → offer → push → open → claim → entitlement → contact.
- Duplicate create, duplicate push and concurrent claim scenarios covered.
- Legal review for paid leads and regulated/sensitive service categories before
  broad rollout.

