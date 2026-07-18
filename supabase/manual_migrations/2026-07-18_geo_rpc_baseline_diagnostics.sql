-- READ-ONLY diagnostics for production RPC baseline.
-- Do NOT apply as a migration. Run manually in SQL editor before deploying v2.
-- Purpose: capture exact pg_get_functiondef / grants for search_specialists_local_radius.

-- 1) Function definition
SELECT
  n.nspname AS schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result_type,
  p.prosecdef AS security_definer,
  pg_get_userbyid(p.proowner) AS owner,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius';

-- 2) Grants
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'search_specialists_local_radius';

-- 3) Dependencies (best-effort)
SELECT
  dependent_ns.nspname AS dependent_schema,
  dependent_obj.relname AS dependent_object,
  pg_catalog.pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_constraint c
JOIN pg_class dependent_obj ON dependent_obj.oid = c.conrelid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_obj.relnamespace
WHERE FALSE; -- placeholder: use pg_depend dump if needed

SELECT d.objid::regprocedure AS function_ref,
       d.refobjid::regclass AS depends_on_relation
FROM pg_depend d
JOIN pg_proc p ON p.oid = d.objid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
  AND d.refclassid = 'pg_class'::regclass;
