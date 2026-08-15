-- Pre-registration €10 reservations for promoted requests (72h registration window).
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.promoted_request_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL
    REFERENCES public.service_request_promotions (id) ON DELETE RESTRICT,
  public_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment',
  stripe_checkout_session_id text NULL,
  stripe_payment_intent_id text NULL,
  stripe_charge_id text NULL,
  payer_email text NULL,
  amount_cents integer NOT NULL DEFAULT 1000,
  currency text NOT NULL DEFAULT 'eur',
  paid_at timestamptz NULL,
  registration_deadline timestamptz NULL,
  registration_completed_at timestamptz NULL,
  expired_at timestamptz NULL,
  user_id uuid NULL,
  specialist_id uuid NULL
    REFERENCES public.specialists (id) ON DELETE SET NULL,
  signup_binding_id uuid NULL
    REFERENCES public.service_request_promotion_signup_bindings (id) ON DELETE SET NULL,
  promoted_payment_id uuid NULL
    REFERENCES public.promoted_request_payments (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promoted_request_reservations_amount_cents_check CHECK (amount_cents = 1000),
  CONSTRAINT promoted_request_reservations_currency_check CHECK (currency = 'eur'),
  CONSTRAINT promoted_request_reservations_status_check CHECK (
    status IN (
      'pending_payment',
      'paid_pending_registration',
      'registration_completed',
      'expired',
      'refunded',
      'disputed'
    )
  ),
  CONSTRAINT promoted_request_reservations_stripe_checkout_session_id_unique
    UNIQUE (stripe_checkout_session_id),
  CONSTRAINT promoted_request_reservations_stripe_payment_intent_id_unique
    UNIQUE (stripe_payment_intent_id),
  CONSTRAINT promoted_request_reservations_stripe_charge_id_unique
    UNIQUE (stripe_charge_id),
  CONSTRAINT promoted_request_reservations_paid_requires_deadline CHECK (
    status <> 'paid_pending_registration'
    OR (paid_at IS NOT NULL AND registration_deadline IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_promoted_request_reservations_promotion_created
  ON public.promoted_request_reservations (promotion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoted_request_reservations_email_status
  ON public.promoted_request_reservations (lower(payer_email), status);

COMMENT ON TABLE public.promoted_request_reservations IS
  '€10 reservation before specialist registration from public promoted-request accept flow. Grant/credit deferred until qualifying registration within registration_deadline.';

ALTER TABLE public.promoted_request_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promoted_request_reservations FROM anon, authenticated;
GRANT ALL ON public.promoted_request_reservations TO service_role;

COMMIT;
