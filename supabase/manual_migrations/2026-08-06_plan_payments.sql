-- Phase 4G-A: manual plan payment orders for one-time Stripe Checkout (mode=payment).
-- One row per Checkout attempt; webhook-confirmed paid status extends specialist_plan.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.
--
-- NOT self-healing: if public.plan_payments exists without Phase 4G-A marker constraints,
-- this script aborts. Re-run after successful apply is a no-op for CREATE TABLE / indexes
-- (IF NOT EXISTS) and refreshes COMMENT ON text only.

BEGIN;

-- ---------------------------------------------------------------------------
-- Preflight — refuse incompatible pre-existing table
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.plan_payments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public'
        AND r.relname = 'plan_payments'
        AND c.conname = 'plan_payments_promoted_credit_discount_pair'
    ) THEN
      RAISE EXCEPTION
        'public.plan_payments already exists but Phase 4G-A schema marker is missing; manual review required before apply';
    END IF;
    RAISE NOTICE 'Phase 4G-A: public.plan_payments already present; CREATE TABLE/index steps will no-op where IF NOT EXISTS applies';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- plan_payments — one row per manual Basic/Premium monthly Checkout attempt
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  status text NOT NULL DEFAULT 'pending',
  plan_code text NOT NULL,
  billing_interval text NOT NULL DEFAULT 'month',
  currency text NOT NULL DEFAULT 'eur',
  gross_amount_cents integer NOT NULL,
  discount_amount_cents integer NOT NULL DEFAULT 0,
  net_amount_cents integer NOT NULL,
  period_months integer NOT NULL DEFAULT 1,
  provider_customer_id text NULL,
  provider_price_id text NULL,
  stripe_checkout_session_id text NULL,
  stripe_payment_intent_id text NULL,
  stripe_charge_id text NULL,
  promoted_credit_id uuid NULL
    REFERENCES public.promoted_request_subscription_credits (id) ON DELETE RESTRICT,
  checkout_created_at timestamptz NULL,
  paid_at timestamptz NULL,
  failed_at timestamptz NULL,
  expired_at timestamptz NULL,
  refunded_at timestamptz NULL,
  disputed_at timestamptz NULL,
  failure_code text NULL,
  entitlement_applied_at timestamptz NULL,
  prior_expires_at timestamptz NULL,
  period_end_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_payments_provider_check CHECK (provider = 'stripe'),
  CONSTRAINT plan_payments_plan_code_check CHECK (plan_code IN ('basic', 'premium')),
  CONSTRAINT plan_payments_billing_interval_check CHECK (billing_interval = 'month'),
  CONSTRAINT plan_payments_currency_check CHECK (currency = 'eur'),
  CONSTRAINT plan_payments_period_months_check CHECK (period_months = 1),
  CONSTRAINT plan_payments_gross_amount_cents_check CHECK (gross_amount_cents > 0),
  CONSTRAINT plan_payments_discount_amount_cents_nonneg CHECK (discount_amount_cents >= 0),
  CONSTRAINT plan_payments_net_amount_cents_nonneg CHECK (net_amount_cents >= 0),
  CONSTRAINT plan_payments_net_equals_gross_minus_discount CHECK (
    net_amount_cents = gross_amount_cents - discount_amount_cents
  ),
  CONSTRAINT plan_payments_basic_gross_check CHECK (
    plan_code <> 'basic' OR gross_amount_cents = 2900
  ),
  CONSTRAINT plan_payments_premium_gross_check CHECK (
    plan_code <> 'premium' OR gross_amount_cents = 5900
  ),
  CONSTRAINT plan_payments_discount_amount_check CHECK (
    discount_amount_cents IN (0, 1000)
  ),
  CONSTRAINT plan_payments_net_amount_by_plan_check CHECK (
    (plan_code = 'basic' AND net_amount_cents IN (1900, 2900))
    OR (plan_code = 'premium' AND net_amount_cents IN (4900, 5900))
  ),
  CONSTRAINT plan_payments_promoted_credit_discount_pair CHECK (
    (promoted_credit_id IS NULL AND discount_amount_cents = 0)
    OR (promoted_credit_id IS NOT NULL AND discount_amount_cents = 1000)
  ),
  CONSTRAINT plan_payments_status_check CHECK (
    status IN (
      'pending',
      'checkout_created',
      'paid',
      'failed',
      'expired',
      'refunded',
      'disputed'
    )
  ),
  CONSTRAINT plan_payments_checkout_created_requires_session CHECK (
    status NOT IN ('checkout_created', 'paid', 'failed', 'expired', 'refunded', 'disputed')
    OR stripe_checkout_session_id IS NOT NULL
  ),
  CONSTRAINT plan_payments_terminal_requires_paid_at CHECK (
    status NOT IN ('paid', 'refunded', 'disputed')
    OR paid_at IS NOT NULL
  ),
  CONSTRAINT plan_payments_terminal_requires_intent CHECK (
    status NOT IN ('paid', 'refunded', 'disputed')
    OR stripe_payment_intent_id IS NOT NULL
  ),
  CONSTRAINT plan_payments_failed_requires_failed_at CHECK (
    status <> 'failed' OR failed_at IS NOT NULL
  ),
  CONSTRAINT plan_payments_expired_requires_expired_at CHECK (
    status <> 'expired' OR expired_at IS NOT NULL
  ),
  CONSTRAINT plan_payments_refunded_requires_refunded_at CHECK (
    status <> 'refunded' OR refunded_at IS NOT NULL
  ),
  CONSTRAINT plan_payments_disputed_requires_disputed_at CHECK (
    status <> 'disputed' OR disputed_at IS NOT NULL
  ),
  CONSTRAINT plan_payments_entitlement_status_check CHECK (
    entitlement_applied_at IS NULL
    OR status IN ('paid', 'refunded', 'disputed')
  ),
  CONSTRAINT plan_payments_entitlement_fields_pair CHECK (
    entitlement_applied_at IS NULL
    OR period_end_at IS NOT NULL
  ),
  CONSTRAINT plan_payments_stripe_checkout_session_id_unique
    UNIQUE (stripe_checkout_session_id),
  CONSTRAINT plan_payments_stripe_payment_intent_id_unique
    UNIQUE (stripe_payment_intent_id),
  CONSTRAINT plan_payments_stripe_charge_id_unique
    UNIQUE (stripe_charge_id)
);

