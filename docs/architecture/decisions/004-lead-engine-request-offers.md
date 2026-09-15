# ADR-004: Lead Engine request offers and pricing foundation

Status: Proposed  
Date: 2026-09-15  
Related: #40

## Context

Freuly already has two request origins:

1. `leads` — direct requests to a specialist selected by the client.
2. `service_requests` — assisted/open demand without a required selected specialist.

The existing direct-lead flow already redacts client PII until `contact_unlocked_at` is set. Its unlock entitlement is subscription-only.

The promoted service-request flow already supports both subscription access and pay-per-lead access through `promoted_request_payments` and `promoted_request_access_grants`.

The business model now requires one commercial rule across both request origins:

`client contact access = valid subscription entitlement OR paid entitlement for that specific opportunity`.

A free listing never grants free client contact access.

## Decision 1 — add `request_offers` as the commercial distribution entity

`request_offers` represents one offer of one client opportunity to one specialist.

It does not replace `leads`, `service_requests`, or `service_request_promotions`.

A request may generate many offers over time, for example direct selection first, then redistribution after decline/expiry.

### Proposed table

```sql
CREATE TABLE public.request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  request_kind text NOT NULL,
  lead_id uuid NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  service_request_id uuid NULL REFERENCES public.service_requests(id) ON DELETE RESTRICT,
  promotion_id uuid NULL REFERENCES public.service_request_promotions(id) ON DELETE SET NULL,
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE RESTRICT,

  offer_reason text NOT NULL,
  pricing_segment text NOT NULL,
  billing_model text NOT NULL,

  price_cents integer NULL,
  currency text NOT NULL DEFAULT 'eur',
  pricing_rule_id uuid NULL,
  specialist_service_id uuid NULL REFERENCES public.specialist_services(id) ON DELETE SET NULL,
  estimated_service_value_min_cents integer NULL,
  estimated_service_value_max_cents integer NULL,

  max_buyers_snapshot integer NULL,

  status text NOT NULL DEFAULT 'offered',
  offered_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz NULL,
  accepted_at timestamptz NULL,
  paid_at timestamptz NULL,
  declined_at timestamptz NULL,
  expired_at timestamptz NULL,
  contacted_at timestamptz NULL,
  outcome text NULL,
  outcome_at timestamptz NULL,

  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT request_offers_request_kind_check
    CHECK (request_kind IN ('direct_lead', 'service_request')),

  CONSTRAINT request_offers_exactly_one_origin_check
    CHECK (
      (request_kind = 'direct_lead' AND lead_id IS NOT NULL AND service_request_id IS NULL)
      OR
      (request_kind = 'service_request' AND lead_id IS NULL AND service_request_id IS NOT NULL)
    ),

  CONSTRAINT request_offers_offer_reason_check
    CHECK (offer_reason IN ('direct_selection', 'matched', 'redistributed', 'manual')),

  CONSTRAINT request_offers_pricing_segment_check
    CHECK (pricing_segment IN ('consumer', 'professional', 'business')),

  CONSTRAINT request_offers_billing_model_check
    CHECK (billing_model IN ('subscription', 'pay_per_lead')),

  CONSTRAINT request_offers_price_check
    CHECK (price_cents IS NULL OR price_cents > 0),

  CONSTRAINT request_offers_currency_check
    CHECK (currency = 'eur'),

  CONSTRAINT request_offers_service_value_range_check
    CHECK (
      estimated_service_value_min_cents IS NULL
      OR estimated_service_value_max_cents IS NULL
      OR estimated_service_value_max_cents >= estimated_service_value_min_cents
    ),

  CONSTRAINT request_offers_max_buyers_snapshot_check
    CHECK (max_buyers_snapshot IS NULL OR max_buyers_snapshot > 0),

  CONSTRAINT request_offers_status_check
    CHECK (status IN ('offered', 'viewed', 'accepted', 'paid', 'declined', 'expired', 'fulfilled')),

  CONSTRAINT request_offers_declined_requires_timestamp
    CHECK (status <> 'declined' OR declined_at IS NOT NULL),

  CONSTRAINT request_offers_expired_requires_timestamp
    CHECK (status <> 'expired' OR expired_at IS NOT NULL),

  CONSTRAINT request_offers_paid_requires_timestamp
    CHECK (status <> 'paid' OR paid_at IS NOT NULL),

  CONSTRAINT request_offers_outcome_timestamp_pair
    CHECK ((outcome IS NULL) = (outcome_at IS NULL))
);
```

