-- =============================================================================
-- READ ONLY. SELECT only.
-- Verify rollback restored production search_specialists_local_radius.
-- Run after applying:
--   supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql
-- =============================================================================

SELECT
  p.oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_functiondef(p.oid) AS function_definition,
  l.lanname AS language,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

SELECT
  (pg_get_functiondef(p.oid) LIKE '%s.is_pro%') AS has_s_is_pro,
  (pg_get_functiondef(p.oid) LIKE '%s.rating%') AS has_s_rating,
  (pg_get_functiondef(p.oid) NOT LIKE '%is_featured%') AS no_is_featured,
  (pg_get_functiondef(p.oid) NOT LIKE '%specialist_rating_stats%') AS no_rating_stats,
  (pg_get_functiondef(p.oid) NOT LIKE '%service_radius_km IN%') AS no_allowlist_filter,
  (pg_get_functiondef(p.oid) NOT LIKE '%s.id ASC%') AS no_id_tiebreaker,
  (pg_get_functiondef(p.oid) LIKE '%p_mode IS NULL OR s.work_format = p_mode%') AS old_p_mode_equality,
  (pg_get_userbyid(p.proowner) = 'postgres') AS owner_postgres,
  (p.prosecdef IS FALSE) AS security_invoker
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

SELECT r.grantee, r.privilege_type
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'search_specialists_local_radius'
ORDER BY r.grantee, r.privilege_type;

-- Behavioral: p_mode online may return online rows again (production semantics)
SELECT
  'rollback_p_mode_online' AS probe,
  count(*) AS n,
  bool_or(r.work_format = 'online') AS includes_online_or_empty_ok
FROM public.search_specialists_local_radius(
  50.7374, 7.0982, 100, NULL, NULL, 'online', 0, 50
) r;

-- distance_km still present / unchanged expectation: compare md5 to pre-apply archive
SELECT md5(pg_get_functiondef(p.oid)) AS distance_km_md5
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'distance_km';
