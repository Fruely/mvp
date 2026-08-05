-- Phase 4E-A: Stripe subscription lifecycle table for idempotent webhook sync.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

-- ---------------------------------------------------------------------------
-- billing_subscriptions — provider-facing Stripe Subscription lifecycle
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text NOT NULL,
  provider_subscription_id text NOT NULL,
  provider_price_id text NOT NULL,
  plan_code text NOT NULL,
  status text NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamptz NULL,
  current_period_end timestamptz NULL,
  trial_start timestamptz NULL,
  trial_end timestamptz NULL,
  canceled_at timestamptz NULL,
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_provider_event_created_at timestamptz NULL,
  CONSTRAINT billing_subscriptions_provider_subscription_unique
    UNIQUE (provider, provider_subscription_id),
  CONSTRAINT billing_subscriptions_provider_check CHECK (provider = 'stripe'),
  CONSTRAINT billing_subscriptions_plan_code_check CHECK (plan_code IN ('basic', 'premium')),
  CONSTRAINT billing_subscriptions_status_check CHECK (
    status IN (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  CONSTRAINT billing_subscriptions_current_period_pair_check CHECK (
    (current_period_start IS NULL AND current_period_end IS NULL)
    OR (
      current_period_start IS NOT NULL
      AND current_period_end IS NOT NULL
      AND current_period_end > current_period_start
    )
  ),
  CONSTRAINT billing_subscriptions_trial_period_pair_check CHECK (
    (trial_start IS NULL AND trial_end IS NULL)
    OR (
      trial_start IS NOT NULL
      AND trial_end IS NOT NULL
      AND trial_end > trial_start
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_subscriptions_one_current_per_specialist
  ON public.billing_subscriptions (specialist_id)
  WHERE status IN (
    'incomplete',
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'paused'
  );

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_specialist_created
  ON public.billing_subscriptions (specialist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_provider_customer_created
  ON public.billing_subscriptions (provider_customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status_current_period_end
  ON public.billing_subscriptions (status, current_period_end);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_last_provider_event_created
  ON public.billing_subscriptions (last_provider_event_created_at DESC);

COMMENT ON TABLE public.billing_subscriptions IS
  'Provider-facing Stripe Subscription lifecycle source. One row per Stripe subscription id; status and period fields mirror Stripe lifecycle for idempotent webhook sync. public.specialist_plan remains the marketplace entitlement projection — Phase 4E-B webhook runtime will project confirmed paid access from billing_subscriptions into specialist_plan. Legacy specialist_plan.early_access is not paid proof. The 7-day profile publication period is a separate product mechanism (not stored here). The €10 promoted_request subscription credit is a separate billing entity. Not invoice/payment history, not promoted request access, not referral commissions, not PII, and not card/payment-method payloads. billing_events remains the per-event idempotency ledger; last_provider_event_created_at guards against out-of-order webhook delivery.';

COMMENT ON COLUMN public.billing_subscriptions.specialist_id IS
  'Freuly specialist owning this Stripe subscription. FK to public.specialists only — no FK to auth.users or billing_customers.';

COMMENT ON COLUMN public.billing_subscriptions.provider_customer_id IS
  'Stripe Customer id (cus_…). Text reference only — resolved via billing_customers at runtime; no FK to billing_customers.';

COMMENT ON COLUMN public.billing_subscriptions.provider_subscription_id IS
  'Stripe Subscription id (sub_…). UNIQUE with provider for idempotent upsert from webhooks.';

COMMENT ON COLUMN public.billing_subscriptions.provider_price_id IS
  'Stripe Price id (price_…) for the subscribed Freuly Professional (basic) or Growth (premium) plan.';

COMMENT ON COLUMN public.billing_subscriptions.plan_code IS
  'Internal marketplace plan code: basic (Professional) or premium (Growth) only. Not starter, free, or early_access.';

COMMENT ON COLUMN public.billing_subscriptions.status IS
  'Stripe subscription lifecycle status. trialing is stored as provider lifecycle only — Phase 4E-B defines when specialist_plan may treat it as paid entitlement.';

COMMENT ON COLUMN public.billing_subscriptions.current_period_end IS
  'Stripe current billing period end. Pair with current_period_start; both NULL or both set with end > start.';

COMMENT ON COLUMN public.billing_subscriptions.last_provider_event_created_at IS
  'Stripe event.created timestamp of the last applied lifecycle update. Older out-of-order events must not overwrite newer state; billing_events handles per-event idempotency separately.';

-- ---------------------------------------------------------------------------
-- RLS / grants — service_role only (no policies)
-- ---------------------------------------------------------------------------
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_subscriptions FROM anon, authenticated;

GRANT ALL ON public.billing_subscriptions TO service_role;

COMMIT;
