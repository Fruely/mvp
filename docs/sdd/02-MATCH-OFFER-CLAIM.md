# Freuly Match, Offer and Claim Contract

**Status:** Canonical

## 1. Matching

Matching answers only:

> Which specialists are objectively eligible for this request?

It must remain deterministic, explainable, testable and inexpensive.

Current matching inputs may include category/service fit, work format, geography, service languages and the specialist's active native installation where required by current runtime policy.

Do not use hidden AI ranking to decide the winner.

Language dimensions remain distinct:

- interface locale;
- source/request language;
- service languages.

No explicit service-language requirement means unrestricted (`[]`), not "use interface locale".

## 2. Offer creation

For a matched service request, the backend creates a canonical service-request `request_offer`.

All specialists matched to the same request receive the same initial access-price snapshot under Pricing v1.

The offer price is server-generated. Client/Native never supplies authoritative amount or currency.

Pricing v1 is owned by ADR-006. Do not activate legacy `lead_pricing_rules` for this flow.

## 3. TAKE

Target meaning of TAKE:

> Reserve my exclusive opportunity to purchase/access this request.

TAKE is not:
- final client selection;
- payment success;
- entitlement;
- conversation creation.

The server resolves the current canonical offer and atomically creates/reuses the claim reservation.

## 4. Exclusivity

A request may have at most one live exclusive claim at a time.

The database/RPC must enforce this under races; UI disabling is not sufficient.

Another specialist cannot obtain a parallel live claim merely because both devices tapped TAKE at the same time.

## 5. Client selection model

Target core product: no client-side tender/carousel/winner selection.

The client may be asked to confirm the pending connection when the paid flow requires it, but that confirmation is not a choice among competing specialists.

Legacy client-selection behavior may remain for existing/legacy paths until deliberately migrated. Do not reuse legacy `client_selected_you` semantics as the new paid-flow design by accident.

## 6. Redistribution

**Planned.**

If a specialist declines, does not act within a defined window, or a reservation/payment is released before final connection, the request may re-enter distribution.

Redistribution is sequential. It must not create concurrent active claims or concurrent conversations.

The exact timeout/release policy is owned by the distribution SDD and must be implemented before paid beta activation.

## 7. Separation of concerns

```text
Matching     = who is eligible?
Distribution = who sees it when?
Priority     = who may receive an earlier opportunity?
Pricing      = what does this offer cost?
Claim        = who currently holds exclusivity?
Payment      = has Freuly access been paid?
Entitlement  = may connection be finalized?
```

Do not collapse these decisions into one score.

## 8. Compatibility

Existing Native consumers must tolerate additive offer/match fields.

Do not remove/rename current match identifiers, status semantics or price fields from a supported response without an explicit compatibility/version plan.

Do not add a match reason code unless supported Native builds ignore unknown codes. Economic eligibility does not require a new reason code. Current Native does not parse `match_reasons` as an allow-list, and the specialist card reader drops unknown codes, but no `budget_match` code is added.

## 9. Economic compatibility

Matching pipeline:

```text
semantic/category eligibility
→ service language
→ work format
→ geography
→ explicit economic compatibility
→ distribution
```

Matching stays deterministic. AI may map free text onto a service or category. AI must not estimate a service price, invent a client budget, invent a specialist minimum, or decide monetary compatibility.

A specialist service may store an optional `minimum_order_cents`. It means: do not distribute a request when the client's reliable explicit EUR maximum is below this amount. It is not `price_from`, `price_to`, an hourly price, the displayed service price, the Freuly access price, or a subscription price. Do not infer it from `price_from`. Null remains valid and is not a publication requirement.

A negative economic match exists only when both values are reliable:

1. the request has a reliable explicit EUR maximum;
2. the relevant active specialist service has an explicit minimum.

Then `client_max >= service_min` is eligible and `client_max < service_min` is blocked. Missing, ambiguous, non-EUR, and "from €X" budgets have no maximum and must not reject. A specialist with no minimum, or a specialist eligible only through the primary category with no relevant service row, must not be rejected on budget. `0` is a real minimum when the specialist set it.

The reliable maximum is the exact amount, the "up to / до / bis" ceiling, or the upper bound of a range. An accepted reconciliation ceiling, when present, supersedes that parsed maximum for later matching. `client_budget_text` stays the client's original text.

## 10. Budget recovery

Economic mismatch is recoverable. It is not a `service_request` status.

If otherwise-eligible specialists exist, every one of them is blocked only by budget, and the client has a reliable maximum:

- the required floor is the lowest explicit minimum among those blocked specialists;
- specialists who failed category, language, format, or geography do not affect that floor;
- persist the unresolved floor;
- create no `service_request_matches`;
- create no commercial offers;
- enqueue no specialist availability or reminder notifications.

If at least one otherwise-eligible specialist passes the economic gate, match only those specialists. Do not ask the client to raise the budget because a more expensive specialist also exists.

The client sees one aggregate floor for this request, not each specialist's threshold.

Accept stores that persisted floor as the request's economic ceiling, clears the decline for that resolution, and reruns matching on the same `service_request` and `public_id`. The client cannot submit an authoritative amount. If supply later needs a higher floor, open a new reconciliation. Do not raise the accepted ceiling without a new explicit accept. A decline applies only to the same unresolved floor. A different floor must not reuse a stale decline.

Decline stores the decline, does not distribute, and does not cancel, spam, or close the request.

No separate rollout flag is required for this gate. Existing services have a null minimum, and a missing client maximum fails open, so current rows keep their current match results until a specialist explicitly sets a minimum. Apply the additive migration before deploying the code that reads the new columns.

## 11. Legacy semantic isolation

Shared infrastructure may be reused: Vercel, Supabase, `notification_outbox`, Expo push, Telegram, email, retry, dedupe, and auth/session.

Business semantics are not inherited automatically. The paid service-request flow must not execute:

- legacy immediate `POST /api/specialist/matches/{matchId}/claim` finalization;
- client tender or carousel selection;
- `specialist_interested`;
- `client_selected_you`;
- subscription or free-lead entitlement;
- direct-lead `lead_pricing_rules`;
- match reminders after a live exclusive claim exists.

Those legacy paths stay for their current consumers until an explicit cutover. A new event must declare its own notification policy. Budget reconciliation has no push event in this phase. The create response and the authenticated request detail are the source of truth.

## 12. Paid rollout blocker

`SERVICE_REQUEST_PAID_CLAIM_ENABLED`, `SERVICE_REQUEST_PAYMENT_AUTH_ENABLED`, `SERVICE_REQUEST_CAPTURE_ENABLED`, and commercial-offer rollout are not safe for Native while Native TAKE still calls legacy `POST /api/specialist/matches/{matchId}/claim`.

That endpoint still finalizes a connection immediately. Do not break it and do not silently redirect it into the paid flow. Paid flags stay off until Native TAKE uses reserve, payment, and entitlement, or until an explicit server gate prevents this bypass.
