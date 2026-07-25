-- Partner Program phase 4: subscription-credit ledger on commissions.
-- Required so the same reward cents cannot be both cash-paid and subscription-credited.
-- Apply manually when ready (same process as phase1–3).

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

CREATE TABLE IF NOT EXISTS public.partner_credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE RESTRICT,
  specialist_id uuid NULL REFERENCES public.specialists (id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'reserved',
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_credit_applications_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT partner_credit_applications_currency_check CHECK (char_length(currency) = 3),
  CONSTRAINT partner_credit_applications_status_check CHECK (
    status IN ('reserved', 'consumed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_partner_credit_applications_partner
  ON public.partner_credit_applications (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.partner_credit_application_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.partner_credit_applications (id) ON DELETE CASCADE,
  commission_id uuid NOT NULL REFERENCES public.partner_commissions (id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL,
  CONSTRAINT partner_credit_application_lines_amount_positive CHECK (amount_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_partner_credit_lines_commission
  ON public.partner_credit_application_lines (commission_id);

COMMENT ON COLUMN public.partner_commissions.credited_cents IS
  'Immutable allocation of this reward to Freuly subscription credit (integer cents).';
COMMENT ON COLUMN public.partner_commissions.paid_out_cents IS
  'Immutable allocation of this reward to cash payout (integer cents).';
COMMENT ON TABLE public.partner_credit_applications IS
  'Partner chose to use confirmed reward balance as Freuly subscription credit.';
