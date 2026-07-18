-- =============================================================================
-- READ ONLY. SELECT only — fixture semantics for RPC v2 (no DDL/DML).
-- Mirrors filters in:
--   supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql
-- Run after reviewing migration; does not CREATE/REPLACE the function.
-- =============================================================================

WITH fixtures AS (
  SELECT *
  FROM (
    VALUES
      -- id, work_format, lat, lng, service_radius_km, languages, category_id, is_active, is_visible, is_pro, rating, dist_km, expect_null_mode
      ('11111111-1111-1111-1111-111111111111'::uuid, 'offline', 50.74::float8, 7.10::float8, 25, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, true, 4.5::numeric, 3.0::float8, true),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'offline', 50.74::float8, 7.10::float8, 25, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, 4.0::numeric, 12.0::float8, false), -- outside user 10
      ('33333333-3333-3333-3333-333333333333'::uuid, 'offline', 50.74::float8, 7.10::float8, 10, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, 3.0::numeric, 12.0::float8, false), -- outside specialist
      ('44444444-4444-4444-4444-444444444444'::uuid, 'hybrid', 50.74::float8, 7.10::float8, 25, ARRAY['de']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, NULL::numeric, 5.0::float8, true),
      ('55555555-5555-5555-5555-555555555555'::uuid, 'online', 50.74::float8, 7.10::float8, 25, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, true, 5.0::numeric, 1.0::float8, false),
      ('66666666-6666-6666-6666-666666666666'::uuid, 'offline', 50.74::float8, 7.10::float8, NULL::int, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, NULL::numeric, 2.0::float8, false),
      ('77777777-7777-7777-7777-777777777777'::uuid, 'offline', 50.74::float8, 7.10::float8, 30, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, NULL::numeric, 2.0::float8, false),
      ('88888888-8888-8888-8888-888888888888'::uuid, 'offline', NULL::float8, NULL::float8, 25, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, NULL::numeric, NULL::float8, false),
      ('99999999-9999-9999-9999-999999999999'::uuid, 'offline', 0::float8, 0::float8, 25, ARRAY['ru']::text[], 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true, true, false, NULL::numeric, 999::float8, false)
  ) AS v(
    id, work_format, lat, lng, service_radius_km, languages, category_id,
    is_active, is_visible, is_pro, rating, dist_km, expect_match_p_mode_null
  )
),
params AS (
  SELECT
    10::float8 AS p_radius_km,
    NULL::text AS p_mode,
    NULL::text AS p_lang,
    NULL::uuid AS p_category_id
),
scored AS (
  SELECT
    f.*,
    (
      f.is_active IS TRUE
      AND f.is_visible IS TRUE
      AND f.lat IS NOT NULL
      AND f.lng IS NOT NULL
      AND NOT (f.lat = 0 AND f.lng = 0)
      AND (
        ((p.p_mode IS NULL OR p.p_mode = 'local') AND f.work_format IN ('offline', 'hybrid'))
        OR (p.p_mode = 'offline' AND f.work_format = 'offline')
        OR (p.p_mode = 'hybrid' AND f.work_format = 'hybrid')
      )
      AND f.service_radius_km IN (5, 10, 25, 50, 100)
      AND f.dist_km IS NOT NULL
      AND f.dist_km <= p.p_radius_km
      AND f.dist_km <= f.service_radius_km::float8
      AND (p.p_category_id IS NULL OR f.category_id = p.p_category_id)
      AND (p.p_lang IS NULL OR f.languages @> ARRAY[p.p_lang]::text[])
    ) AS matched
  FROM fixtures f
  CROSS JOIN params p
)
SELECT
  id,
  work_format,
  service_radius_km,
  dist_km,
  matched,
  expect_match_p_mode_null,
  matched IS NOT DISTINCT FROM expect_match_p_mode_null AS ok
FROM scored
ORDER BY id;

-- Ranking check on the two expected matches (distance, is_pro, rating, id)
WITH ranked AS (
  SELECT *
  FROM (
    VALUES
      ('11111111-1111-1111-1111-111111111111'::uuid, 3.0::float8, true, 4.5::numeric),
      ('44444444-4444-4444-4444-444444444444'::uuid, 5.0::float8, false, NULL::numeric)
  ) AS v(id, dist, is_pro, rating)
)
SELECT id
FROM ranked
ORDER BY dist ASC, is_pro DESC, rating DESC NULLS LAST, id ASC;