### Indexes

```sql
CREATE INDEX idx_request_offers_specialist_status_offered
  ON public.request_offers (specialist_id, status, offered_at DESC);

CREATE INDEX idx_request_offers_lead_specialist
  ON public.request_offers (lead_id, specialist_id, offered_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX idx_request_offers_service_request_specialist
  ON public.request_offers (service_request_id, specialist_id, offered_at DESC)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX idx_request_offers_promotion_specialist
  ON public.request_offers (promotion_id, specialist_id, offered_at DESC)
  WHERE promotion_id IS NOT NULL;

CREATE UNIQUE INDEX uq_request_offers_idempotency_key
  ON public.request_offers (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

Do not make `(request, specialist)` globally unique: redistribution/re-offer after expiry or policy changes may legitimately create another offer. Idempotency should prevent accidental duplicate writes for one creation event, not prohibit future legitimate offers.

## Decision 2 — signup binding is not the future distribution model

`service_request_promotion_signup_bindings` is acquisition/signup infrastructure, not a reusable Lead Engine distribution table.

Its current uniqueness on `specialist_id` / `user_id` means it cannot represent repeated lead offers to the same specialist.

Phase 1 must not remove or repurpose it. Existing promoted-request checkout may keep using it until the payment flow is safely migrated to `request_offers`.

## Decision 3 — pricing policy is separate from price snapshot

A pricing rule can change. An already shown commercial offer must not change retroactively.

Therefore:

- pricing rules are policy;
- `request_offers.price_cents` is the immutable commercial snapshot presented to that specialist for that offer.

### Proposed `lead_pricing_rules`

```sql
CREATE TABLE public.lead_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  pricing_segment text NOT NULL,
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  specialist_service_id uuid NULL REFERENCES public.specialist_services(id) ON DELETE SET NULL,

  min_service_value_cents integer NULL,
  max_service_value_cents integer NULL,

  base_lead_price_cents integer NOT NULL,
  percentage_basis_points integer NULL,
  min_lead_price_cents integer NOT NULL,
  max_lead_price_cents integer NULL,
  default_max_buyers integer NOT NULL DEFAULT 1,

  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lead_pricing_rules_segment_check
    CHECK (pricing_segment IN ('consumer', 'professional', 'business')),
  CONSTRAINT lead_pricing_rules_value_range_check
    CHECK (
      min_service_value_cents IS NULL
      OR max_service_value_cents IS NULL
      OR max_service_value_cents >= min_service_value_cents
    ),
  CONSTRAINT lead_pricing_rules_base_positive
    CHECK (base_lead_price_cents > 0),
  CONSTRAINT lead_pricing_rules_min_positive
    CHECK (min_lead_price_cents > 0),
  CONSTRAINT lead_pricing_rules_max_ge_min
    CHECK (max_lead_price_cents IS NULL OR max_lead_price_cents >= min_lead_price_cents),
  CONSTRAINT lead_pricing_rules_percentage_check
    CHECK (percentage_basis_points IS NULL OR percentage_basis_points BETWEEN 0 AND 10000),
  CONSTRAINT lead_pricing_rules_buyers_positive
    CHECK (default_max_buyers > 0),
  CONSTRAINT lead_pricing_rules_window_check
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);
```

The first implementation should use deterministic server-side rule resolution by segment/category/service/value band/priority. Browser input may describe the request but may not supply authoritative lead price.

## Decision 4 — use specialist service price as an input, not as the truth of final contract value

`specialist_services` already contains `price_from`, optional `price_to`, pricing type and currency.

Those values may seed estimated service value for pricing where appropriate.

For B2B, the Lead Engine may also store request-specific estimated project value. It must not require the final signed contract amount or invoice to calculate Freuly revenue.

## Decision 5 — subscription is an entitlement source, not a zero-price lead

Do not encode subscription offers as `price_cents = 0`.

`billing_model = 'subscription'` means that the specialist's valid plan grants access according to subscription policy.

`billing_model = 'pay_per_lead'` means the offer requires a successful payment entitlement before PII is unlocked.

This separation is necessary to compare subscription and pay-per-lead economics accurately.

## Decision 6 — canonical contact access resolver

Create one server-only resolver API conceptually shaped as:

```ts
type RequestContactAccessDecision =
  | { kind: 'unlocked'; source: 'subscription' | 'payment' }
  | { kind: 'locked'; canPurchase: boolean; priceCents: number | null }
  | { kind: 'processing' }
  | { kind: 'unavailable' };
