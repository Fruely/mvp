# Freuly Lead Engine — Phase 1 architecture audit

Status: architecture-only. No production billing behaviour is changed by this document.

Related: #40

## Executive conclusion

Freuly already contains two complementary contact-access mechanisms:

1. **Direct specialist leads (`leads`)**
   - client selects a concrete specialist;
   - lead is created with contact PII stored server-side;
   - dashboard redacts PII until `contact_unlocked_at` is set;
   - unlock is currently governed by `specialist_plan.plan_status` only.

2. **Promoted service requests (`service_requests` + `service_request_promotions`)**
   - request can exist without a selected specialist;
   - promotion exposes only anonymized title/summary;
   - access is granted either by an active paid subscription or by a Stripe-confirmed pay-per-lead payment;
   - payment grants can be revoked after refund/dispute.

The Lead Engine should therefore **not create a third request system**. Phase 1 should unify commercial offer/distribution and entitlement decisions across the two existing request origins.

## Current AS-IS flows

### A. Direct lead

Client selects specialist
→ `POST /api/leads/create`
→ `leads` row
→ specialist notification / Telegram
→ dashboard shows redacted lead
→ specialist requests contact unlock
→ runtime checks `specialist_plan.plan_status`
→ if allowed, sets `contact_unlocked_at`
→ PII becomes visible.

Important current invariant:

`lead PII visible = contact_unlocked_at exists`

This is already a good privacy boundary and should be preserved.

Current gap: direct leads have no pay-per-lead route. A specialist without subscription cannot buy that direct lead under the desired commercial model.

### B. Promoted/open request

Client submits `service_request`
→ admin qualifies/anonymizes
→ `service_request_promotion`
→ specialist promotion/signup binding
→ anonymized request view
→ entitlement decision:

- active paid plan → subscription access
- otherwise → Stripe checkout for promoted access

→ webhook-confirmed payment
→ `promoted_request_access_grants`
→ unlocked service request details.

Refund/dispute can revoke a payment-sourced grant.

## Existing strengths to preserve

- server-authoritative PII redaction;
- `contact_unlocked_at` boundary for direct leads;
- server-authoritative payment amount;
- Stripe webhook as proof of payment (success redirect is not proof);
- idempotent payment/grant handling;
- persistent access grants;
- refund/dispute revocation;
- subscription access path;
- service-role/RLS isolation for billing tables;
- acquisition attribution already attached to service requests;
- existing request promotion anonymization.

## Hardcoded pricing constraint

Promoted request access is currently fixed at EUR 10 in both runtime and database:

- `PROMOTED_ACCESS_AMOUNT_CENTS = 1000`;
- DB CHECK requires `amount_cents = 1000`;
- subscription acquisition credit is also coupled to EUR 10.

This coupling must be migrated deliberately. Do not simply change the constant.

## Target commercial invariant

Free listing does not imply free client contact.

Target rule:

`can_view_client_contact = subscription_entitlement OR paid_request_entitlement`

The rule must apply regardless of request origin:

- client directly selected the specialist;
- Freuly matched the specialist;
- request was redistributed;
- open request was offered from the demand pool.

A direct client selection gives the specialist **first right to the opportunity**, not a free entitlement.

## Proposed new central entity: `request_offers`

`request_offers` should represent one commercial offer of one client request/lead to one specialist.

It must not replace `leads` or `service_requests`.

Suggested columns:

```text
id uuid PK

request_kind text -- direct_lead | service_request
lead_id uuid nullable
service_request_id uuid nullable
promotion_id uuid nullable
specialist_id uuid not null

offer_reason text -- direct_selection | matched | redistributed | manual
pricing_segment text -- consumer | professional | business
billing_model text -- subscription | pay_per_lead

price_cents integer nullable
currency text default eur
pricing_rule_id uuid nullable
estimated_service_value_min_cents integer nullable
estimated_service_value_max_cents integer nullable

status text -- offered | viewed | accepted | paid | declined | expired | fulfilled

offered_at timestamptz
viewed_at timestamptz nullable
accepted_at timestamptz nullable
paid_at timestamptz nullable
expired_at timestamptz nullable
contacted_at timestamptz nullable
outcome text nullable
outcome_at timestamptz nullable

created_at timestamptz
updated_at timestamptz
```

DB invariant: exactly one request origin should be present (`lead_id` XOR `service_request_id`).

`promotion_id` is optional because a direct lead may never need a public promotion.

## Why `request_offers` is needed

Today Freuly can answer:

- a lead exists;
- a promotion exists;
- a payment exists;
- access exists.

It cannot reliably answer the commercial funnel questions:

- which specialists were offered this request;
- why each specialist received it;
- what price each specialist saw;
- whether it was viewed;
- whether it was declined/expired;
- how many offer attempts were required;
- who bought it;
- whether the specialist contacted the client;
- whether the lead became a customer.

These events are essential for matching, pricing and B2B economics.

## Entitlement architecture

Do not replace existing redaction mechanisms.

Introduce one canonical server decision layer, conceptually:

```text
resolveRequestContactAccess({
  requestKind,
  specialistId,
  offerId,
  subscriptionState,
  paymentGrant
})
```

Possible decisions:

