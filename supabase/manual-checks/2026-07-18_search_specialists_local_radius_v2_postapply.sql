-- =============================================================================
-- READ ONLY. SELECT only (calls RPC; no DDL/DML).
-- Post-apply verification for search_specialists_local_radius v2 / v2.1.
-- Current allowlist expectation: service_radius_km IN (5, 10, 25, 30, 50, 100)
-- (v2.1 adds 30 km). Run after applying v2 + v2.1 (or equivalent).
-- =============================================================================

-- A) New function metadata
SELECT
  p.oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_arguments(p.oid) AS full_arguments,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_functiondef(p.oid) AS function_definition,
  l.lanname AS language,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer, -- expect false (INVOKER)
  p.provolatile AS volatility,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

-- B) Signature / return markers
SELECT
  (pg_get_function_identity_arguments(p.oid) =
    'p_ref_lat double precision, p_ref_lng double precision, p_radius_km double precision, p_lang text, p_category_id uuid, p_mode text, p_offset integer, p_limit integer'
  ) AS identity_matches,
  (pg_get_function_result(p.oid) LIKE '%is_pro boolean%rating numeric%distance double precision%') AS return_tail_ok,
  (pg_get_functiondef(p.oid) LIKE '%s.is_pro%') AS projects_s_is_pro,
  (pg_get_functiondef(p.oid) LIKE '%s.rating%') AS projects_s_rating,
  (pg_get_functiondef(p.oid) NOT LIKE '%is_featured%') AS no_is_featured,
  (pg_get_functiondef(p.oid) NOT LIKE '%specialist_rating_stats%') AS no_rating_stats,
  (pg_get_functiondef(p.oid) LIKE '%s.id ASC%') AS has_id_tiebreaker,
  (pg_get_functiondef(p.oid) LIKE '%SECURITY INVOKER%') AS security_invoker_text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

-- C) Grants
SELECT r.grantee, r.privilege_type
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'search_specialists_local_radius'
ORDER BY r.grantee, r.privilege_type;

-- D) distance_km unchanged
SELECT
  md5(pg_get_functiondef(p.oid)) AS distance_km_md5,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'distance_km';

-- E) Behavioral probes using live data for ref/category (no hard-coded specialist IDs)
WITH seed AS (
  SELECT
    s.lat AS ref_lat,
    s.lng AS ref_lng,
    s.category_id,
    s.languages[1] AS sample_lang
  FROM public.specialists s
  WHERE s.is_active IS TRUE
    AND s.is_visible IS TRUE
    AND s.work_format IN ('offline', 'hybrid')
    AND s.service_radius_km IN (5, 10, 25, 30, 50, 100)
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND NOT (s.lat = 0 AND s.lng = 0)
    AND s.lat BETWEEN -90 AND 90
    AND s.lng BETWEEN -180 AND 180
  ORDER BY s.id
  LIMIT 1
),
fallback AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng,
         NULL::uuid AS category_id, NULL::text AS sample_lang
),
params AS (
  SELECT
    COALESCE((SELECT ref_lat FROM seed), (SELECT ref_lat FROM fallback)) AS ref_lat,
    COALESCE((SELECT ref_lng FROM seed), (SELECT ref_lng FROM fallback)) AS ref_lng,
    (SELECT category_id FROM seed) AS category_id,
    (SELECT sample_lang FROM seed) AS sample_lang
)
SELECT 'seed_params' AS probe, to_jsonb(p) AS payload
FROM params p;

-- E1) p_mode null → only offline/hybrid
WITH params AS (
  SELECT * FROM (
    SELECT
      COALESCE(
        (SELECT lat FROM public.specialists
         WHERE is_active AND is_visible
           AND work_format IN ('offline','hybrid')
           AND service_radius_km IN (5,10,25,30,50,100)
           AND lat IS NOT NULL AND lng IS NOT NULL
           AND NOT (lat = 0 AND lng = 0)
         ORDER BY id LIMIT 1),
        50.7374::float8
      ) AS ref_lat,
      COALESCE(
        (SELECT lng FROM public.specialists
         WHERE is_active AND is_visible
           AND work_format IN ('offline','hybrid')
           AND service_radius_km IN (5,10,25,30,50,100)
           AND lat IS NOT NULL AND lng IS NOT NULL
           AND NOT (lat = 0 AND lng = 0)
         ORDER BY id LIMIT 1),
        7.0982::float8
      ) AS ref_lng
  ) x
)
SELECT
  'p_mode_null_work_formats' AS probe,
  array_agg(DISTINCT r.work_format ORDER BY r.work_format) AS work_formats,
  count(*) AS n,
  bool_and(r.work_format IN ('offline', 'hybrid')) AS only_offline_hybrid
FROM params p
CROSS JOIN LATERAL public.search_specialists_local_radius(
  p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, NULL, 0, 50
) r;

-- E2) p_mode online → empty
WITH params AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng
)
SELECT
  'p_mode_online_empty' AS probe,
  count(*) AS n
FROM params p
CROSS JOIN LATERAL public.search_specialists_local_radius(
  p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, 'online', 0, 50
) r;

-- E3) p_mode local → offline+hybrid only
WITH params AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng
)
SELECT
  'p_mode_local' AS probe,
  array_agg(DISTINCT r.work_format ORDER BY r.work_format) AS work_formats,
  bool_and(r.work_format IN ('offline', 'hybrid')) AS only_offline_hybrid
FROM params p
CROSS JOIN LATERAL public.search_specialists_local_radius(
  p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, 'local', 0, 50
) r;

