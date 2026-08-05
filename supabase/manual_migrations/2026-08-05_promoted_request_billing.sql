-- Phase 4A: promoted request €10 payments, persistent access grants, 7-day subscription credit.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

-- ---------------------------------------------------------------------------
-- promoted_request_payments — one row per Checkout attempt (status mutable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promoted_request_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_binding_id uuid NOT NULL
    REFERENCES public.service_request_promotion_signup_bindings (id) ON DELETE RESTRICT,
  promotion_id uuid NOT NULL
    REFERENCES public.service_request_promotions (id) ON DELETE RESTRICT,
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 1000,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id text NULL,
  stripe_payment_intent_id text NULL,
  stripe_charge_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  checkout_created_at timestamptz NULL,
  paid_at timestamptz NULL,
  failed_at timestamptz NULL,
  expired_at timestamptz NULL,
  refunded_at timestamptz NULL,
  disputed_at timestamptz NULL,
  CONSTRAINT promoted_request_payments_amount_cents_check CHECK (amount_cents = 1000),
  CONSTRAINT promoted_request_payments_currency_check CHECK (currency = 'eur'),
  CONSTRAINT promoted_request_payments_status_check CHECK (
    status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'disputed')
  ),
  CONSTRAINT promoted_request_payments_paid_states_require_paid_at CHECK (
    status NOT IN ('paid', 'refunded', 'disputed') OR paid_at IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_refunded_requires_refunded_at CHECK (
    status <> 'refunded' OR refunded_at IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_disputed_requires_disputed_at CHECK (
    status <> 'disputed' OR disputed_at IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_failed_requires_failed_at CHECK (
    status <> 'failed' OR failed_at IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_expired_requires_expired_at CHECK (
    status <> 'expired' OR expired_at IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_paid_requires_stripe_session CHECK (
    status <> 'paid' OR stripe_checkout_session_id IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_paid_requires_stripe_intent CHECK (
    status <> 'paid' OR stripe_payment_intent_id IS NOT NULL
  ),
  CONSTRAINT promoted_request_payments_stripe_checkout_session_id_unique
    UNIQUE (stripe_checkout_session_id),
  CONSTRAINT promoted_request_payments_stripe_payment_intent_id_unique
    UNIQUE (stripe_payment_intent_id),
  CONSTRAINT promoted_request_payments_stripe_charge_id_unique
    UNIQUE (stripe_charge_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_promoted_request_payments_one_paid_per_pair
  ON public.promoted_request_payments (specialist_id, promotion_id)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_promoted_request_payments_specialist_promotion_created
  ON public.promoted_request_payments (specialist_id, promotion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoted_request_payments_status_created
  ON public.promoted_request_payments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoted_request_payments_signup_binding_created
  ON public.promoted_request_payments (signup_binding_id, created_at DESC);

COMMENT ON TABLE public.promoted_request_payments IS
  'One row per €10 promoted-request Checkout attempt. Status is mutable; identity, amount, currency and acquisition context are immutable after insert. Amount/currency are server-authoritative — not an invoice ledger and not client contacts or raw request description. Runtime resolves signup_binding for the authenticated specialist and copies promotion_id, specialist_id and user_id server-side; client must not supply internal IDs. Stripe metadata should contain only payment id and minimal internal IDs. DB FK/CHECK cannot prove binding.specialist_id/promotion_id or specialists.user_id match payment columns — runtime must enforce consistency. Webhook idempotency uses existing public.billing_events.';

COMMENT ON COLUMN public.promoted_request_payments.signup_binding_id IS
  'Acquisition anchor from service_request_promotion_signup_bindings; not UNIQUE — retries may create multiple attempts.';

COMMENT ON COLUMN public.promoted_request_payments.promotion_id IS
  'Denormalized promotion reference copied server-side from binding; never accept from client.';

COMMENT ON COLUMN public.promoted_request_payments.specialist_id IS
  'Paying specialist; copied server-side from authenticated context and binding.';

COMMENT ON COLUMN public.promoted_request_payments.user_id IS
  'Auth user at payment time; matches specialists.user_id pattern — no FK to auth.users.';

COMMENT ON COLUMN public.promoted_request_payments.amount_cents IS
  'Fixed €10 access price (1000 cents EUR); server-authoritative only.';

COMMENT ON COLUMN public.promoted_request_payments.status IS
  'pending → paid/failed/expired; paid may become refunded/disputed. Abandoned Checkout becomes expired, not cancelled.';

COMMENT ON COLUMN public.promoted_request_payments.stripe_checkout_session_id IS
  'Stripe Checkout Session id; required when status=paid; UNIQUE when present.';

COMMENT ON COLUMN public.promoted_request_payments.paid_at IS
  'Set by webhook-confirmed payment only — success redirect is not proof of payment.';

-- ---------------------------------------------------------------------------
-- promoted_request_access_grants — persistent per-specialist/per-promotion access
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promoted_request_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE RESTRICT,
  promotion_id uuid NOT NULL
    REFERENCES public.service_request_promotions (id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_payment_id uuid NULL
    REFERENCES public.promoted_request_payments (id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  revoke_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promoted_request_access_grants_specialist_promotion_unique
    UNIQUE (specialist_id, promotion_id),
  CONSTRAINT promoted_request_access_grants_source_type_check CHECK (
    source_type IN ('payment', 'subscription')
  ),
  CONSTRAINT promoted_request_access_grants_payment_requires_source_payment CHECK (
    source_type <> 'payment' OR source_payment_id IS NOT NULL
  ),
  CONSTRAINT promoted_request_access_grants_subscription_no_source_payment CHECK (
    source_type <> 'subscription' OR source_payment_id IS NULL
  ),
  CONSTRAINT promoted_request_access_grants_active_no_revoke_reason CHECK (
    revoked_at IS NOT NULL OR revoke_reason IS NULL
  ),
  CONSTRAINT promoted_request_access_grants_revoked_requires_reason CHECK (
    revoked_at IS NULL OR length(trim(revoke_reason)) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_promoted_request_access_grants_promotion_granted
  ON public.promoted_request_access_grants (promotion_id, granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoted_request_access_grants_active_pair
  ON public.promoted_request_access_grants (specialist_id, promotion_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.promoted_request_access_grants IS
  'Persistent per-specialist/per-promotion entitlement to open a specific promoted request. Payment source: created only after webhook-confirmed €10 payment; refund/dispute sets revoked_at and revoke_reason without deleting the row. Subscription source: may grant access to an active paid specialist without €10; no source_payment_id; subscription end does not remove an already granted row. Does not store client contacts, service_request_id or public tokens.';

COMMENT ON COLUMN public.promoted_request_access_grants.source_type IS
  'payment = €10 webhook grant; subscription = active-plan entitlement without separate payment row.';

COMMENT ON COLUMN public.promoted_request_access_grants.source_payment_id IS
  'Required for source_type=payment; NULL for subscription source.';

COMMENT ON COLUMN public.promoted_request_access_grants.revoked_at IS
  'Set on refund/dispute for payment-sourced grants; row remains for audit.';

-- ---------------------------------------------------------------------------
-- promoted_request_subscription_credits — one-time €10 credit toward first plan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promoted_request_subscription_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE RESTRICT,
  source_payment_id uuid NOT NULL
    REFERENCES public.promoted_request_payments (id) ON DELETE RESTRICT,
  credit_cents integer NOT NULL DEFAULT 1000,
  currency text NOT NULL DEFAULT 'eur',
  eligible_until timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  consumed_checkout_session_id text NULL,
  consumed_plan_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promoted_request_subscription_credits_source_payment_id_unique
    UNIQUE (source_payment_id),
  CONSTRAINT promoted_request_subscription_credits_specialist_id_unique
    UNIQUE (specialist_id),
  CONSTRAINT promoted_request_subscription_credits_consumed_checkout_session_id_unique
    UNIQUE (consumed_checkout_session_id),
  CONSTRAINT promoted_request_subscription_credits_credit_cents_check CHECK (credit_cents = 1000),
  CONSTRAINT promoted_request_subscription_credits_currency_check CHECK (currency = 'eur'),
  CONSTRAINT promoted_request_subscription_credits_eligible_until_after_created CHECK (
    eligible_until > created_at
  ),
  CONSTRAINT promoted_request_subscription_credits_consumed_plan_code_check CHECK (
    consumed_plan_code IS NULL OR consumed_plan_code IN ('basic', 'premium')
  ),
  CONSTRAINT promoted_request_subscription_credits_unconsumed_fields_null CHECK (
    consumed_at IS NOT NULL
    OR (
      consumed_checkout_session_id IS NULL
      AND consumed_plan_code IS NULL
    )
  ),
  CONSTRAINT promoted_request_subscription_credits_consumed_fields_required CHECK (
    consumed_at IS NULL
    OR (
      consumed_checkout_session_id IS NOT NULL
      AND consumed_plan_code IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_promoted_request_subscription_credits_specialist_eligible
  ON public.promoted_request_subscription_credits (specialist_id, eligible_until DESC);

CREATE INDEX IF NOT EXISTS idx_promoted_request_subscription_credits_available_eligible
  ON public.promoted_request_subscription_credits (eligible_until)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.promoted_request_subscription_credits IS
  'One-time €10 acquisition credit toward first basic/premium subscription checkout within 7 days of paid_at (eligible_until set by runtime as paid_at + interval ''7 days'' — no DB default). Not cash, referral balance, wallet or multi-use coupon. Created after first successful €10 payment only. consumed_at set only after webhook-confirmed subscription checkout — success redirect does not consume credit. After eligible_until the row remains but is not eligible; no separate expired status. Refund/dispute on source payment makes credit ineligible at runtime if not yet consumed.';

COMMENT ON COLUMN public.promoted_request_subscription_credits.eligible_until IS
  'Runtime sets to source payment paid_at + 7 days; must be > created_at.';

COMMENT ON COLUMN public.promoted_request_subscription_credits.consumed_checkout_session_id IS
  'Stripe subscription Checkout Session id at consumption; UNIQUE when present.';

COMMENT ON COLUMN public.promoted_request_subscription_credits.consumed_plan_code IS
  'basic or premium internal plan code consumed against; required when consumed_at is set.';

-- ---------------------------------------------------------------------------
-- RLS / grants — service_role only (no policies)
-- ---------------------------------------------------------------------------
ALTER TABLE public.promoted_request_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoted_request_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoted_request_subscription_credits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.promoted_request_payments FROM anon, authenticated;
REVOKE ALL ON public.promoted_request_access_grants FROM anon, authenticated;
REVOKE ALL ON public.promoted_request_subscription_credits FROM anon, authenticated;

GRANT ALL ON public.promoted_request_payments TO service_role;
GRANT ALL ON public.promoted_request_access_grants TO service_role;
GRANT ALL ON public.promoted_request_subscription_credits TO service_role;

COMMIT;
