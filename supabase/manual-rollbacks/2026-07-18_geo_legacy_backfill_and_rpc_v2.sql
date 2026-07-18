-- =============================================================================
-- ROLLBACK: RPC only for 2026-07-18_geo_legacy_backfill_and_rpc_v2.sql
-- MANUAL — DO NOT apply unless rolling back the RPC portion of the rollout.
-- =============================================================================
-- Restores pre-v2 production search_specialists_local_radius
-- (same body as supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql).
--
-- IMPORTANT — data is NOT reverted:
--   Radius / city / coordinate backfill values are treated as normalized
--   production data after Option 2 remediation. This rollback does NOT set
--   service_radius_km, specialist_profiles.city, or lat/lng back to prior
--   null/invalid values.
-- Does NOT modify public.distance_km.
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
BEGIN
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
    AND d.dist <= p_radius_km
    AND (p_mode IS NULL OR s.work_format = p_mode)
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
    AND (
      p_lang IS NULL
      OR s.languages @> ARRAY[p_lang]::text[]
    )
  ORDER BY
    d.dist ASC,
    s.is_pro DESC,
    s.rating DESC NULLS LAST
  OFFSET COALESCE(p_offset, 0)
  LIMIT COALESCE(p_limit, 20);
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
'Production baseline restore after geo rollout rollback (RPC only; backfill data retained). Projection: s.is_pro, s.rating. Uses public.distance_km. SECURITY INVOKER.';

COMMIT;
