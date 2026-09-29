-- Exclusive service-request claim reservation.
-- Apply manually, after 2026-09-26_client_selection.sql.
-- Do not auto-run from CI. Do not apply to production from the app.
--
-- This table records who holds the single live reservation for a request.
-- It does not store payment, offer price, or client identity.
-- Legacy TAKE (claimOwnMatch) does not write this table.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.service_requests') IS NULL
     OR to_regclass('public.service_request_matches') IS NULL
     OR to_regclass('public.specialists') IS NULL THEN
    RAISE EXCEPTION 'service_requests, service_request_matches, and specialists must exist before service_request_claims';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_request_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL
    REFERENCES public.service_requests (id) ON DELETE RESTRICT,
  match_id uuid NOT NULL
    REFERENCES public.service_request_matches (id) ON DELETE RESTRICT,
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'reserved',
  reserved_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  released_at timestamptz NULL,
  expired_at timestamptz NULL,
  failed_at timestamptz NULL,
  release_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_claims_status_check CHECK (
    status IN ('reserved', 'completed', 'released', 'expired', 'failed')
  ),
  CONSTRAINT service_request_claims_terminal_timestamps_check CHECK (
    (
      status = 'reserved'
      AND completed_at IS NULL
      AND released_at IS NULL
      AND expired_at IS NULL
      AND failed_at IS NULL
    )
    OR (
      status = 'completed'
      AND completed_at IS NOT NULL
      AND released_at IS NULL
      AND expired_at IS NULL
      AND failed_at IS NULL
    )
    OR (
      status = 'released'
      AND released_at IS NOT NULL
      AND completed_at IS NULL
      AND expired_at IS NULL
      AND failed_at IS NULL
    )
    OR (
      status = 'expired'
      AND expired_at IS NOT NULL
      AND completed_at IS NULL
      AND released_at IS NULL
      AND failed_at IS NULL
    )
    OR (
      status = 'failed'
      AND failed_at IS NOT NULL
      AND completed_at IS NULL
      AND released_at IS NULL
      AND expired_at IS NULL
    )
  ),
  CONSTRAINT service_request_claims_release_reason_check CHECK (
    release_reason IS NULL OR status IN ('released', 'expired', 'failed')
  )
);

-- One live or completed claim owns the request. Historical terminal rows do not.
CREATE UNIQUE INDEX IF NOT EXISTS service_request_claims_one_owner
  ON public.service_request_claims (service_request_id)
  WHERE status IN ('reserved', 'completed');

-- One live or completed claim owns the match.
CREATE UNIQUE INDEX IF NOT EXISTS service_request_claims_one_live_match
  ON public.service_request_claims (match_id)
  WHERE status IN ('reserved', 'completed');

COMMENT ON TABLE public.service_request_claims IS
  'Exclusive reservation for one service request. Not a payment, offer, or conversation. Server-only.';

ALTER TABLE public.service_request_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_request_claims FROM anon, authenticated;
GRANT ALL ON public.service_request_claims TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_service_request_claim(
  p_match_id uuid,
  p_specialist_id uuid
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

  INSERT INTO public.service_request_claims (
    service_request_id,
    match_id,
    specialist_id,
    status
  ) VALUES (
    v_request_id,
    v_match.id,
    p_specialist_id,
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
      RETURN jsonb_build_object(
        'ok', true,
        'claim_id', v_existing.id,
        'changed', false
      );
    END IF;

    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_service_request_claim(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_service_request_claim(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_service_request_claim(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.reserve_service_request_claim(uuid, uuid) IS
  'Atomically reserve one active match. Does not select the specialist or open a conversation.';

COMMIT;
