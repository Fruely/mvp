# Freuly Payment and Entitlement Contract

**Status:** Canonical

This document separates Freuly product semantics from payment-provider mechanics.

## 1. What Freuly sells

Freuly sells access to one concrete service request.

It does not sell the final service and does not take a percentage of the later client-specialist transaction.

The specialist is the payer for access in the service-request commercial flow.

## 2. Price

The authoritative access price is the persisted `request_offers.price_cents` + `currency` snapshot.

Current Beta Pricing v1 is owned by ADR-006.

An existing positive offer price is immutable.

The mobile/web client must never choose the access amount, currency or pricing rule.

## 3. Entitlement

The product fact that unlocks paid access is an active `request_offer_access_grants` row coherent with:

- offer;
- specialist;
- source payment;
- non-revoked state.

A payment-provider success page, client callback, local receipt flag or UI state is not entitlement proof by itself.

## 4. Provider-neutral invariant

Canonical product order:

```text
match
→ offer
→ claim/reservation
→ client confirmation
→ payment satisfied
→ entitlement
→ connection
→ chat
```

Provider-specific steps may occur in a different order. The final invariants do not:

- the owning client has explicitly confirmed the reserved claim;
- an active, non-revoked `request_offer_access_grants` row exists for that offer and specialist;
- only then may `finalizeServiceRequestConnection` open the conversation and complete the claim.

Stripe, StoreKit, and Google Play transaction states are not the product entitlement.

The backend owns reconciliation and idempotency. Native and Web may request reserve, confirm, or purchase. Those requests are not proof that the transition succeeded.

## 5. Client confirmation

Client confirmation belongs to `service_request_claims.client_confirmed_at`. It does not belong to Stripe.

It stores no client identity. The paid reservation still requires `service_requests.client_user_id`. Anonymous clients stay blocked. Do not design an anonymous store purchase around this path.

Confirmation does not itself grant access, create a conversation, or choose the payment provider. The client does not send the rail, amount, specialist, claim, or offer.

`recordServiceRequestClientConfirmation` is the provider-neutral writer. It checks ownership, the reserved claim, the canonical positive EUR offer, and the active match, then stores the timestamp once.

`service_request_claims.payment_rail` answers which payment sequence owns that reserved claim: `stripe` or `store`. It is not an entitlement, not payment success, and not Apple versus Google. Apple or Google remains the verified store transaction. NULL is valid until the first rail-specific action. Account capability alone does not select a rail. The client does not choose it. The first successful rail-specific action binds it, and a later action cannot switch it.

Stripe authorization binds `stripe` before it creates or reuses a PaymentIntent. Explicit store preparation binds `store`. A historical Stripe payment with a NULL rail is reconciled to `stripe` and is not treated as store.

For Stripe, the confirmation writer runs only after an authorized PaymentIntent has already been validated on a `stripe` claim. Confirmation then captures that same PaymentIntent. ADR-007 owns that rail. Absence of a Stripe payment is not permission to confirm a Stripe claim early, and a NULL rail is not permission to confirm either.

A canonical Stripe authorization also requires `SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS`. The value is a positive integer duration in seconds, with no default. When the payment first becomes `authorized`, the server stores `service_request_claims.confirmation_expires_at` as that authorization time plus the configured duration. Synchronous authorization and the authorization webhook share that write. A valid authorization webhook whose window is missing or cannot form a finite deadline stays retryable and does not mark the payment authorized. A later retry does not move it. Client and specialist responses may show that absolute timestamp. They do not receive a remaining duration to calculate, a Stripe client secret on the client request, or a client-supplied deadline. Confirmation fails closed when the timestamp is missing or no longer in the future. It does not cancel the PaymentIntent or mark the claim expired.

Client rejection is `service_request_claims.client_rejected_at`. It is not specialist `declined`. Confirmation and rejection are compare-and-set writes: each timestamp can be stored only while the other is null, and the database check forbids both. `POST /api/client/requests/service-request/[id]/reject` ignores the body. For a canonical uncaptured €25 Stripe authorization it cancels that PaymentIntent, marks the payment `released`, marks that match `not_selected`, and only then marks the claim `released` with `release_reason = client_rejected`. Capture amount is €0. The request stays unselected, with no conversation, grant, or rematch. A retry resumes after a durable rejection without creating another payment. A missing confirmation window, a disabled capture flag, or a disabled paid-claim flag does not block that release. Expiry remains separate.

For Native store billing, the same writer may run with no payment row only when the claim is already bound to `store`, `SERVICE_REQUEST_STORE_PAYMENT_ENABLED` is on, and the reserved specialist has an active installation advertising `paid_request_store_purchase_v1`. `paid_request_access_v1` is not enough. The response state is `payment_required`. It does not charge, grant, open chat, or send the `payment_required` notice. Current Native does not advertise the purchase capability, so this branch stays closed.

## 6. Stripe / Web rail

Preserve the accepted Phase 3A sequence. Do not make the store rail imitate it, and do not redesign Stripe to imitate the store rail.

