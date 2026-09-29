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

## 4. Provider-neutral sequence

Target product semantics:

```text
exclusive claim
→ provider payment preparation
→ any required product/client confirmation
→ provider-confirmed settlement
→ access grant
→ final connection
→ conversation
```

The backend owns reconciliation and idempotency.

## 5. Stripe/Web rail

Current implemented foundation can create/reuse a Stripe PaymentIntent for a reserved service-request claim with manual capture and persist `pending/authorized/paid/released` lifecycle information.

That Stripe-specific capability is a rail implementation, not the universal mobile payment model.

Any final capture/settlement implementation must remain idempotent and must not create a second payment row or second charge for the same canonical attempt.

## 6. iOS rail

Do not assume Stripe PaymentSheet is permitted for a Native iOS purchase merely because Stripe works on Web.

Before implementing an iOS access-purchase UI, classify the product under current App Store rules and choose a compliant rail.

Do not assume StoreKit exposes Stripe-style authorization/capture semantics.

Store-billed recurring subscriptions are managed through App Store subscription management, not by pretending Stripe owns their cancellation.

## 7. Android rail

Do not assume the Web Stripe flow is automatically the correct Google Play flow.

Before implementing Android access purchase, classify the purchase under current Google Play billing rules and choose the compliant rail.

Store-billed subscriptions are managed through the owning store.

## 8. Subscription vs request access

Recurring membership/priority and one-time request access are different products.

A subscription must never silently make a service-request claim free unless a future explicit product decision says so.

The planned Priority product means earlier opportunity only. It does not automatically include claim credits or guaranteed jobs.

## 9. Settlement safety

A client response is not payment proof.

A provider webhook/verified receipt/server verification must be the trusted settlement input for the relevant rail.

Settlement processing must be idempotent and safe under:
- duplicate provider events;
- network retry;
- partial fulfillment;
- process crash between grant and connection finalization.

## 10. No chat before entitlement

Claim/reservation, payment initialization and payment authorization alone do not open chat.

The target paid path is:

```text
verified settlement
→ ensure access grant
→ finalize connection
→ conversation
```

## 11. Refund/dispute

Existing direct-lead refund/dispute semantics must not be changed incidentally while implementing service-request access.

Service-request post-settlement refund/credit policy is a separate product decision and is not inferred from legacy Checkout behavior.

## 12. Rollout gate

Before paid beta activation, the system still needs:

- approved cross-platform rail design;
- explicit confirmation semantics;
- settlement → grant → connection implementation;
- reservation/payment timeout-release policy;
- contract tests for duplicate/retry/race behavior.

Until those are complete, paid-flow production flags remain off.
