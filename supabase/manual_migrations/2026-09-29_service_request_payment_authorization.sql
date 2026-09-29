-- Phase 2: bind a service-request claim to its commercial offer and
-- extend request_offer_payments for manual-capture authorization.
--
-- Apply manually. Do not auto-run from CI. Do not apply from the app.
-- Do not edit 2026-09-29_service_request_claims.sql; that migration is already applied.
--
-- Additive and backward-compatible with existing direct_lead Checkout rows:
-- new columns are nullable, new statuses are unused by those rows, and a paid
-- Checkout row still has its Stripe session and payment intent.
--
-- This migration does not capture funds, create access grants, or open chat.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.service_request_claims') IS NULL
     OR to_regclass('public.request_offers') IS NULL
     OR to_regclass('public.request_offer_payments') IS NULL THEN
    RAISE EXCEPTION 'service_request_claims, request_offers, and request_offer_payments must exist';
  END IF;
END $$;

ALTER TABLE public.service_request_claims
  ADD COLUMN IF NOT EXISTS request_offer_id uuid NULL
    REFERENCES public.request_offers (id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.service_request_claims.request_offer_id IS
  'Server-selected service_request offer bound at reservation. Null only for a pre-offer foundation row.';

ALTER TABLE public.request_offer_payments
  ADD COLUMN IF NOT EXISTS service_request_claim_id uuid NULL
    REFERENCES public.service_request_claims (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS released_at timestamptz NULL;

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_status_check;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_status_check CHECK (
    status IN (
      'pending',
      'paid',
      'failed',
      'expired',
      'refunded',
      'disputed',
      'authorized',
      'released'
    )
  );

-- Direct-lead Checkout paid rows keep stripe_checkout_session_id.
-- A paid service-request PaymentIntent row is identified by its claim instead.
ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_paid_requires_stripe_session;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_paid_requires_stripe_session CHECK (
    status <> 'paid'
    OR stripe_checkout_session_id IS NOT NULL
    OR service_request_claim_id IS NOT NULL
  );

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_authorized_requires_capture;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_authorized_requires_capture CHECK (
    status <> 'authorized'
    OR (
      service_request_claim_id IS NOT NULL
      AND stripe_payment_intent_id IS NOT NULL
      AND authorized_at IS NOT NULL
    )
  );

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_released_requires_claim;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_released_requires_claim CHECK (
    status <> 'released'
    OR (
      service_request_claim_id IS NOT NULL
      AND released_at IS NOT NULL
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_request_offer_payments_one_active_claim
  ON public.request_offer_payments (service_request_claim_id)
  WHERE service_request_claim_id IS NOT NULL
    AND status IN ('pending', 'authorized', 'paid');

COMMENT ON COLUMN public.request_offer_payments.service_request_claim_id IS
  'Service-request authorization attempt. Null for direct-lead Checkout rows. No client PII.';

-- One canonical reservation writer. The applied Phase 1 function is (uuid, uuid).
DROP FUNCTION IF EXISTS public.reserve_service_request_claim(uuid, uuid);

CREATE OR REPLACE FUNCTION public.reserve_service_request_claim(
  p_match_id uuid,
  p_specialist_id uuid,
  p_request_offer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.service_request_matches%ROWTYPE;
  v_request_id uuid;
  v_selected uuid;
  v_existing public.service_request_claims%ROWTYPE;
  v_offer public.request_offers%ROWTYPE;
  v_claim_id uuid;
BEGIN
  SELECT * INTO v_match
  FROM public.service_request_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_match.specialist_id IS DISTINCT FROM p_specialist_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT id, selected_specialist_id
  INTO v_request_id, v_selected
  FROM public.service_requests
  WHERE id = v_match.service_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_existing
  FROM public.service_request_claims
  WHERE service_request_id = v_request_id
    AND status IN ('reserved', 'completed')
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status = 'reserved'
       AND v_existing.match_id = p_match_id
       AND v_existing.specialist_id = p_specialist_id THEN
      IF p_request_offer_id IS NULL
         OR v_existing.request_offer_id IS DISTINCT FROM p_request_offer_id THEN
        RETURN jsonb_build_object('ok', false, 'error', 'offer_unavailable');
      END IF;
      RETURN jsonb_build_object(
        'ok', true,
        'claim_id', v_existing.id,
        'changed', false
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  IF v_selected IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  IF v_match.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF p_request_offer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_unavailable');
  END IF;

  SELECT * INTO v_offer
  FROM public.request_offers
  WHERE id = p_request_offer_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_offer.request_kind IS DISTINCT FROM 'service_request'
     OR v_offer.service_request_id IS DISTINCT FROM v_request_id
     OR v_offer.specialist_id IS DISTINCT FROM p_specialist_id
     OR v_offer.offer_reason IS DISTINCT FROM 'matched'
     OR v_offer.billing_model IS DISTINCT FROM 'pay_per_lead'
     OR v_offer.status NOT IN ('offered', 'viewed', 'accepted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_unavailable');
  END IF;

  INSERT INTO public.service_request_claims (
    service_request_id,
    match_id,
    specialist_id,
    request_offer_id,
    status
  ) VALUES (
    v_request_id,
    v_match.id,
    p_specialist_id,
    v_offer.id,
    'reserved'
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'ok', true,
    'claim_id', v_claim_id,
    'changed', true
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.service_request_claims
    WHERE service_request_id = v_request_id
      AND status IN ('reserved', 'completed')
    LIMIT 1;

    IF FOUND
       AND v_existing.status = 'reserved'
       AND v_existing.match_id = p_match_id
       AND v_existing.specialist_id = p_specialist_id THEN
      IF p_request_offer_id IS NULL
         OR v_existing.request_offer_id IS DISTINCT FROM p_request_offer_id THEN
        RETURN jsonb_build_object('ok', false, 'error', 'offer_unavailable');
      END IF;
      RETURN jsonb_build_object(
        'ok', true,
        'claim_id', v_existing.id,
        'changed', false
      );
    END IF;

    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_service_request_claim(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_service_request_claim(uuid, uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_service_request_claim(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.reserve_service_request_claim(uuid, uuid, uuid) IS
  'Atomically reserve one active match and bind the server-selected service_request offer. Does not select the specialist, capture payment, or open a conversation.';

COMMIT;

-- Verification, read-only, after apply:
-- SELECT to_regprocedure('public.reserve_service_request_claim(uuid,uuid)');
--   expected: null
-- SELECT to_regprocedure('public.reserve_service_request_claim(uuid,uuid,uuid)');
--   expected: not null
-- SELECT conname FROM pg_constraint
--  WHERE conrelid = 'public.request_offer_payments'::regclass
--    AND conname IN (
--      'request_offer_payments_paid_requires_stripe_intent',
--      'request_offer_payments_paid_requires_stripe_session',
--      'request_offer_payments_authorized_requires_capture',
--      'request_offer_payments_released_requires_claim'
--    );
-- SELECT indexdef FROM pg_indexes
--  WHERE indexname = 'uq_request_offer_payments_one_active_claim';
