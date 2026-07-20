-- =============================================================================
-- Freuly geography: search_specialists_local_radius v2.1
-- Add product radius 30 km to dual-radius allowlist.
-- MANUAL migration — DO NOT apply to staging/production without approval.
-- =============================================================================
--
-- Parent: 2026-07-18_search_specialists_local_radius_v2.sql
-- Change only: service_radius_km IN (5, 10, 25, 30, 50, 100)
-- (adds 30 to match PUBLIC_SERVICE_RADII_KM / ALLOWED_SERVICE_RADII_KM in app)
--
-- Rollback: restore v2 allowlist without 30 via
--   supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql
--   or full production rollback under manual-rollbacks/.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.search_specialists_local_radius(
  p_ref_lat double precision,
  p_ref_lng double precision,
  p_radius_km double precision,
  p_lang text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  postal_code text,
  lat double precision,
  lng double precision,
  work_format text,
  category_id uuid,
  languages text[],
  is_pro boolean,
  rating numeric,
  distance double precision
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $function$
DECLARE
  v_offset integer;
  v_limit integer;
BEGIN
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  IF p_limit IS NULL THEN
    v_limit := 20;
  ELSIF p_limit <= 0 THEN
    v_limit := 0;
  ELSE
    v_limit := p_limit;
  END IF;

  IF p_mode IS NOT NULL AND p_mode NOT IN ('offline', 'hybrid', 'local') THEN
    RETURN;
  END IF;

  IF p_ref_lat IS NULL
     OR p_ref_lng IS NULL
     OR p_ref_lat < -90::double precision
     OR p_ref_lat > 90::double precision
     OR p_ref_lng < -180::double precision
     OR p_ref_lng > 180::double precision
     OR (p_ref_lat = 0::double precision AND p_ref_lng = 0::double precision)
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.postal_code,
    s.lat,
    s.lng,
    s.work_format,
    s.category_id,
    s.languages,
    s.is_pro,
    s.rating,
    d.dist AS distance
  FROM public.specialists s
  CROSS JOIN LATERAL (
    SELECT public.distance_km(p_ref_lat, p_ref_lng, s.lat, s.lng) AS dist
  ) d
  WHERE s.is_active IS TRUE
    AND s.is_visible IS TRUE
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND s.lat >= -90::double precision
    AND s.lat <= 90::double precision
    AND s.lng >= -180::double precision
    AND s.lng <= 180::double precision
    AND NOT (s.lat = 0::double precision AND s.lng = 0::double precision)
    AND (
      ((p_mode IS NULL OR p_mode = 'local') AND s.work_format IN ('offline', 'hybrid'))
      OR (p_mode = 'offline' AND s.work_format = 'offline')
      OR (p_mode = 'hybrid' AND s.work_format = 'hybrid')
    )
    AND s.service_radius_km IN (5, 10, 25, 30, 50, 100)
    AND d.dist IS NOT NULL
    AND d.dist = d.dist
    AND d.dist <= p_radius_km
    AND d.dist <= s.service_radius_km::double precision
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
    AND (
      p_lang IS NULL
      OR s.languages @> ARRAY[p_lang]::text[]
    )
  ORDER BY
    d.dist ASC,
    s.is_pro DESC,
    s.rating DESC NULLS LAST,
    s.id ASC
  OFFSET v_offset
  LIMIT v_limit;
END;
$function$;

ALTER FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) IS
'v2.1 dual-radius local search (2026-07-20). Allowlist includes 30 km. Parent v2 2026-07-18. Projection unchanged. SECURITY INVOKER.';

COMMIT;
