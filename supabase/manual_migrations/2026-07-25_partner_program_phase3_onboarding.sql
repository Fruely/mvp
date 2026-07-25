-- Freuly Partner Program Phase 3
-- Agreement version + Stripe Connect identifiers (no IBAN / KYC stored).
-- Manual migration. Apply on staging first.
-- Does not enable live payouts (PARTNER_PAYOUTS_ENABLED remains false in app).

BEGIN;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS agreement_version text NULL;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS stripe_account_id text NULL;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status text NULL;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS stripe_last_synced_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partners_stripe_onboarding_status_check'
  ) THEN
    ALTER TABLE public.partners
      ADD CONSTRAINT partners_stripe_onboarding_status_check
      CHECK (
        stripe_onboarding_status IS NULL
        OR stripe_onboarding_status IN ('not_started', 'pending', 'complete', 'disabled')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.partners.agreement_version IS
  'Partner Agreement version accepted by the bound user (with contract_signed_at).';
COMMENT ON COLUMN public.partners.stripe_account_id IS
  'Stripe Connect account id only. Never store IBAN or KYC documents in Freuly.';
COMMENT ON COLUMN public.partners.stripe_onboarding_status IS
  'Mirror of Connect onboarding progress for UI; live payouts gated by PARTNER_PAYOUTS_ENABLED.';

COMMIT;
