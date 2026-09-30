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

Confirmation does not itself grant access, create a conversation, or choose the payment provider.

For Stripe, confirmation causes capture of the previously authorized PaymentIntent. ADR-007 owns that rail.

For Native store billing, confirmation makes the reserved claim eligible for specialist purchase. It does not charge the specialist and it does not create an entitlement.

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

After confirmation, and before a verified purchase, the specialist is waiting to pay. That state is derived:

```text
claim.status = reserved
AND client_confirmed_at IS NOT NULL
AND no active access grant for that offer and specialist
```

No new `service_request` status and no new claim status is required for this state.

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

Timeouts are specified and not implemented. Reuse the current claim statuses. Do not add a status for "waiting for payment" or "purchase cancelled".

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

This document does not add a flag or a capability.

`paid_request_access_v1` means the installation understands `access_offer` and reserve-first TAKE. It does not mean store billing is available. Current Native advertises it and cannot complete payment. Commercial offers must stay off while that is true. Enabling them would create a paid offer, block legacy `/claim`, and leave the specialist unable to pay.

Before commercial offers are enabled, Native needs a separate future capability for the usable store purchase flow. Do not expand `paid_request_access_v1` to mean payment-ready.

A future `SERVICE_REQUEST_STORE_PAYMENT_ENABLED` flag is the independent kill switch for starting and verifying store purchases. It is not added now. Stripe flags do not control that switch, and that switch does not capture Stripe PaymentIntents.

Safe activation remains: capability storage applied, both rails implemented, the purchase capability registered by a real Native build, then commercial offers. Until then every paid-flow flag stays off.
