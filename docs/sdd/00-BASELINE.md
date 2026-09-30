# Freuly SDD Baseline

**Status:** Canonical  
**Purpose:** System North Star for Web, Backend, iOS and Android.

This document fixes the product and architecture invariants that implementation work must preserve. It is intentionally compact. Detailed state, payment, conversation and distribution contracts live in the sibling SDD files.

## 1. Product

Freuly is a real-time service demand network.

Its job is to connect a person who needs something with a person who can provide it, with as little platform friction as possible.

Core loop:

```text
INTENT → REQUEST → MATCH → OFFER → CLAIM → PAYMENT/ENTITLEMENT → CONNECTION → CHAT
```

Freuly is not a specialist CRM, booking system, calendar, video platform, escrow product, accounting system or final-service checkout.

After connection, client and specialist may agree on the service, final price, logistics, Zoom/link, invoice or external payment themselves. Freuly does not take a percentage of that later transaction.

## 2. One account, contextual roles

A Freuly account may create demand and may also offer services. Client and specialist are contextual roles, not separate identities.

Client entry: **Мне нужно / I need**.  
Specialist entry: **Я могу / I can**.

## 3. Demand intake

A client may state a need by text or voice.

AI may extract structured service intent from free text, but it does not own marketplace ranking or commercial selection. If a blocking detail is missing, the product asks at most one blocking clarification before confirmation.

The backend persists the request and is authoritative for all domain state.

## 4. Marketplace model

Matching is deterministic, explainable, testable and cheap. It uses explicit eligibility such as category/service fit, work format, geography and service language.

AI is for intent understanding, not hidden specialist scoring.

The client does not receive a tender, swipe deck or carousel of competing specialists in the target core product.

A request may have at most one live exclusive claim and at most one active conversation.

Sequential redistribution/rematch may happen after a claim is declined, released, expires or otherwise becomes unavailable. Parallel competing conversations are not part of the core model.

## 5. Commercial model

Freuly sells **access to real demand**, not a percentage of the specialist's later earnings.

A commercial offer snapshots the exact access price for that offer. Once a positive price is persisted, it does not silently change. A client capability may decide whether a new paid offer is introduced. It does not grant entitlement or payment, and it does not make an existing positive offer free. Legacy immediate claim must not finalize a connection that already has that paid offer.

The current Beta Access Pricing v1 is owned by ADR-006 and is based only on explicit client budget. Market density, specialist identity, recurrence, campaign/CAC, category scarcity and subscription status are not v1 price inputs.

A future pricing policy may change prices for newly created offers. Existing offer snapshots remain immutable.

## 6. Payment is a rail, entitlement is the product fact

The product-level sequence is provider-neutral:

```text
claim/reservation
→ payment readiness
→ required product confirmation
→ payment settled
→ access entitlement
→ final connection
```

Stripe, StoreKit/App Store and Google Play are payment rails, not the domain model.

Do not assume that every rail supports Stripe-style manual authorization/capture.

Do not assume that a mobile subscription can be cancelled through Stripe when the subscription was purchased through an app store. Store-billed subscriptions are managed by the owning store flow.

One-time access purchase and recurring subscription are separate products and must not share semantics by accident.

## 7. Conversation

Conversation exists only after the backend has granted the required access and finalized the connection.

Current core communication capabilities are text, voice/audio, one-time location and image. These exist to accelerate agreement.

Freuly should not rebuild Zoom, maps, banking, invoicing or other mature external tools unless a future product requirement proves necessary.

## 8. Authoritative ownership

Native/Web clients send intent/actions. They do not choose authoritative money or terminal state.

The backend owns:

- request state;
- match eligibility and state;
- commercial offer identity and price;
- exclusive claim/reservation;
- payment and entitlement state;
- selected specialist;
- conversation creation and participant authorization.

The client must never be authoritative for price, currency, payment result, specialist ownership, entitlement or connection state.

## 9. Mobile compatibility

A released mobile binary is an immutable external API consumer.

Backend changes must preserve all supported released clients unless an explicit compatibility/version migration exists.

Default evolution is additive and backward-compatible.

Do not:
- remove or rename a consumed field silently;
- change a consumed field type silently;
- reuse an existing status value with a new meaning;
- require a new field from old clients without a compatibility path;
- rename all endpoints merely to introduce cosmetic versioning;
- add speculative JSON fields "for the future".

If a breaking contract is genuinely necessary, introduce an explicit version/compatibility path and a removal condition for the previous contract.

## 10. SDD change rule

For a change affecting domain state, API DTOs, push/deep links, auth, billing, entitlement, RLS, RPC or mobile-visible behavior:

```text
SPEC → CONTRACT/INVARIANT TEST → BACKEND → CONSUMERS → ROLLOUT
```

The SDD must describe the existing canonical model first. Planned behavior is explicitly marked **Planned** or **Deferred** and must not be treated as already implemented.

## 11. Canonical entity chain

```text
service_request
  → service_request_match
  → request_offer
  → service_request_claim
  → request_offer_payment
  → request_offer_access_grant
  → conversation
```

These are separate responsibilities and separate state machines. Do not collapse them into one giant `service_request.status`.

## 12. Scope status

**Implemented foundation:** intent/request creation, deterministic matching foundation, inbox/push, offer snapshots, exclusive claim foundation, Beta Pricing v1, Stripe manual-authorization foundation, conversation, text/audio/location/image.

**Planned before paid beta rollout:** provider-neutral confirmation/settlement contract, entitlement-driven finalization, mobile-store-compliant purchase flows, timeout/release policy and sequential redistribution.

**Deferred until justified by real usage:** advanced priority membership, liquidity-aware distribution tuning, Pricing v2, CarPlay/Android Auto/Siri-style hands-free workflows and broader international scaling mechanics.