```

Its inputs are trusted server facts only:

- request/offer ownership;
- active subscription entitlement;
- paid access grant/payment entitlement;
- offer lifecycle/availability;
- current request availability.

### Direct lead behaviour

`contact_unlocked_at` remains the persisted PII visibility boundary.

The mutation that first sets it changes from subscription-only to:

`valid subscription entitlement OR valid paid entitlement for the corresponding request_offer`.

### Promoted service-request behaviour

Keep `promoted_request_access_grants` during Phase 1. The new offer should link to existing promoted payment/grant facts rather than duplicate Stripe logic.

The long-term access-grant model may later be generalized, but only after both paths are stable.

## Decision 7 — dynamic pricing rollout is staged

Do not edit the live EUR 10 constant in isolation.

Sequence:

1. Add `request_offers` and `lead_pricing_rules` schema with no live behaviour change.
2. Start creating offer snapshots while keeping current EUR 10 promoted checkout authoritative.
3. Add server pricing resolver and compare calculated price vs EUR 10 in logs/admin-only diagnostics.
4. Add `request_offer_id` reference to promoted payment path.
5. Relax DB `amount_cents = 1000` only when webhook validation compares Stripe paid amount to persisted expected offer/payment amount.
6. Switch checkout `unit_amount` from constant to trusted persisted price.
7. Decouple `promoted_request_subscription_credits` from arbitrary lead price; credit becomes an explicit separate acquisition policy or is retired.
8. Enable direct-lead pay-per-lead only after the common entitlement resolver is production-tested.

## Decision 8 — B2B is a pricing segment of the same Lead Engine

B2B must not use a second request engine.

Use `pricing_segment = 'business'` plus different pricing rules and later dedicated subscription plans.

Pricing policy may use declining percentage bands, for example high percentages for low-value services and lower percentages for high-value projects, while retaining minimum and maximum absolute lead prices.

The exact commercial percentages are configuration/product decisions, not hardcoded architecture.

## Decision 9 — scarcity/max buyers must be atomic

`max_buyers_snapshot` is snapshotted on the commercial offer/request policy.

A future buyer-count implementation must claim capacity inside one database transaction / RPC with row-level locking or equivalent atomic update.

Never implement:

1. SELECT count
2. check in application
3. INSERT grant

as separate raceable operations.

The payment webhook remains authoritative for final paid access. Capacity reservation and timeout policy must be designed together before `max_buyers` is enabled.

## Rollout constraints

- All new billing/distribution tables are service-role only initially.
- No PII is duplicated into `request_offers` or pricing tables.
- Existing `leads` and `service_requests` remain canonical client-request records.
- Existing Stripe proof-of-payment and refund/dispute handling remains authoritative.
- Existing subscription/grace lifecycle remains unchanged until the unified resolver is introduced.
- Production Supabase schema must be verified before applying any migration that alters existing constraints.

## Smallest safe implementation sequence

1. Add additive tables only: `request_offers`, then `lead_pricing_rules`.
2. Add server data-access/types and tests.
3. On new direct lead creation, create a `direct_selection` offer idempotently; do not change unlock behaviour yet.
4. Add offer creation/linking for service-request distribution; do not change EUR 10 checkout yet.
5. Record `viewed`, `declined`, `expired`, `contacted`, and `outcome` events.
6. Add pricing resolver in shadow mode.
7. Add common contact-access resolver.
8. Add direct-lead pay-per-lead payment path.
9. Migrate promoted checkout to dynamic offer price.
10. Add atomic max-buyers enforcement.

## Consequences

Freuly gains one measurable funnel across direct B2C, assisted requests and B2B:

request → offer → view → entitlement/payment → contact → outcome.

This allows the company to compare subscription vs pay-per-lead, calculate revenue per qualified request, learn which specialists actually react to demand, and expand pricing to high-value B2B without creating a separate architecture.
