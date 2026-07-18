-- =============================================================================
-- READ ONLY. SELECT only.
-- Safe for manual execution in Supabase SQL Editor.
-- Does not modify schema or data.
-- =============================================================================
-- Target: public.distance_km
-- Purpose: archive production dependency used by search_specialists_local_radius.
-- =============================================================================

SELECT
  p.oid,
  n.nspname AS schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_arguments(p.oid) AS full_arguments,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_functiondef(p.oid) AS function_definition,
  l.lanname AS language,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,
  p.proisstrict AS strict,
  p.proparallel AS parallel_mode,
  p.proconfig,
  p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'distance_km'
ORDER BY p.oid;

SELECT
  r.routine_schema,
  r.routine_name,
  r.specific_name,
  r.grantee,
  r.privilege_type,
  r.is_grantable
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'distance_km'
ORDER BY r.specific_name, r.grantee, r.privilege_type;