```text
match
→ offer
→ reserve
→ manual-capture PaymentIntent authorization
→ client confirmation
→ capture the same PaymentIntent
→ Stripe webhook payment fulfillment
→ access grant
→ finalizeServiceRequestConnection
→ claim completed
```

`POST /api/client/requests/service-request/[id]/confirm` still must not grant access or open chat. The Stripe webhook remains Stripe settlement authority. Fulfillment still requires `client_confirmed_at`. A retry continues from the steps already done.

`SERVICE_REQUEST_PAID_CLAIM_ENABLED`, `SERVICE_REQUEST_PAYMENT_AUTH_ENABLED`, and `SERVICE_REQUEST_CAPTURE_ENABLED` remain the Stripe kill switches. They stay off until rollout.

## 7. Native store rail

Freuly's request-access fee is a digital service purchased from Freuly inside the Native app. It is separate from the later client-specialist service payment. The Native design is therefore compatible with Apple In-App Purchase / StoreKit and Google Play Billing.

Do not put Stripe into Native in order to imitate Web. EU/EEA alternative billing programs are a later distribution decision.

Native sequence:

```text
match
→ offer
→ reserve
→ client confirmation
→ store purchase
→ server-side store verification
→ payment satisfied
→ access grant
→ finalizeServiceRequestConnection
→ claim completed
```

The reservation proves specialist intent while the client decides. Native does not charge before confirmation.

After confirmation, and before a verified purchase, the specialist may be waiting to pay. The actionable read `payment_required` is narrower than that wait. It is true only when the reserved claim is client-confirmed, the canonical positive offer is bound, there is no active access grant, and there is no `request_offer_payments` row for that claim in `pending`, `authorized`, or `paid`.

`pending`, `authorized`, or `paid` means fulfillment is in flight or already settled. That is not permission to start another charge, even when the grant is not written yet. `failed`, `expired`, and `released` do not suppress `payment_required`. `refunded` and `disputed` are outside the current active-payment set, so they do not by themselves suppress it. An active grant still does.

No new `service_request` status and no new claim status is required. The specialist match preview returns this boolean. It is not a notification and it does not open a conversation.

The same confirm endpoint reads `payment_rail`. It does not guess. An authorized Stripe claim still requires the Stripe auth and capture flags and still returns `capture_pending`. A claim bound to `store`, with the store flag and purchase capability, can return `payment_required`. That response is not a purchase and not a specialist `payment_required` notification.

`connection_confirmation_required` means the owning client must confirm the reserved connection. Stripe emits it after authorization. Store preparation emits it when the client has not confirmed yet. It is the same event, the same claim dedupe key, and the same client request link. It is not `client_selected_you`. Delivery cancels that queued notice when the claim is no longer reserved and unconfirmed.

No verified purchase means no access grant and no conversation. A Native receipt assertion alone is not verification.

## 8. Store product model

Pricing v1 is server-authoritative. The persisted offer price is the customer-facing gross purchase price. Current UI says the specialist is paying for access to the request, for example "Доступ к заявке: €X". It is not Freuly's target net revenue. Store commission and tax do not rewrite `price_cents`.

Pricing v1 uses EUR, a €25 floor, a €250 cap, and €5 steps. The possible prices are the finite ladder €25, €30, €35, … €250. That is 46 prices. Native must display the persisted offer price. Native must not calculate it or choose another product.

Recommended model, for both App Store and Google Play: one consumable product per ladder price. One offer price maps to one product, one purchase, and one entitlement.

A credit or wallet model is not required. The ladder is finite, and a wallet would introduce a second currency.

Product identifiers are deterministic:

```text
freuly.request_access.eur.<price_cents>
```

Examples: `freuly.request_access.eur.2500` is €25, and `freuly.request_access.eur.7000` is €70. The same identifier meaning is used on both stores. The store catalogs are separate. The cent amount is the same.

Server verification accepts the purchase only when the verified product identifier maps to the persisted `request_offers.price_cents` and the currency is EUR. Proof of the €25 product must not satisfy a €70 offer.

If a store price-point list cannot represent an exact ladder amount in the specialist's storefront, that amount is not sellable. Do not round the offer, do not pick the nearest cheaper product, and do not start Pricing v2. Record that as a commercial catalog gap.

Provider does not change the offer price. Provider is not part of matching and not part of Pricing v1. Web uses Stripe. iOS uses Apple. Android uses Google. The entitlement does not store the platform.

## 9. Payment persistence gaps

`2026-09-30_request_offer_payment_provider_foundation.sql` adds nullable `provider`, `provider_transaction_id`, `provider_product_id`, `provider_verification_status`, and `provider_environment`. It is not applied. Apple and Google verification is not active. A paid row still requires the existing Stripe origin checks. These columns are not entitlement, and `provider_verification_status` does not replace `status`.

Historical rows stay `provider` null unless an existing Stripe identifier proves the rail. `provider_transaction_id` is copied only from `stripe_payment_intent_id`. A Checkout session id is not that identity.

The minimum canonical fields are:

- `provider`: `stripe`, `apple`, or `google`;
- provider transaction identifier, unique, and not reusable for another user, specialist, offer, or request;
- provider product identifier;
- verification status owned by server verification;
- environment, only so a sandbox or test purchase cannot satisfy production.

