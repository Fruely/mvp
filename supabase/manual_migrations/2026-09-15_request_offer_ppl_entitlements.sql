-- Lead Engine Phase 1: server-only persistence for future request-offer PPL payments
-- and webhook-confirmed access grants.
--
-- IMPORTANT:
-- - Manual migration record only. Apply through the normal Supabase production process.
-- - This migration does NOT create Stripe Checkout, enable direct PPL UI, expose client PII,
--   or change current subscription unlock behavior.
-- - Runtime may read these tables before checkout activation; absence/error must fail closed.

BEGIN;

CREATE TABLE IF NOT EXISTS public.request_offer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL
    REFERENCES public.request_offers(id) ON DELETE RESTRICT,
  specialist_id uuid NOT NULL
    REFERENCES public.specialists(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL,
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

  CONSTRAINT request_offer_payments_amount_positive_check CHECK (amount_cents > 0),
  CONSTRAINT request_offer_payments_currency_check CHECK (currency = 'eur'),
  CONSTRAINT request_offer_payments_status_check CHECK (
    status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'disputed')
  ),
  CONSTRAINT request_offer_payments_paid_states_require_paid_at CHECK (
    status NOT IN ('paid', 'refunded', 'disputed') OR paid_at IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_refunded_requires_timestamp CHECK (
    status <> 'refunded' OR refunded_at IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_disputed_requires_timestamp CHECK (
    status <> 'disputed' OR disputed_at IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_failed_requires_timestamp CHECK (
    status <> 'failed' OR failed_at IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_expired_requires_timestamp CHECK (
    status <> 'expired' OR expired_at IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_paid_requires_stripe_session CHECK (
    status <> 'paid' OR stripe_checkout_session_id IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_paid_requires_stripe_intent CHECK (
    status <> 'paid' OR stripe_payment_intent_id IS NOT NULL
  ),
  CONSTRAINT request_offer_payments_stripe_checkout_session_id_unique
    UNIQUE (stripe_checkout_session_id),
  CONSTRAINT request_offer_payments_stripe_payment_intent_id_unique
    UNIQUE (stripe_payment_intent_id),
  CONSTRAINT request_offer_payments_stripe_charge_id_unique
    UNIQUE (stripe_charge_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_request_offer_payments_one_paid_per_offer_specialist
  ON public.request_offer_payments (offer_id, specialist_id)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_request_offer_payments_offer_specialist_created
  ON public.request_offer_payments (offer_id, specialist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_offer_payments_status_created
  ON public.request_offer_payments (status, created_at DESC);

COMMENT ON TABLE public.request_offer_payments IS
  'Future pay-per-lead Checkout attempts for request_offers. Server-authoritative amount/currency only. No client PII. Checkout creation and webhook fulfillment are intentionally not enabled by this migration.';

COMMENT ON COLUMN public.request_offer_payments.offer_id IS
  'Commercial offer being purchased. Runtime must verify offer.specialist_id matches specialist_id and that the authenticated user owns that specialist.';

COMMENT ON COLUMN public.request_offer_payments.amount_cents IS
  'Immutable server-authoritative offer price snapshot copied when a future Checkout attempt is created; never accept from browser/client.';

COMMENT ON COLUMN public.request_offer_payments.paid_at IS
  'Webhook-confirmed payment timestamp. Success redirect is never proof of payment.';

CREATE TABLE IF NOT EXISTS public.request_offer_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL
    REFERENCES public.request_offers(id) ON DELETE RESTRICT,
  specialist_id uuid NOT NULL
    REFERENCES public.specialists(id) ON DELETE RESTRICT,
  source_payment_id uuid NOT NULL
    REFERENCES public.request_offer_payments(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  revoke_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT request_offer_access_grants_offer_specialist_unique
    UNIQUE (offer_id, specialist_id),
  CONSTRAINT request_offer_access_grants_source_payment_unique
    UNIQUE (source_payment_id),
  CONSTRAINT request_offer_access_grants_active_no_revoke_reason CHECK (
    revoked_at IS NOT NULL OR revoke_reason IS NULL
  ),
  CONSTRAINT request_offer_access_grants_revoked_requires_reason CHECK (
    revoked_at IS NULL OR length(trim(revoke_reason)) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_request_offer_access_grants_active_pair
  ON public.request_offer_access_grants (offer_id, specialist_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.request_offer_access_grants IS
  'Persistent payment entitlement for one specialist to one request_offer. Created only after webhook-confirmed payment in a future activation step. Refund/dispute revokes without deleting the row. No client PII.';

COMMENT ON COLUMN public.request_offer_access_grants.source_payment_id IS
  'Webhook-confirmed request_offer_payments row that caused the grant. Runtime/webhook must verify payment.offer_id and specialist_id match this grant.';

ALTER TABLE public.request_offer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_offer_access_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.request_offer_payments FROM anon, authenticated;
REVOKE ALL ON public.request_offer_access_grants FROM anon, authenticated;

GRANT ALL ON public.request_offer_payments TO service_role;
GRANT ALL ON public.request_offer_access_grants TO service_role;

COMMIT;
