-- =============================================================================
-- ROLLBACK: restore production search_specialists_local_radius (pre-v2)
-- MANUAL — DO NOT apply unless rolling back v2.
-- Does NOT modify public.distance_km.
-- =============================================================================
--
-- Restores production projection from pg_get_functiondef (Supabase, 2026-07-18):
--   s.id, s.name, s.postal_code, s.lat, s.lng, s.work_format, s.category_id,
--   s.languages, s.is_pro, s.rating, distance_km(...) AS distance
-- No is_featured. No specialist_rating_stats join.
--
-- WHERE: is_active, is_visible, lat/lng NOT NULL, distance_km <= p_radius_km
-- optional language + category
-- p_mode NULL → all work_format; p_mode equality (incl. online)
-- ORDER BY distance ASC, s.is_pro DESC, s.rating DESC NULLS LAST
-- (no s.id tie-breaker — production)
--
-- Baseline label: 2026-07-18_prod_search_local_radius+distance_km
-- Baseline hash:
--   30084e7337e800663ebfeb53bdf748d45a366e5f7e9ded5caa9c2b357781268d
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
'Production baseline restore (pre dual-radius v2). Projection: s.is_pro, s.rating. Captured 2026-07-18. Uses public.distance_km. SECURITY INVOKER.';

COMMIT;
