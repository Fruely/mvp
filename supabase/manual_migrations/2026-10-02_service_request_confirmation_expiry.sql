-- Serialize confirmation-window expiry against client confirm and client reject.
-- Apply manually, after both:
--   2026-10-02_service_request_confirmation_deadline.sql
--   2026-10-02_service_request_client_rejection.sql
-- Apply this migration before deploying runtime that calls these functions.
-- Do not run from CI. Do not apply from the app.
-- Do not edit earlier service-request migrations. They are already applied.
--
-- No new claim status and no new table. The durable expiry decision is the
-- existing match status `expired`, stored while the claim is still `reserved`.
-- That status is generic. This begin function is the only writer that stores
-- it, and only for payment_rail = stripe. Webhook reconciliation must still
-- prove the rest of the canonical Stripe attempt.
-- Lock order matches reserve_service_request_claim: match, then request, then claim.
-- clock_timestamp() is the deadline authority. This migration does not cancel
-- a PaymentIntent, expire a claim, or rematch a request.
-- Store confirmation does not use confirmation_expires_at. Stripe confirmation does.

BEGIN;

CREATE OR REPLACE FUNCTION public.begin_service_request_confirmation_expiry(
  p_claim_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
  v_request_id uuid;
  v_match public.service_request_matches%ROWTYPE;
  v_selected uuid;
  v_claim public.service_request_claims%ROWTYPE;
BEGIN
  SELECT match_id, service_request_id
  INTO v_match_id, v_request_id
  FROM public.service_request_claims
  WHERE id = p_claim_id;

  IF NOT FOUND OR v_match_id IS NULL OR v_request_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_eligible');
  END IF;

  SELECT * INTO v_match
  FROM public.service_request_matches
  WHERE id = v_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_eligible');
  END IF;

  SELECT selected_specialist_id
  INTO v_selected
  FROM public.service_requests
  WHERE id = v_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_eligible');
  END IF;

  SELECT * INTO v_claim
  FROM public.service_request_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_claim.match_id IS DISTINCT FROM v_match.id
     OR v_claim.service_request_id IS DISTINCT FROM v_request_id
     OR v_claim.status IS DISTINCT FROM 'reserved'
     OR v_claim.client_confirmed_at IS NOT NULL
     OR v_claim.client_rejected_at IS NOT NULL
     OR v_claim.confirmation_expires_at IS NULL
     OR v_claim.confirmation_expires_at > clock_timestamp()
     OR v_claim.payment_rail IS DISTINCT FROM 'stripe'
     OR v_selected IS NOT NULL
     OR v_match.service_request_id IS DISTINCT FROM v_claim.service_request_id
     OR v_match.specialist_id IS DISTINCT FROM v_claim.specialist_id
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_eligible');
  END IF;

  IF v_match.status = 'expired' THEN
    RETURN jsonb_build_object('ok', true, 'state', 'started');
  END IF;

  IF v_match.status NOT IN ('active', 'interested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_eligible');
  END IF;

  UPDATE public.service_request_matches
  SET status = 'expired',
      updated_at = clock_timestamp()
  WHERE id = v_match.id
    AND status IN ('active', 'interested');

  IF NOT FOUND THEN
    SELECT status INTO v_match.status
    FROM public.service_request_matches
    WHERE id = v_match.id;
    IF v_match.status IS DISTINCT FROM 'expired' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_eligible');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'state', 'started');
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_service_request_client_decision(
  p_claim_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
  v_request_id uuid;
  v_match public.service_request_matches%ROWTYPE;
  v_claim public.service_request_claims%ROWTYPE;
  v_at timestamptz;
BEGIN
  IF p_decision NOT IN ('confirm', 'reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  SELECT match_id, service_request_id
  INTO v_match_id, v_request_id
  FROM public.service_request_claims
  WHERE id = p_claim_id;

  IF NOT FOUND OR v_match_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  SELECT * INTO v_match
  FROM public.service_request_matches
  WHERE id = v_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  PERFORM 1
  FROM public.service_requests
  WHERE id = v_request_id
  FOR UPDATE;

  SELECT * INTO v_claim
  FROM public.service_request_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_claim.status IS DISTINCT FROM 'reserved'
     OR v_claim.match_id IS DISTINCT FROM v_match.id
     OR v_match.service_request_id IS DISTINCT FROM v_claim.service_request_id
     OR v_match.specialist_id IS DISTINCT FROM v_claim.specialist_id
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF p_decision = 'confirm' AND v_claim.client_confirmed_at IS NOT NULL AND v_claim.client_rejected_at IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'at', v_claim.client_confirmed_at);
  END IF;

  IF p_decision = 'reject' AND v_claim.client_rejected_at IS NOT NULL AND v_claim.client_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'at', v_claim.client_rejected_at);
  END IF;

  IF v_claim.client_confirmed_at IS NOT NULL OR v_claim.client_rejected_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  -- Store confirmation is not a Stripe deadline. A null confirmation_expires_at
  -- must not block it, and an elapsed Stripe deadline must not time it out.
  IF p_decision = 'confirm' AND v_claim.payment_rail = 'store' THEN
    IF v_match.status NOT IN ('active', 'interested') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
    END IF;

    v_at := clock_timestamp();
    UPDATE public.service_request_claims
    SET client_confirmed_at = v_at,
        updated_at = v_at
    WHERE id = v_claim.id
      AND status = 'reserved'
      AND payment_rail = 'store'
      AND client_confirmed_at IS NULL
      AND client_rejected_at IS NULL;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
    END IF;
    RETURN jsonb_build_object('ok', true, 'at', v_at);
  END IF;

  IF p_decision = 'confirm' AND v_claim.payment_rail IS DISTINCT FROM 'stripe' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF p_decision = 'reject' AND v_claim.payment_rail = 'store' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF v_match.status = 'expired'
     OR (
       v_claim.confirmation_expires_at IS NOT NULL
       AND v_claim.confirmation_expires_at <= clock_timestamp()
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'confirmation_expired');
  END IF;

  IF p_decision = 'confirm' AND v_claim.confirmation_expires_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF v_match.status NOT IN ('active', 'interested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  v_at := clock_timestamp();

  IF p_decision = 'confirm' THEN
    UPDATE public.service_request_claims
    SET client_confirmed_at = v_at,
        updated_at = v_at
    WHERE id = v_claim.id
      AND status = 'reserved'
      AND payment_rail = 'stripe'
      AND client_confirmed_at IS NULL
      AND client_rejected_at IS NULL
      AND confirmation_expires_at IS NOT NULL
      AND confirmation_expires_at > v_at;
  ELSE
    UPDATE public.service_request_claims
    SET client_rejected_at = v_at,
        updated_at = v_at
    WHERE id = v_claim.id
      AND status = 'reserved'
      AND client_confirmed_at IS NULL
      AND client_rejected_at IS NULL
      AND (
        confirmation_expires_at IS NULL
        OR confirmation_expires_at > v_at
      );
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'confirmation_expired');
  END IF;

  RETURN jsonb_build_object('ok', true, 'at', v_at);
END;
$$;

REVOKE ALL ON FUNCTION public.begin_service_request_confirmation_expiry(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_service_request_confirmation_expiry(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_service_request_confirmation_expiry(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.apply_service_request_client_decision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_service_request_client_decision(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_service_request_client_decision(uuid, text) TO service_role;

COMMENT ON FUNCTION public.begin_service_request_confirmation_expiry(uuid) IS
  'Marks the reserved claim match expired once confirmation_expires_at has passed and neither client decision is stored. Leaves the claim reserved. Does not cancel Stripe, capture, or rematch.';

COMMENT ON FUNCTION public.apply_service_request_client_decision(uuid, text) IS
  'Stripe confirm requires payment_rail stripe and confirmation_expires_at later than clock_timestamp(). Store confirm does not read that deadline. Null or unknown rails are not confirmable. Reject stays off the store rail.';

COMMIT;
