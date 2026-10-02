-- MP1-S4 — Just-in-time Commercial Connection.
-- Server-owned persistence for one specialist pursuing one concrete matched request.
-- Manual migration record only. Apply through the normal Supabase production process.
--
-- This migration is additive. It does NOT:
-- - activate Stripe charging,
-- - expose client contact PII,
-- - create conversations,
-- - change specialist onboarding,
-- - alter legacy request_offer payment semantics.
--
-- Canonical contract:
-- Fruely/freuly-native docs/SDD-MP1-S4-COMMERCIAL-CONNECTION.md

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.service_request_matches') IS NULL
     OR to_regclass('public.service_requests') IS NULL
     OR to_regclass('public.specialists') IS NULL
     OR to_regclass('public.conversations') IS NULL THEN
    RAISE EXCEPTION 'Apply matching and client-selection migrations before MP1-S4 connection attempts';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connection_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id uuid NOT NULL REFERENCES public.service_request_matches(id) ON DELETE RESTRICT,
  service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE RESTRICT,
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE RESTRICT,

  -- Verified request owner copied as an authorization/audit fact. No contact PII is stored here.
  client_user_id uuid NOT NULL,

  -- MP1-S4 commercial snapshot. The client never supplies these values.
  amount_cents integer NOT NULL DEFAULT 2500,
  currency text NOT NULL DEFAULT 'eur',

  status text NOT NULL DEFAULT 'payment_required',

  -- Explicit specialist acceptance of the fee rules for this attempt.
  fee_rules_version text NOT NULL,
  fee_rules_accepted_at timestamptz NOT NULL,

  -- Existing billing_customers owns the durable specialist -> Stripe Customer mapping.
  -- These provider refs are attempt-local reconciliation anchors.
  stripe_customer_id text NULL,
  stripe_payment_intent_id text NULL,

  -- Provider authorization expiry is recorded when Stripe exposes it.
  authorization_expires_at timestamptz NULL,

  -- Set by the server after a valid authorization using configured policy.
  confirmation_expires_at timestamptz NULL,

  authorized_at timestamptz NULL,
  client_confirmed_at timestamptz NULL,
  client_declined_at timestamptz NULL,
  captured_at timestamptz NULL,
  released_at timestamptz NULL,
  failed_at timestamptz NULL,

  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connection_attempts_fee_amount_check CHECK (amount_cents = 2500),
  CONSTRAINT connection_attempts_currency_check CHECK (currency = 'eur'),
  CONSTRAINT connection_attempts_fee_rules_version_check
    CHECK (length(trim(fee_rules_version)) > 0),

  CONSTRAINT connection_attempts_status_check CHECK (
    status IN (
      'payment_required',
      'authorizing',
      'authorized',
      'client_confirmed',
      'capturing',
      'connected',
      'declined',
      'expired',
      'failed'
    )
  ),

  CONSTRAINT connection_attempts_authorized_state_check CHECK (
    status NOT IN (
      'authorized',
      'client_confirmed',
      'capturing',
      'connected',
      'declined',
      'expired'
    )
    OR (
      authorized_at IS NOT NULL
      AND stripe_payment_intent_id IS NOT NULL
      AND confirmation_expires_at IS NOT NULL
    )
  ),

  CONSTRAINT connection_attempts_client_confirmed_state_check CHECK (
    status NOT IN ('client_confirmed', 'capturing', 'connected')
    OR client_confirmed_at IS NOT NULL
  ),

  CONSTRAINT connection_attempts_declined_state_check CHECK (
    status <> 'declined'
    OR (
      client_declined_at IS NOT NULL
      AND released_at IS NOT NULL
    )
  ),

  CONSTRAINT connection_attempts_expired_state_check CHECK (
    status <> 'expired'
    OR released_at IS NOT NULL
  ),

  CONSTRAINT connection_attempts_connected_state_check CHECK (
    status <> 'connected'
    OR (
      captured_at IS NOT NULL
      AND conversation_id IS NOT NULL
    )
  ),

  CONSTRAINT connection_attempts_failed_state_check CHECK (
    status <> 'failed' OR failed_at IS NOT NULL
  ),

  CONSTRAINT connection_attempts_conversation_unique UNIQUE (conversation_id),
  CONSTRAINT connection_attempts_stripe_payment_intent_unique UNIQUE (stripe_payment_intent_id)
);

-- One live commercial attempt for one specialist/match. A terminal row does not
-- prevent a later server-authorized retry, while retries of the same live attempt
-- resolve to the existing row.
CREATE UNIQUE INDEX IF NOT EXISTS connection_attempts_one_live_match
  ON public.connection_attempts (match_id, specialist_id)
  WHERE status IN (
    'payment_required',
    'authorizing',
    'authorized',
    'client_confirmed',
    'capturing'
  );

-- A service request can result in at most one successfully connected specialist.
CREATE UNIQUE INDEX IF NOT EXISTS connection_attempts_one_connected_request
  ON public.connection_attempts (service_request_id)
  WHERE status = 'connected';

CREATE INDEX IF NOT EXISTS idx_connection_attempts_specialist_created
  ON public.connection_attempts (specialist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_attempts_client_created
  ON public.connection_attempts (client_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connection_attempts_confirmation_expiry
  ON public.connection_attempts (confirmation_expires_at)
  WHERE status = 'authorized';

COMMENT ON TABLE public.connection_attempts IS
  'MP1-S4 server-owned commercial connection attempt. No client contact PII. Authorization precedes client confirmation; capture precedes conversation access.';

COMMENT ON COLUMN public.connection_attempts.client_user_id IS
  'Verified owner of the service request at attempt creation. Authorization fact only; not client contact information.';

COMMENT ON COLUMN public.connection_attempts.amount_cents IS
  'Server-authoritative Freuly connection fee snapshot. MP1-S4 is fixed at EUR 25.00.';

COMMENT ON COLUMN public.connection_attempts.confirmation_expires_at IS
  'Server-calculated client decision deadline. Native/Web must not calculate or hardcode this duration.';

ALTER TABLE public.connection_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.connection_attempts FROM anon, authenticated;
GRANT ALL ON public.connection_attempts TO service_role;

COMMIT;
