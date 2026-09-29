-- Phase 3A: record explicit client confirmation before capture.
--
-- Apply manually. Do not auto-run from CI. Do not apply from the app.
-- Do not edit 2026-09-29_service_request_claims.sql.
-- Do not edit 2026-09-29_service_request_payment_authorization.sql.
-- Those migrations are already applied.
--
-- This migration does not capture funds, create access grants, or open chat.

BEGIN;

ALTER TABLE public.service_request_claims
  ADD COLUMN IF NOT EXISTS client_confirmed_at timestamptz NULL;

COMMENT ON COLUMN public.service_request_claims.client_confirmed_at IS
  'The owning client explicitly confirmed that Freuly may connect this reserved specialist and capture the specialist authorized access fee. Audit timestamp only. No client identity.';

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
  v_client_user_id uuid;
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

  SELECT id, selected_specialist_id, client_user_id
  INTO v_request_id, v_selected, v_client_user_id
  FROM public.service_requests
  WHERE id = v_match.service_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_client_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
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
  'Atomically reserve one active match for an authenticated client and bind the server-selected service_request offer. Does not select the specialist, capture payment, or open a conversation.';

COMMIT;