Keep the existing Stripe columns for the Stripe rail. Do not overload them with StoreKit or Play tokens.

Provider-specific verification evidence, such as a signed Apple transaction or a Google purchase token, is evidence. It is not a second set of canonical payment columns, and it does not belong in the client.

`request_offer_access_grants` stays the entitlement. `source_payment_id` remains unique. `(offer_id, specialist_id)` remains unique. `revoked_at` remains the prospective revocation marker.

## 10. Store verification and idempotency

The server verifies the store transaction with Apple or Google. The Native client does not declare itself paid.

One verified store transaction creates at most:

- one `request_offer_payments` row;
- one access grant;
- one conversation;
- one completed claim.

A second delivery of the same transaction continues the fulfillment already done. It does not insert another payment, grant, conversation, or completed claim.

The transaction must be bound to the authenticated specialist user, the reserved claim, the bound offer, and the service request. The same token must not be applied to a different user, specialist, offer, or request.

The existing one-paid-payment constraint per offer and specialist, and the one-grant constraint per offer and specialist, remain the entitlement locks. Fulfillment then calls the same `finalizeServiceRequestConnection` path Stripe uses after the grant exists.

## 11. One purchase across devices

The same specialist account may use Web, iPhone, and Android. One offer is purchased once.

When an active access grant exists, every client reads access as satisfied. A later purchase attempt must be refused before another charge is created. It must not create another required payment.

When one rail already has an in-flight payment for that claim (`pending`, `authorized`, or `paid`), another rail must not start a second purchase. The backend owns this. Client-local state does not.

If two verifications race, one fulfillment wins. The loser fails closed without a second grant or a second conversation.

## 12. Reservation timeout

The Stripe confirmation deadline is persisted and enforced on client confirmation. An explicit client rejection releases the uncaptured authorization and the reserved claim; it does not rematch. Claim expiry, automatic cancellation when the confirmation window ends, and sequential redistribution are still not implemented. Reuse the current claim statuses. Do not add a status for "waiting for payment" or "purchase cancelled".

| Case | Claim result |
| --- | --- |
| Specialist reserves and the client never confirms | `expired` when the confirmation window ends. No charge and no grant. |
| Client declines | `released`. No charge and no grant. |
| Client confirms and the specialist never purchases | `expired` when the purchase window ends. No grant. |
| Purchase is cancelled or fails | Claim stays `reserved` and retryable until the same purchase window ends, then `expired`. |
| A valid verified purchase arrives as release or expiry commits | See the race below. |

A released, expired, or failed claim is not live. Sequential redistribution follows the existing exclusive-claim rule: one request has at most one `reserved` or `completed` claim. Decline or expiry removes that live row before another specialist can reserve.

Race: store verification and timeout must be decided in one server transaction. If the claim is still `reserved` and `client_confirmed_at` is set, fulfillment may grant access and complete the claim. If the claim is already `released`, `expired`, or `failed`, fulfillment does not create a grant and does not open a conversation. The verified transaction is recorded so it cannot be reused. Store refund of that unused purchase is an accounting follow-up. It is not a reason to reopen the claim.

## 13. Refund and revocation

A later refund, chargeback, or store revocation updates payment accounting. It sets `request_offer_access_grants.revoked_at` and a non-empty `revoke_reason` when the grant is revoked.

`revoked_at` means prospective access is no longer active. New access checks treat that grant as absent. It does not delete the grant row, the conversation, or the completed-claim history.

Do not automatically destroy an already completed connection. Whether a revoked grant should later close chat is a separate product decision.

Existing direct-lead refund and dispute behavior stays unchanged.

## 14. Subscription vs request access

Recurring membership/priority and one-time request access are different products.

A subscription must never silently make a service-request claim free unless a future explicit product decision says so.

The planned Priority product means earlier opportunity only. It does not automatically include claim credits or guaranteed jobs.

Store-billed recurring subscriptions are managed by the owning store. This document does not put those subscriptions on the request-access ladder.

## 15. Rollout

The store flag and purchase capability exist and stay off for current Native.

`paid_request_access_v1` means the installation understands `access_offer` and reserve-first TAKE. It does not mean store billing is available. Current Native advertises it and cannot complete payment. Commercial offers must stay off while that is true. Enabling them would create a paid offer, block legacy `/claim`, and leave the specialist unable to pay.

`paid_request_store_purchase_v1` is that separate capability. It means the installation can complete the store-purchase contract. Current Native does not advertise it. Do not expand `paid_request_access_v1` to mean payment-ready.

`SERVICE_REQUEST_STORE_PAYMENT_ENABLED` is the store kill switch. It defaults off by absence and is not enabled. It does not capture Stripe PaymentIntents, and the Stripe flags do not open the store branch. Commercial offers stay off until a Native build advertises the purchase capability and the store purchase runtime exists.

Safe activation remains: capability storage applied, both rails implemented, the purchase capability registered by a real Native build, then commercial offers. Until then every paid-flow flag stays off.
