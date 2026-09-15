-- Lead Engine Phase 1: additive commercial offer/distribution layer.
-- Architecture: docs/architecture/decisions/004-lead-engine-request-offers.md
-- Related: #40
--
-- IMPORTANT:
-- - Manual migration record only. Apply through the normal Supabase production process.
-- - This migration does NOT change current lead unlock, Stripe checkout, subscription,
--   promoted-request EUR 10 pricing, or client PII visibility behavior.
-- - request_offers stores no client contact PII.

BEGIN;

CREATE TABLE IF NOT EXISTS public.request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One canonical client-request origin. The offer itself is commercial/distribution state.
  request_kind text NOT NULL,
  lead_id uuid NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  service_request_id uuid NULL REFERENCES public.service_requests(id) ON DELETE RESTRICT,
  promotion_id uuid NULL REFERENCES public.service_request_promotions(id) ON DELETE SET NULL,
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE RESTRICT,

  -- Why this specialist received this opportunity.
  offer_reason text NOT NULL,

  -- Pricing/business classification snapshot for analytics and later entitlement logic.
  pricing_segment text NOT NULL,
  billing_model text NOT NULL,

  -- Server-authoritative commercial snapshot. Nullable during initial shadow rollout;
  -- runtime must never accept authoritative price from the browser/client.
  price_cents integer NULL,
  currency text NOT NULL DEFAULT 'eur',
  pricing_rule_id uuid NULL,
  specialist_service_id uuid NULL
    REFERENCES public.specialist_services(id) ON DELETE SET NULL,
  estimated_service_value_min_cents integer NULL,
  estimated_service_value_max_cents integer NULL,
  max_buyers_snapshot integer NULL,

  -- Offer lifecycle / funnel.
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

  -- Server-generated idempotency anchor. Do not reuse as public token.
  idempotency_key text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT request_offers_request_kind_check CHECK (
    request_kind IN ('direct_lead', 'service_request')
  ),

  CONSTRAINT request_offers_exactly_one_origin_check CHECK (
    (
      request_kind = 'direct_lead'
      AND lead_id IS NOT NULL
      AND service_request_id IS NULL
    )
    OR
    (
      request_kind = 'service_request'
      AND lead_id IS NULL
      AND service_request_id IS NOT NULL
    )
  ),

  CONSTRAINT request_offers_offer_reason_check CHECK (
    offer_reason IN ('direct_selection', 'matched', 'redistributed', 'manual')
  ),

  CONSTRAINT request_offers_pricing_segment_check CHECK (
    pricing_segment IN ('consumer', 'professional', 'business')
  ),

  CONSTRAINT request_offers_billing_model_check CHECK (
    billing_model IN ('subscription', 'pay_per_lead')
  ),

  CONSTRAINT request_offers_price_positive_check CHECK (
    price_cents IS NULL OR price_cents > 0
  ),

  CONSTRAINT request_offers_currency_check CHECK (
    currency = 'eur'
  ),

  CONSTRAINT request_offers_service_value_min_non_negative_check CHECK (
    estimated_service_value_min_cents IS NULL
    OR estimated_service_value_min_cents >= 0
  ),

  CONSTRAINT request_offers_service_value_max_non_negative_check CHECK (
    estimated_service_value_max_cents IS NULL
    OR estimated_service_value_max_cents >= 0
  ),

  CONSTRAINT request_offers_service_value_range_check CHECK (
    estimated_service_value_min_cents IS NULL
    OR estimated_service_value_max_cents IS NULL
    OR estimated_service_value_max_cents >= estimated_service_value_min_cents
  ),

  CONSTRAINT request_offers_max_buyers_snapshot_check CHECK (
    max_buyers_snapshot IS NULL OR max_buyers_snapshot > 0
  ),

  CONSTRAINT request_offers_status_check CHECK (
    status IN ('offered', 'viewed', 'accepted', 'paid', 'declined', 'expired', 'fulfilled')
  ),

  CONSTRAINT request_offers_declined_requires_timestamp_check CHECK (
    status <> 'declined' OR declined_at IS NOT NULL
  ),

  CONSTRAINT request_offers_expired_requires_timestamp_check CHECK (
    status <> 'expired' OR expired_at IS NOT NULL
  ),

  CONSTRAINT request_offers_paid_requires_timestamp_check CHECK (
    status <> 'paid' OR paid_at IS NOT NULL
  ),

  CONSTRAINT request_offers_outcome_timestamp_pair_check CHECK (
    (outcome IS NULL) = (outcome_at IS NULL)
  ),

  CONSTRAINT request_offers_idempotency_key_not_blank_check CHECK (
    idempotency_key IS NULL OR length(trim(idempotency_key)) > 0
  )
);

-- Inbox / specialist lifecycle queries.
CREATE INDEX IF NOT EXISTS idx_request_offers_specialist_status_offered
  ON public.request_offers (specialist_id, status, offered_at DESC);

-- Request distribution history.
CREATE INDEX IF NOT EXISTS idx_request_offers_lead_specialist
  ON public.request_offers (lead_id, specialist_id, offered_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_request_offers_service_request_specialist
  ON public.request_offers (service_request_id, specialist_id, offered_at DESC)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_request_offers_promotion_specialist
  ON public.request_offers (promotion_id, specialist_id, offered_at DESC)
  WHERE promotion_id IS NOT NULL;

-- Creation idempotency, while still allowing a legitimate later re-offer to the same specialist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_request_offers_idempotency_key
  ON public.request_offers (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_request_offers_status_created
  ON public.request_offers (status, created_at DESC);

COMMENT ON TABLE public.request_offers IS
  'Lead Engine commercial/distribution offers. One row represents one offer of one existing client request (direct lead or service request) to one specialist. Contains no client PII and does not replace leads/service_requests.';

COMMENT ON COLUMN public.request_offers.request_kind IS
  'Origin discriminator. direct_lead requires lead_id; service_request requires service_request_id.';

COMMENT ON COLUMN public.request_offers.offer_reason IS
  'Why the specialist received the offer: client direct selection, matching, redistribution, or manual operator action.';

COMMENT ON COLUMN public.request_offers.pricing_segment IS
  'Commercial pricing segment snapshot: consumer, professional, or business (B2B).';

COMMENT ON COLUMN public.request_offers.billing_model IS
  'Commercial access model snapshot: subscription entitlement or pay-per-lead.';

COMMENT ON COLUMN public.request_offers.price_cents IS
  'Server-authoritative lead price snapshot. Nullable only during initial shadow rollout; browser/client values are never authoritative.';

COMMENT ON COLUMN public.request_offers.pricing_rule_id IS
  'Reserved reference to future lead_pricing_rules policy. No FK in this migration because pricing rules are introduced separately.';

COMMENT ON COLUMN public.request_offers.max_buyers_snapshot IS
  'Scarcity policy snapshot. This column alone does not enforce capacity; future purchase capacity must be claimed atomically.';

COMMENT ON COLUMN public.request_offers.idempotency_key IS
  'Server-generated creation-event idempotency key. Prevents retry duplicates without globally forbidding later legitimate re-offers.';

-- Billing/distribution data remains server-only in Phase 1.
ALTER TABLE public.request_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_offers FROM anon, authenticated;
GRANT ALL ON public.request_offers TO service_role;

COMMIT;
