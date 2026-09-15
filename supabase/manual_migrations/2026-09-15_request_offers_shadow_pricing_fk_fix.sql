-- Lead Engine Phase 1: preserve shadow-pricing snapshot integrity.
--
-- request_offers.shadow_pricing_rule_id participates in an all-or-none shadow snapshot.
-- ON DELETE SET NULL would conflict with that invariant when a referenced rule is deleted.
-- Historical pricing rules used by offers must therefore be retained.

BEGIN;

ALTER TABLE public.request_offers
  DROP CONSTRAINT IF EXISTS request_offers_shadow_pricing_rule_id_fkey;

ALTER TABLE public.request_offers
  ADD CONSTRAINT request_offers_shadow_pricing_rule_id_fkey
  FOREIGN KEY (shadow_pricing_rule_id)
  REFERENCES public.lead_pricing_rules(id)
  ON DELETE RESTRICT;

COMMIT;
