-- Founder badge: first 50 published specialists. Uses existing columns founder_badge, founder_assigned_at.
-- Published = is_active AND is_visible AND published_at IS NOT NULL.

-- -----------------------------------------------------------------------------
-- RPC: assign badge for current user’s specialist if pool not full (serializes via advisory lock)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_assign_founder_badge(p_specialist_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.specialists s
    WHERE s.id = p_specialist_id AND s.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(8842001);

  IF COALESCE(
    (SELECT founder_badge FROM public.specialists WHERE id = p_specialist_id),
    false
  ) THEN
    RETURN false;
  END IF;

  IF (
    SELECT COUNT(*)::int
    FROM public.specialists
    WHERE COALESCE(founder_badge, false) = true
  ) >= 50 THEN
    RETURN false;
  END IF;

  UPDATE public.specialists
  SET
    founder_badge = true,
    founder_assigned_at = now()
  WHERE id = p_specialist_id
    AND COALESCE(founder_badge, false) = false;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.try_assign_founder_badge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_assign_founder_badge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_assign_founder_badge(uuid) TO service_role;

COMMENT ON FUNCTION public.try_assign_founder_badge(uuid) IS
  'If caller owns specialist, founder pool < 50, and specialist has no badge yet, sets founder_badge.';

-- -----------------------------------------------------------------------------
-- One-time backfill: among published specialists (ordered by published_at, created_at, id),
-- ensure the first 50 slots have founder_badge (does not remove existing badges).
-- -----------------------------------------------------------------------------
UPDATE public.specialists s
SET
  founder_badge = true,
  founder_assigned_at = now()
WHERE s.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY published_at ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM public.specialists
    WHERE is_active = true
      AND is_visible = true
      AND published_at IS NOT NULL
  ) t
  WHERE t.rn <= 50
)
AND COALESCE(s.founder_badge, false) = false;
