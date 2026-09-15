-- Lead Engine Phase 1: additive server-side pricing policy foundation.
-- Architecture: docs/architecture/decisions/004-lead-engine-request-offers.md
-- Related: #40
--
-- IMPORTANT:
-- - Manual migration record only. Apply through the normal Supabase production process.
-- - This migration does NOT change live EUR 10 promoted-request pricing.
-- - No browser/client value is authoritative for lead pricing.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  pricing_segment text NOT NULL,
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  specialist_service_id uuid NULL
    REFERENCES public.specialist_services(id) ON DELETE SET NULL,

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

  CONSTRAINT lead_pricing_rules_segment_check CHECK (
    pricing_segment IN ('consumer', 'professional', 'business')
  ),

  CONSTRAINT lead_pricing_rules_service_value_min_non_negative_check CHECK (
    min_service_value_cents IS NULL OR min_service_value_cents >= 0
  ),

  CONSTRAINT lead_pricing_rules_service_value_max_non_negative_check CHECK (
    max_service_value_cents IS NULL OR max_service_value_cents >= 0
  ),

  CONSTRAINT lead_pricing_rules_value_range_check CHECK (
    min_service_value_cents IS NULL
    OR max_service_value_cents IS NULL
    OR max_service_value_cents >= min_service_value_cents
  ),

  CONSTRAINT lead_pricing_rules_base_positive_check CHECK (
    base_lead_price_cents > 0
  ),

  CONSTRAINT lead_pricing_rules_min_positive_check CHECK (
    min_lead_price_cents > 0
  ),

  CONSTRAINT lead_pricing_rules_max_ge_min_check CHECK (
    max_lead_price_cents IS NULL
    OR max_lead_price_cents >= min_lead_price_cents
  ),

  CONSTRAINT lead_pricing_rules_percentage_check CHECK (
    percentage_basis_points IS NULL
    OR percentage_basis_points BETWEEN 0 AND 10000
  ),

  CONSTRAINT lead_pricing_rules_buyers_positive_check CHECK (
    default_max_buyers > 0
  ),

  CONSTRAINT lead_pricing_rules_priority_non_negative_check CHECK (
    priority >= 0
  ),

  CONSTRAINT lead_pricing_rules_window_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
  )
);

-- Deterministic resolver candidates: active segment/category/service rules in priority order.
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_active_resolution
  ON public.lead_pricing_rules (
    pricing_segment,
    category_id,
    specialist_service_id,
    priority,
    created_at DESC
  )
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_active_window
  ON public.lead_pricing_rules (active, starts_at, ends_at, priority);

COMMENT ON TABLE public.lead_pricing_rules IS
  'Server-only Lead Engine pricing policy. Rules may change over time; the commercial price shown to a specialist must be snapshotted on request_offers.';

COMMENT ON COLUMN public.lead_pricing_rules.pricing_segment IS
  'consumer, professional, or business (B2B). B2B uses the same request engine with different economics.';

COMMENT ON COLUMN public.lead_pricing_rules.percentage_basis_points IS
  'Optional percentage of estimated service/project value used by a server resolver. 500 = 5%. Exact calculation policy is runtime-controlled.';

COMMENT ON COLUMN public.lead_pricing_rules.default_max_buyers IS
  'Scarcity policy default to snapshot onto an offer/request. This table does not itself enforce purchase capacity.';

COMMENT ON COLUMN public.lead_pricing_rules.priority IS
  'Lower numeric priority wins among otherwise applicable rules. Runtime must apply deterministic tie-breaking.';

ALTER TABLE public.lead_pricing_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_pricing_rules FROM anon, authenticated;
GRANT ALL ON public.lead_pricing_rules TO service_role;

COMMIT;