-- E4) p_mode offline / hybrid
WITH params AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng
)
SELECT 'p_mode_offline' AS probe, array_agg(DISTINCT r.work_format) AS work_formats, count(*) AS n
FROM params p
CROSS JOIN LATERAL public.search_specialists_local_radius(
  p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, 'offline', 0, 50
) r
UNION ALL
SELECT 'p_mode_hybrid', array_agg(DISTINCT r.work_format), count(*)
FROM params p
CROSS JOIN LATERAL public.search_specialists_local_radius(
  p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, 'hybrid', 0, 50
) r;

-- E5) unknown p_mode → empty
SELECT
  'p_mode_unknown_empty' AS probe,
  count(*) AS n
FROM public.search_specialists_local_radius(
  50.7374, 7.0982, 100, NULL, NULL, 'Online', 0, 50
);

-- E6) dual radius: every returned row must satisfy distance <= service_radius_km
-- (hydrate radius from specialists; RPC does not return service_radius_km)
WITH params AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng
),
hits AS (
  SELECT r.*
  FROM params p
  CROSS JOIN LATERAL public.search_specialists_local_radius(
    p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, NULL, 0, 100
  ) r
)
SELECT
  'dual_radius_check' AS probe,
  count(*) AS n,
  bool_and(s.service_radius_km IN (5, 10, 25, 30, 50, 100)) AS all_allowlisted,
  bool_and(h.distance <= s.service_radius_km::float8) AS all_within_specialist_radius,
  bool_and(h.distance <= 100::float8) AS all_within_user_radius,
  bool_and(h.work_format IN ('offline', 'hybrid')) AS no_online
FROM hits h
JOIN public.specialists s ON s.id = h.id;

-- E7) invalid ref coords → empty
SELECT 'invalid_ref_null' AS probe, count(*) AS n
FROM public.search_specialists_local_radius(NULL, 7.0, 25, NULL, NULL, NULL, 0, 20)
UNION ALL
SELECT 'invalid_ref_zero', count(*)
FROM public.search_specialists_local_radius(0, 0, 25, NULL, NULL, NULL, 0, 20)
UNION ALL
SELECT 'invalid_ref_lat', count(*)
FROM public.search_specialists_local_radius(91, 7.0, 25, NULL, NULL, NULL, 0, 20);

-- E8) language filter (only if a sample language exists on an eligible row)
WITH lang AS (
  SELECT s.languages[1] AS p_lang, s.lat, s.lng
  FROM public.specialists s
  WHERE s.is_active AND s.is_visible
    AND s.work_format IN ('offline','hybrid')
    AND s.service_radius_km IN (5,10,25,30,50,100)
    AND s.languages IS NOT NULL
    AND cardinality(s.languages) >= 1
    AND s.lat IS NOT NULL AND s.lng IS NOT NULL
  ORDER BY s.id
  LIMIT 1
)
SELECT
  'language_filter' AS probe,
  l.p_lang,
  count(*) AS n,
  bool_and(r.languages @> ARRAY[l.p_lang]::text[]) AS all_match_lang
FROM lang l
CROSS JOIN LATERAL public.search_specialists_local_radius(
  l.lat, l.lng, 100::float8, l.p_lang, NULL, NULL, 0, 50
) r
GROUP BY l.p_lang;

-- E9) category filter
WITH cat AS (
  SELECT s.category_id, s.lat, s.lng
  FROM public.specialists s
  WHERE s.is_active AND s.is_visible
    AND s.work_format IN ('offline','hybrid')
    AND s.service_radius_km IN (5,10,25,30,50,100)
    AND s.category_id IS NOT NULL
    AND s.lat IS NOT NULL AND s.lng IS NOT NULL
  ORDER BY s.id
  LIMIT 1
)
SELECT
  'category_filter' AS probe,
  c.category_id,
  count(*) AS n,
  bool_and(r.category_id = c.category_id) AS all_match_category
FROM cat c
CROSS JOIN LATERAL public.search_specialists_local_radius(
  c.lat, c.lng, 100::float8, NULL, c.category_id, NULL, 0, 50
) r
GROUP BY c.category_id;

-- E10) stable ranking: distance ASC, is_pro DESC, rating DESC NULLS LAST, id ASC
WITH params AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng
),
hits AS (
  SELECT r.*, row_number() OVER () AS pos
  FROM params p
  CROSS JOIN LATERAL public.search_specialists_local_radius(
    p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, NULL, 0, 50
  ) r
),
ordered AS (
  SELECT
    id,
    distance,
    is_pro,
    rating,
    row_number() OVER (
      ORDER BY distance ASC, is_pro DESC, rating DESC NULLS LAST, id ASC
    ) AS expected_pos,
    pos AS actual_pos
  FROM hits
)
SELECT
  'ranking_stable' AS probe,
  bool_and(expected_pos = actual_pos) AS ranking_matches
FROM ordered;

-- E11) pagination
WITH params AS (
  SELECT 50.7374::float8 AS ref_lat, 7.0982::float8 AS ref_lng
),
page0 AS (
  SELECT r.id
  FROM params p
  CROSS JOIN LATERAL public.search_specialists_local_radius(
    p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, NULL, 0, 2
  ) r
),
page1 AS (
  SELECT r.id
  FROM params p
  CROSS JOIN LATERAL public.search_specialists_local_radius(
    p.ref_lat, p.ref_lng, 100::float8, NULL, NULL, NULL, 2, 2
  ) r
)
SELECT
  'pagination' AS probe,
  (SELECT count(*) FROM page0) AS page0_n,
  (SELECT count(*) FROM page1) AS page1_n,
  NOT EXISTS (
    SELECT 1 FROM page0 p0 JOIN page1 p1 ON p0.id = p1.id
  ) AS pages_disjoint;