-- Reserve promoted_credit_id from first pending/checkout through terminal paid/refund/dispute.
-- failed/expired rows do NOT reserve — a new checkout may reuse the credit if still eligible.
CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_payments_promoted_credit_reserved
  ON public.plan_payments (promoted_credit_id)
  WHERE promoted_credit_id IS NOT NULL
    AND status IN ('pending', 'checkout_created', 'paid', 'refunded', 'disputed');

CREATE INDEX IF NOT EXISTS idx_plan_payments_specialist_status_created
  ON public.plan_payments (specialist_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_payments_specialist_created
  ON public.plan_payments (specialist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_payments_status_created
  ON public.plan_payments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_payments_paid_unapplied_entitlement
  ON public.plan_payments (paid_at)
  WHERE status = 'paid'
    AND entitlement_applied_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_plan_payments_provider_customer_created
  ON public.plan_payments (provider_customer_id, created_at DESC)
  WHERE provider_customer_id IS NOT NULL;

COMMENT ON TABLE public.plan_payments IS
  'One row per manual Freuly Basic/Premium monthly Checkout attempt (Stripe mode=payment). Server creates row before Checkout; webhook confirms paid status and entitlement_applied_at after specialist_plan period stacking. No Stripe Subscription, no auto-renewal. billing_events remains the per-event webhook idempotency ledger. Refund/dispute marks payment status only — does not auto-shorten specialist_plan.expires_at (manual review). Required webhook entitlement transaction (Phase 4G-B runtime, single DB transaction): BEGIN; SELECT plan_payments ... FOR UPDATE; IF entitlement_applied_at IS NOT NULL THEN idempotent noop; SELECT specialist_plan ... FOR UPDATE; IF promoted_credit_id IS NOT NULL THEN SELECT promoted_request_subscription_credits ... FOR UPDATE; UPDATE specialist_plan (stack calendar month); consume promoted credit; UPDATE plan_payments SET entitlement_applied_at, prior_expires_at, period_end_at, updated_at WHERE entitlement_applied_at IS NULL; COMMIT; Conditional UPDATE alone is insufficient — row locks required.';

COMMENT ON COLUMN public.plan_payments.user_id IS
  'Audit snapshot of specialists.user_id at checkout creation. No FK to auth.users — financial history must not depend on auth user deletion. Runtime must verify specialist_id/user_id consistency when creating the order.';

COMMENT ON COLUMN public.plan_payments.gross_amount_cents IS
  'Catalog list price in cents: basic=2900, premium=5900 for v1 monthly EUR.';

COMMENT ON COLUMN public.plan_payments.discount_amount_cents IS
  'Server-side discount in cents; v1 allows 0 or 1000 (promoted acquisition credit). Must pair with promoted_credit_id per plan_payments_promoted_credit_discount_pair.';

COMMENT ON COLUMN public.plan_payments.net_amount_cents IS
  'Expected Stripe charge: gross_amount_cents - discount_amount_cents.';

COMMENT ON COLUMN public.plan_payments.period_months IS
  'Paid period length in calendar months applied on entitlement (v1 fixed to 1).';

COMMENT ON COLUMN public.plan_payments.provider_customer_id IS
  'Stripe Customer id (cus_…); denormalized from billing_customers for audit — no FK.';

COMMENT ON COLUMN public.plan_payments.provider_price_id IS
  'Stripe one-time Price id (price_…) used for this Checkout line item.';

COMMENT ON COLUMN public.plan_payments.promoted_credit_id IS
  'Optional FK to promoted_request_subscription_credits when €10 discount applied. Reserved while status IN (pending, checkout_created, paid, refunded, disputed) via uq_plan_payments_promoted_credit_reserved. Consumption finalized on credit row after webhook.';

COMMENT ON COLUMN public.plan_payments.entitlement_applied_at IS
  'Set once when specialist_plan stacking succeeds. Allowed while status is paid, refunded, or disputed. NULL after paid until entitlement projection completes — webhook retries must be safe.';

COMMENT ON COLUMN public.plan_payments.prior_expires_at IS
  'Snapshot of specialist_plan.expires_at immediately before this payment extended the period; NULL when no prior paid period existed.';

COMMENT ON COLUMN public.plan_payments.period_end_at IS
  'Snapshot of specialist_plan.expires_at after this payment entitlement was applied; required when entitlement_applied_at is set.';

COMMENT ON COLUMN public.plan_payments.metadata IS
  'Server-only audit bag. MUST NOT store: raw Stripe Event payloads, email, name, postal address, payment method details, tokens, or raw error objects.';

COMMENT ON COLUMN public.plan_payments.status IS
  'pending → checkout_created → paid/failed/expired; paid may become refunded/disputed after entitlement. failed/expired release promoted_credit_id reservation.';

COMMENT ON INDEX public.uq_plan_payments_promoted_credit_reserved IS
  'Pre-payment reservation: blocks a second pending/checkout_created row for the same promoted_credit_id; paid/refunded/disputed block reuse; failed/expired allow a new attempt.';

-- ---------------------------------------------------------------------------
-- RLS / grants — service_role only (matches promoted_request_payments pattern)
-- ---------------------------------------------------------------------------
ALTER TABLE public.plan_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.plan_payments FROM anon, authenticated;

GRANT ALL ON public.plan_payments TO service_role;

COMMIT;

-- ---------------------------------------------------------------------------
-- Rollback (manual, run only when table is empty or migration must be reverted)
-- ---------------------------------------------------------------------------
-- BEGIN;
-- DROP TABLE IF EXISTS public.plan_payments;
-- COMMIT;
