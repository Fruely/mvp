-- =============================================================================
-- READ ONLY. SELECT only.
-- Pre-apply checklist for search_specialists_local_radius v2.
-- Safe for Supabase SQL Editor. No CREATE/ALTER/UPDATE/temp writes.
-- =============================================================================
-- Expected baseline label: 2026-07-18_prod_search_local_radius+distance_km
-- Expected baseline hash:
--   30084e7337e800663ebfeb53bdf748d45a366e5f7e9ded5caa9c2b357781268d
-- BLOCKER if current function_definition does not match archived production
-- projection (s.is_pro, s.rating) / signature before apply.
-- =============================================================================

-- 1) Current production RPC definition
SELECT
  p.oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_arguments(p.oid) AS full_arguments,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_functiondef(p.oid) AS function_definition,
  l.lanname AS language,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY p.oid;

-- 2) Normalized baseline markers (manual compare to archived dump)
SELECT
  (pg_get_functiondef(p.oid) LIKE '%s.is_pro%') AS has_s_is_pro,
  (pg_get_functiondef(p.oid) LIKE '%s.rating%') AS has_s_rating,
  (pg_get_functiondef(p.oid) LIKE '%is_featured%') AS has_is_featured_remap,
  (pg_get_functiondef(p.oid) LIKE '%specialist_rating_stats%') AS has_rating_stats_join,
  (pg_get_functiondef(p.oid) LIKE '%distance_km%') AS uses_distance_km,
  md5(pg_get_functiondef(p.oid)) AS functiondef_md5
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

-- 3) public.distance_km present + definition
SELECT
  p.oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_functiondef(p.oid) AS function_definition,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  md5(pg_get_functiondef(p.oid)) AS functiondef_md5
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'distance_km'
ORDER BY p.oid;

-- 4–5) Required columns + types on specialists
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'specialists'
  AND c.column_name IN (
    'is_pro', 'rating', 'service_radius_km', 'work_format',
    'lat', 'lng', 'is_active', 'is_visible', 'category_id', 'languages'
  )
ORDER BY c.column_name;

-- 6) work_format values outside online/offline/hybrid (active+visible)
SELECT
  s.work_format,
  count(*) AS n
FROM public.specialists s
WHERE s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND (
    s.work_format IS NULL
    OR s.work_format NOT IN ('online', 'offline', 'hybrid')
  )
GROUP BY s.work_format
ORDER BY n DESC;

-- 7) Legacy local-profile inventory (active+visible offline/hybrid)
-- MAIN ROLLOUT RISK: rows with missing/invalid radius disappear from local search after v2.
WITH local_base AS (
  SELECT
    s.id,
    s.name,
    s.work_format,
    s.service_radius_km,
    s.lat,
    s.lng,
    s.postal_code,
    s.status
  FROM public.specialists s
  WHERE s.is_active IS TRUE
    AND s.is_visible IS TRUE
    AND s.work_format IN ('offline', 'hybrid')
)
SELECT
  count(*) AS total_offline_hybrid_active_visible,
  count(*) FILTER (
    WHERE service_radius_km IS NULL
  ) AS missing_radius,
  count(*) FILTER (
    WHERE service_radius_km IS NOT NULL
      AND service_radius_km NOT IN (5, 10, 25, 50, 100)
  ) AS radius_outside_allowlist,
  count(*) FILTER (
    WHERE lat IS NULL OR lng IS NULL
  ) AS missing_coords,
  count(*) FILTER (
    WHERE lat = 0 AND lng = 0
  ) AS zero_coords,
  count(*) FILTER (
    WHERE lat IS NOT NULL
      AND lng IS NOT NULL
      AND NOT (lat = 0 AND lng = 0)
      AND (lat < -90 OR lat > 90 OR lng < -180 OR lng > 180)
  ) AS coords_out_of_range,
  count(*) FILTER (
    WHERE service_radius_km IN (5, 10, 25, 50, 100)
      AND lat IS NOT NULL
      AND lng IS NOT NULL
      AND NOT (lat = 0 AND lng = 0)
      AND lat BETWEEN -90 AND 90
      AND lng BETWEEN -180 AND 180
  ) AS v2_eligible_local_profiles
FROM local_base;

-- Affected IDs: missing or non-allowlisted radius (will drop from local RPC after v2)
SELECT
  s.id,
  s.name,
  s.work_format,
  s.service_radius_km,
  s.lat,
  s.lng,
  s.postal_code,
  s.status,
  CASE
    WHEN s.service_radius_km IS NULL THEN 'missing_radius'
    WHEN s.service_radius_km NOT IN (5, 10, 25, 50, 100) THEN 'radius_outside_allowlist'
    ELSE 'other'
  END AS reason
FROM public.specialists s
WHERE s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND s.work_format IN ('offline', 'hybrid')
  AND (
    s.service_radius_km IS NULL
    OR s.service_radius_km NOT IN (5, 10, 25, 50, 100)
  )
ORDER BY s.work_format, s.service_radius_km NULLS FIRST, s.id;

-- 8) Current grants
SELECT
  r.grantee,
  r.privilege_type,
  r.is_grantable
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'search_specialists_local_radius'
ORDER BY r.grantee, r.privilege_type;

-- 9) Overload check (expect exactly one oid for this name in public)
SELECT
  count(*) AS overload_count,
  array_agg(p.oid ORDER BY p.oid) AS oids,
  array_agg(pg_get_function_identity_arguments(p.oid) ORDER BY p.oid) AS identity_args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

-- 10) Read-only before/after eligibility at control points (predicate simulation; no CREATE)
-- Control refs: Bonn, Berlin Mitte, München — radius 25 km, p_mode null.
WITH refs AS (
  SELECT * FROM (
    VALUES
      ('bonn', 50.7374::float8, 7.0982::float8, 25::float8),
      ('berlin', 52.5200::float8, 13.4050::float8, 25::float8),
      ('munich', 48.1374::float8, 11.5755::float8, 25::float8)
  ) AS v(label, ref_lat, ref_lng, user_radius_km)
),
scored AS (
  SELECT
    r.label,
    r.user_radius_km,
    s.id,
    s.work_format,
    s.service_radius_km,
    public.distance_km(r.ref_lat, r.ref_lng, s.lat, s.lng) AS dist
  FROM refs r
  JOIN public.specialists s
    ON s.is_active IS TRUE
   AND s.is_visible IS TRUE
   AND s.lat IS NOT NULL
   AND s.lng IS NOT NULL
)
SELECT
  label,
  count(*) FILTER (
    WHERE dist <= user_radius_km
  ) AS approx_prod_any_format_in_user_radius,
  count(*) FILTER (
    WHERE dist <= user_radius_km
      AND work_format = 'online'
  ) AS online_in_user_radius_today,
  count(*) FILTER (
    WHERE dist <= user_radius_km
      AND work_format IN ('offline', 'hybrid')
  ) AS offline_hybrid_in_user_radius_today,
  count(*) FILTER (
    WHERE dist IS NOT NULL
      AND dist = dist
      AND dist <= user_radius_km
      AND work_format IN ('offline', 'hybrid')
      AND service_radius_km IN (5, 10, 25, 50, 100)
      AND dist <= service_radius_km::float8
  ) AS approx_v2_eligible
FROM scored
GROUP BY label
ORDER BY label;
