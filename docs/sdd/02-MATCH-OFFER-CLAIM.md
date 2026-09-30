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

For a matched service request, the backend may create a canonical service-request `request_offer`.

Specialists who receive a new paid offer for the same request get the same initial access-price snapshot under Pricing v1. Who may receive that new contract is a consumer-capability decision, not a matching decision.

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

`SERVICE_REQUEST_PAID_CLAIM_ENABLED`, `SERVICE_REQUEST_PAYMENT_AUTH_ENABLED`, `SERVICE_REQUEST_CAPTURE_ENABLED`, and `SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED` stay off. Shipping a newer Native build is not enough, because older installed binaries still call legacy `/claim`.

The server gate is now: a persisted positive matched paid offer blocks legacy `/claim` for that request and specialist. Do not redirect `/claim` into the paid flow, and do not put that block inside `finalizeServiceRequestConnection`. Paid fulfillment still finalizes after settlement.

Do not enable commercial offers until the paid reservation, payment, and settlement path can complete. A new offer without a payable path would strand the capable client and block the legacy client.

## 13. Paid-access capability rollout

`paid_request_access_v1` is a client-contract capability. It means the current Native installation understands `access_offer`, reserve-first TAKE, and no legacy `/claim` fallback for a paid offer.

It does not mean a payment SDK is installed, payment can succeed, StoreKit or Google Play Billing is available, or the specialist has an entitlement or subscription. App version is not the business rule. Do not reinterpret this capability as payment-ready. Current Native advertises it and then stops after reserve, because no store purchase exists. That is safe only while commercial offers stay off.

`paid_request_store_purchase_v1` is a separate known capability for a fully usable store-purchase contract. Current Native does not advertise it. Store confirmation also requires `SERVICE_REQUEST_STORE_PAYMENT_ENABLED`, which stays off.

While commercial offers are enabled:

- a new matched paid offer may be introduced only for a specialist account with at least one active `native_installations` row advertising `paid_request_access_v1`;
- absence of that capability leaves the match in place and does not create a paid offer, so the legacy path remains possible for that consumer;
- capability is not a matching requirement;
- no zero-price offer is created for a legacy specialist.

Once a positive canonical matched `pay_per_lead` offer exists for a service request and specialist, it stays immutable. Later capability loss does not delete it, reprice it, or turn it into a free legacy claim. Offer status, including a terminal or not-purchasable state, does not restore free `/claim`.

Legacy `/claim` checks that persisted offer and returns `not_claimable` when it exists. The check does not identify the calling device. The same account may have a new capable installation and an old installation; the old installation's `/claim` is still blocked after the offer exists. `finalizeServiceRequestConnection` remains the paid fulfillment finalizer and is not blocked by the offer.

An old device on that account may still see the opportunity and then receive `not_claimable`. That is a compatibility UX limitation. It is not a payment bypass. Per-installation push targeting is out of scope here.

Registration replaces the installation's capability set with the normalized set from the current client. Unknown capability names are not stored. Existing installations stay empty until a capable app registers. Apply `2026-09-30_native_paid_request_access_capability.sql` before deploying the backend that reads `native_installations.capabilities`.

Safe later activation order:

1. apply the capability migration;
2. deploy the backend that stores capabilities and blocks legacy `/claim` for a persisted paid offer;
3. ship and verify a Native build that registers `paid_request_access_v1`;
4. observe real capability registrations;
5. implement the Web Stripe rail and the Native store rail described in `docs/sdd/03-PAYMENT-AND-ENTITLEMENT.md`;
6. ship a Native build that registers `paid_request_store_purchase_v1` as well as `paid_request_access_v1`;
7. only then enable `SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED`.

Payment, capture, paid-claim, and any future store-payment flags stay off until that payment rail is actually available. Direct-lead offers, subscriptions, and `lead_pricing_rules` are outside this gate.
