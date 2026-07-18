-- =============================================================================
-- Freuly geography: search_specialists_local_radius v2 (DUAL RADIUS)
-- MANUAL migration — DO NOT apply to staging/production without approval.
-- This file is prepared only. Agent must not execute it against Supabase.
-- =============================================================================
--
-- Production baseline (captured 2026-07-18; pg_get_functiondef from Supabase):
--   public.search_specialists_local_radius(
--     p_ref_lat double precision,
--     p_ref_lng double precision,
--     p_radius_km double precision,
--     p_lang text DEFAULT NULL,
--     p_category_id uuid DEFAULT NULL,
--     p_mode text DEFAULT NULL,
--     p_offset integer DEFAULT 0,
--     p_limit integer DEFAULT 20
--   )
--   RETURNS TABLE(
--     id uuid, name text, postal_code text, lat double precision, lng double precision,
--     work_format text, category_id uuid, languages text[], is_pro boolean,
--     rating numeric, distance double precision
--   )
--   LANGUAGE plpgsql, SECURITY INVOKER, owner postgres, VOLATILE
--   EXECUTE: PUBLIC, anon, authenticated, service_role
--   Production SELECT projection (exact):
--     s.id, s.name, s.postal_code, s.lat, s.lng, s.work_format, s.category_id,
--     s.languages, s.is_pro, s.rating, distance_km(...) AS distance
--   Production ranking: distance ASC, s.is_pro DESC, s.rating DESC NULLS LAST
--   Old WHERE: is_active/is_visible, lat/lng NOT NULL, distance_km <= p_radius_km,
--              optional lang/category; p_mode NULL = all formats;
--              p_mode='online' = online only
--
-- Baseline hash (canonical contract + distance_km body, sha256):
--   30084e7337e800663ebfeb53bdf748d45a366e5f7e9ded5caa9c2b357781268d
--   (label: 2026-07-18_prod_search_local_radius+distance_km)
--
-- Dependency: public.distance_km(lat1,lng1,lat2,lng2) — DO NOT ALTER in this migration.
-- Note: production distance_km uses acos without clamp; floating-point edge cases
--       near antipodes may yield NaN. Propose a separate clamp change if needed.
--
-- Projection (MUST match production pg_get_functiondef — do not remap):
--   is_pro ← specialists.is_pro
--   rating ← specialists.rating
--   No join to specialist_rating_stats. No is_featured aliasing.
--
-- v2 changes (local-search geography only):
--   - work_format restricted by p_mode (see below); online never returned
--   - dual radius: distance <= p_radius_km AND distance <= service_radius_km
--   - service_radius_km IN (5,10,25,50,100); null/invalid radius excluded
--   - reject null / (0,0) / lat∉[-90,90] / lng∉[-180,180] on specialist rows
--   - reject invalid / (0,0) reference coords with empty set (no exception)
--   - reject non-finite distance (NaN from acos drift) via dist = dist
--   - ranking: production order + s.id ASC tie-breaker
--   - distance via CROSS JOIN LATERAL → single SQL column d.dist reused in
--     SELECT/WHERE/ORDER BY (avoids writing three call sites). Planner may still
--     inline IMMUTABLE public.distance_km; do not claim a hard physical single
--     evaluation. No MATERIALIZED CTE.
--
-- p_mode (case-sensitive text equality; no lower()):
--   NULL / 'local' → offline + hybrid
--   'offline'      → offline only
--   'hybrid'       → hybrid only
--   'online'       → empty set (early RETURN; no exception)
--   other / mixed case ('Online', 'LOCAL') → empty set
--
-- Pagination (v2 internal normalize; API defaults unchanged):
--   p_offset NULL     → 0
--   p_offset negative → 0
--   p_limit NULL      → 20
--   p_limit <= 0      → 0 rows (LIMIT 0)
--   p_limit large     → no upper cap (same as production)
--   Production (pre-v2) used OFFSET COALESCE(p_offset,0) / LIMIT COALESCE(p_limit,20)
--   without clamping negatives (negative OFFSET is an error in Postgres).
--
-- Rollout risk: any external caller using p_mode='online' on this RPC will get []
-- instead of online rows. In-repo caller always passes p_mode=null
-- (lib/search/specialistSearch.ts). Online search uses a separate table query.
--
-- Rollback: supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql
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

  -- Safe empty for online / unknown modes (no exception → no PostgREST 500).
  -- Comparisons are case-sensitive: 'Online' / 'LOCAL' are unknown → empty.
  IF p_mode IS NOT NULL AND p_mode NOT IN ('offline', 'hybrid', 'local') THEN
    RETURN;
  END IF;

  -- Invalid reference point → empty (do not call distance_km with bad inputs).
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
    AND s.service_radius_km IN (5, 10, 25, 50, 100)
    AND d.dist IS NOT NULL
    AND d.dist = d.dist -- exclude NaN (NaN is not equal to itself)
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
'v2 dual-radius local search (2026-07-18). Baseline: 2026-07-18_prod_search_local_radius+distance_km. Projection: s.is_pro, s.rating (production). Offline/hybrid only; dual radius allowlist; online → empty. Uses public.distance_km unchanged. SECURITY INVOKER. Rollback: supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql';

-- Verification (read-only; does not apply data changes)
SELECT
  n.nspname AS schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS result_type,
  l.lanname AS language,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

SELECT
  r.grantee,
  r.privilege_type
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'search_specialists_local_radius'
ORDER BY r.grantee, r.privilege_type;

COMMIT;

-- =============================================================================
-- ROLLBACK (do not run with this migration). Full SQL:
--   supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql
-- =============================================================================
