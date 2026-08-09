-- Referral R1-A: partner commission consumption ledger (credit + manual bank-transfer payout).
-- Additive, non-destructive. Apply manually in Supabase SQL editor (Cursor does NOT apply).
--
-- Supersedes draft 2026-07-25_partner_program_phase4_credit_ledger.sql for environments
-- where that draft was never applied. Do not apply both without manual schema review.
--
-- Invariants:
-- - Does NOT change referral attribution, commission calculation, Stripe eligibility,
--   14-day approval, refund/dispute reversal, or partner onboarding.
-- - No Stripe Connect. No bank credentials stored in partner_payouts.
-- - Bank transfer is executed by admin outside Freuly; status `paid` = admin confirmed transfer.

BEGIN;

-- ---------------------------------------------------------------------------
-- partner_commissions — consumption allocation columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS credited_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS paid_out_cents integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_commissions_credited_nonneg'
  ) THEN
    ALTER TABLE public.partner_commissions
      ADD CONSTRAINT partner_commissions_credited_nonneg CHECK (credited_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_commissions_paid_out_nonneg'
  ) THEN
    ALTER TABLE public.partner_commissions
      ADD CONSTRAINT partner_commissions_paid_out_nonneg CHECK (paid_out_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_commissions_allocation_lte_amount'
  ) THEN
    ALTER TABLE public.partner_commissions
      ADD CONSTRAINT partner_commissions_allocation_lte_amount
      CHECK (credited_cents + paid_out_cents <= amount_cents);
  END IF;
END $$;

COMMENT ON COLUMN public.partner_commissions.amount_cents IS
  'Earned partner commission amount in integer cents (snapshotted at creation).';
COMMENT ON COLUMN public.partner_commissions.credited_cents IS
  'Amount of this commission consumed as Freuly subscription credit (integer cents).';
COMMENT ON COLUMN public.partner_commissions.paid_out_cents IS
  'Amount of this commission allocated to manual bank-transfer payout (integer cents).';
COMMENT ON TABLE public.partner_commissions IS
  'Partner commission ledger. credited_cents + paid_out_cents must not exceed amount_cents. '
  'Consumption is recorded by runtime; row-level CHECK is the last defense against over-allocation.';

-- ---------------------------------------------------------------------------
-- partner_credit_applications — immutable credit application ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE RESTRICT,
  commission_id uuid NOT NULL REFERENCES public.partner_commissions (id) ON DELETE RESTRICT,
  specialist_id uuid NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz NULL,
  rejected_at timestamptz NULL,
  rejection_reason text NULL,
  created_by_user_id uuid NULL,
  idempotency_key text NOT NULL,
  CONSTRAINT partner_credit_applications_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT partner_credit_applications_currency_check CHECK (char_length(currency) = 3),
  CONSTRAINT partner_credit_applications_status_check CHECK (
    status IN ('pending', 'applied', 'rejected', 'cancelled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_credit_applications_idempotency_key
  ON public.partner_credit_applications (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_partner_credit_applications_partner_created
  ON public.partner_credit_applications (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_credit_applications_commission_created
  ON public.partner_credit_applications (commission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_credit_applications_status_created
  ON public.partner_credit_applications (status, created_at DESC);

COMMENT ON TABLE public.partner_credit_applications IS
  'Immutable financial ledger of partner requests to apply approved commission as Freuly subscription credit. '
  'Does not itself activate subscription entitlement — runtime applies credit separately. '
  'Does not create Stripe payment revenue and cannot create partner commission.';
COMMENT ON COLUMN public.partner_credit_applications.commission_id IS
  'Commission row being consumed (partial applications allowed; totals enforced on partner_commissions).';
COMMENT ON COLUMN public.partner_credit_applications.specialist_id IS
  'Optional specialist ownership context when credit applies to a partner-owned specialist account.';
COMMENT ON COLUMN public.partner_credit_applications.idempotency_key IS
  'Server-generated idempotency key; UNIQUE prevents duplicate credit applications.';

-- ---------------------------------------------------------------------------
-- partner_payouts — manual bank-transfer operational fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_payouts
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NULL;

ALTER TABLE public.partner_payouts
  ADD COLUMN IF NOT EXISTS ready_at timestamptz NULL;

ALTER TABLE public.partner_payouts
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL;

ALTER TABLE public.partner_payouts
  ADD COLUMN IF NOT EXISTS requested_amount_cents integer NULL;

ALTER TABLE public.partner_payouts
  ADD COLUMN IF NOT EXISTS admin_note text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_payouts_requested_amount_nonneg'
  ) THEN
    ALTER TABLE public.partner_payouts
      ADD CONSTRAINT partner_payouts_requested_amount_nonneg
      CHECK (requested_amount_cents IS NULL OR requested_amount_cents >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_payouts_status_created
  ON public.partner_payouts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_created
  ON public.partner_payouts (partner_id, created_at DESC);

COMMENT ON TABLE public.partner_payouts IS
  'Manual bank-transfer operational ledger for partner cash payouts. '
  'Freuly does not execute bank transfers automatically. '
  'Status paid means an admin confirmed the external transfer completed. '
  'No bank credentials (IBAN/BIC), card data, or Stripe Connect payout IDs are stored here. '
  'R1-B runtime creates payout requests without bank details; admin completes transfer offline.';
COMMENT ON COLUMN public.partner_payouts.requested_at IS
  'When the partner (or admin on their behalf) requested this payout batch.';
COMMENT ON COLUMN public.partner_payouts.ready_at IS
  'When admin marked the payout ready for external bank transfer.';
COMMENT ON COLUMN public.partner_payouts.paid_at IS
  'When admin confirmed the external bank transfer completed (existing column; semantic unchanged).';
COMMENT ON COLUMN public.partner_payouts.cancelled_at IS
  'When the payout request was cancelled before external transfer.';
COMMENT ON COLUMN public.partner_payouts.requested_amount_cents IS
  'Partner-requested payout amount in integer cents (may differ from final amount_cents until admin confirms).';
COMMENT ON COLUMN public.partner_payouts.payment_reference IS
  'Optional external bank-transfer reference supplied by admin after manual transfer (existing column).';
COMMENT ON COLUMN public.partner_payouts.admin_note IS
  'Internal admin note for manual payout operations. Must not store bank credentials.';

-- ---------------------------------------------------------------------------
-- RLS: partner_credit_applications — service_role only (match phase 1 partner tables)
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_credit_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.partner_credit_applications FROM anon, authenticated;

GRANT ALL ON TABLE public.partner_credit_applications TO service_role;

COMMIT;