- `unlocked_subscription`
- `unlocked_payment`
- `locked_can_purchase`
- `locked_not_available`
- `processing`

### Direct leads

Keep `contact_unlocked_at` as the persisted privacy boundary.

Change the unlock decision from:

`active/grace plan only`

to:

`subscription entitlement OR paid entitlement for the corresponding request_offer`.

Once legitimately unlocked, keep current behaviour: historical access remains readable unless a future explicit policy changes it.

### Promoted requests

Keep `promoted_request_access_grants` initially.

A `request_offer` should point to the existing promotion/payment path rather than duplicating Stripe payment/grant logic.

Long term, access grants can be generalized, but Phase 1 should be additive.

## Dynamic pricing migration strategy

### Step 1 — add pricing policy storage without changing live EUR 10

Create pricing-rule infrastructure with server-only reads. Suggested model:

```text
lead_pricing_rules
- id
- segment: consumer | professional | business
- category_id nullable
- service_id nullable
- min_service_value_cents nullable
- max_service_value_cents nullable
- base_lead_price_cents
- percentage_basis_points nullable
- min_lead_price_cents
- max_lead_price_cents nullable
- max_buyers
- active
- priority
```

No browser-supplied price is authoritative.

### Step 2 — snapshot calculated price on `request_offers`

The price shown to a specialist must be persisted on the offer so later pricing-rule changes do not alter an already-made offer.

### Step 3 — decouple promoted payment DB constraint

Only after runtime supports an offer snapshot price:

- remove/replace `amount_cents = 1000` CHECK;
- validate positive bounded amount;
- checkout reads amount from trusted offer/payment row;
- webhook validates Stripe amount/currency against persisted expected amount.

### Step 4 — separate subscription acquisition credit

The current EUR 10 subscription credit must not automatically equal arbitrary lead price.

Define a separate promotion/acquisition-credit policy or retire that mechanism after product review.

## B2B support from day one

B2B is a pricing segment, not a separate request engine.

`pricing_segment = business` must support:

- materially higher subscription plans;
- high-value per-lead prices;
- estimated project/contract value;
- declining percentage bands as deal value rises;
- minimum and maximum lead prices;
- future qualification multipliers.

The final contract amount must not be needed to calculate Freuly revenue. Freuly sells qualified access to demand, not commission settlement on the finished transaction.

## Max buyers / scarcity

Add offer-level or request-level policy, not an implicit unlimited grant model.

Suggested fields/policy:

```text
max_buyers
purchased_count
```

Enforcement must be transactional at payment/fulfillment time to avoid overselling under concurrent Stripe webhooks.

Do not implement a naive application-only count check.

## Subscription model

Do not encode subscription as `price_cents = 0`.

Subscription is a separate entitlement source.

For an eligible subscribed specialist:

- create/track a request offer;
- access source is subscription;
- contact can unlock without per-lead Stripe checkout;
- offer still participates in viewed/contacted/outcome analytics.

This lets Freuly compare subscription economics vs pay-per-lead using the same funnel.

## Minimal additive implementation sequence

1. Add `request_offers` migration and indexes only.
2. Add server types/data access for request offers.
3. Create offers for new direct leads without changing current unlock behaviour.
4. Create/link offers for promoted requests without changing current EUR 10 checkout.
5. Add offer lifecycle events (`viewed`, `declined`, `expired`, `contacted`, `outcome`).
6. Add pricing-rule storage and price snapshot calculation behind a disabled/controlled flag.
7. Generalize contact entitlement so direct leads can use paid offer access as well as subscription.
8. Migrate promoted checkout from hardcoded EUR 10 to persisted server-authoritative offer price.
9. Add transactional `max_buyers` enforcement.
10. Only then change customer/specialist UI and pricing copy broadly.

## Regression risks

High risk:

- Stripe webhook/payment amount validation;
- refunds/disputes and access revocation;
- subscription lifecycle/grace behaviour;
- accidental PII exposure in locked DTOs;
- concurrent purchases exceeding `max_buyers`;
- production Supabase schema differing from manual migration files.

Medium risk:

- notification duplication;
- idempotency retries creating duplicate offers;
- existing signup-binding assumptions (one promoted opportunity per specialist flow);
- old EUR 10 subscription-credit coupling.

## Required tests before enabling dynamic pricing

- free listing + no payment → no PII;
- active subscription → direct lead unlock;
- active subscription → promoted request unlock;
- pay-per-lead payment → direct lead unlock;
- pay-per-lead payment → promoted request unlock;
- failed/expired payment → remains locked;
- refund/dispute → correct revocation policy;
- no client-controlled price or internal request/specialist IDs;
- duplicate webhook idempotency;
- two simultaneous buyers at last available slot;
- already-unlocked historical lead remains readable according to current lifecycle policy;
- locked message preview sanitizes email/phone/URLs/social handles;
- B2B pricing rule snapshots correct high-value price without depending on final transaction value.

## Decision

Proceed with an additive `request_offers` layer and a canonical entitlement resolver. Preserve existing `leads`, `service_requests`, promotions, payment/grant, redaction and Stripe webhook infrastructure. Dynamic pricing and B2B are designed now but enabled only after the current EUR 10 path is safely decoupled.
