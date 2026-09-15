-- Lead Engine Phase 1: additive shadow-pricing snapshot fields on request_offers.
-- Manual migration record only. Apply through the normal Supabase production process.
--
-- IMPORTANT:
-- - Does NOT change live offer price_cents.
-- - Does NOT change billing_model, Stripe pricing, entitlement, or checkout behavior.
-- - Shadow values are observational only until an explicit later rollout.

BEGIN;

ALTER TABLE public.request_offers
  ADD COLUMN IF NOT EXISTS shadow_price_cents integer NULL,
  ADD COLUMN IF NOT EXISTS shadow_pricing_rule_id uuid NULL
    REFERENCES public.lead_pricing_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shadow_max_buyers integer NULL,
  ADD COLUMN IF NOT EXISTS shadow_priced_at timestamptz NULL;

ALTER TABLE public.request_offers
  DROP CONSTRAINT IF EXISTS request_offers_shadow_price_positive_check;
ALTER TABLE public.request_offers
  ADD CONSTRAINT request_offers_shadow_price_positive_check CHECK (
    shadow_price_cents IS NULL OR shadow_price_cents > 0
  );

ALTER TABLE public.request_offers
  DROP CONSTRAINT IF EXISTS request_offers_shadow_max_buyers_positive_check;
ALTER TABLE public.request_offers
  ADD CONSTRAINT request_offers_shadow_max_buyers_positive_check CHECK (
    shadow_max_buyers IS NULL OR shadow_max_buyers > 0
  );

ALTER TABLE public.request_offers
  DROP CONSTRAINT IF EXISTS request_offers_shadow_pricing_pair_check;
ALTER TABLE public.request_offers
  ADD CONSTRAINT request_offers_shadow_pricing_pair_check CHECK (
    (
      shadow_price_cents IS NULL
      AND shadow_pricing_rule_id IS NULL
      AND shadow_max_buyers IS NULL
      AND shadow_priced_at IS NULL
    )
    OR
    (
      shadow_price_cents IS NOT NULL
      AND shadow_pricing_rule_id IS NOT NULL
      AND shadow_max_buyers IS NOT NULL
      AND shadow_priced_at IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_request_offers_shadow_pricing_rule
  ON public.request_offers (shadow_pricing_rule_id, shadow_priced_at DESC)
  WHERE shadow_pricing_rule_id IS NOT NULL;

COMMENT ON COLUMN public.request_offers.shadow_price_cents IS
  'Observational PPL price calculated by the shadow pricing resolver. Never authoritative for checkout while Phase 1 is in shadow mode.';

COMMENT ON COLUMN public.request_offers.shadow_pricing_rule_id IS
  'Pricing rule used for the shadow calculation. The live commercial price remains price_cents.';

COMMENT ON COLUMN public.request_offers.shadow_max_buyers IS
  'Shadow snapshot of the pricing rule default_max_buyers. Does not enforce capacity.';

COMMENT ON COLUMN public.request_offers.shadow_priced_at IS
  'Timestamp when the shadow pricing snapshot was calculated.';

COMMIT;
