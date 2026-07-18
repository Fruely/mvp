-- =============================================================================
-- READ ONLY.
-- Safe for manual execution in Supabase SQL Editor.
-- Does not modify schema or data.
-- =============================================================================
-- Target: public.search_specialists_local_radius
-- Purpose: capture full production baseline (definition, security, grants,
--          dependencies, PostGIS) BEFORE comparing/applying any v2 migration.
-- Location: supabase/manual_checks/ (read-only diagnostics; NOT a deploy migration).
-- Do NOT run CREATE/REPLACE/DROP/UPDATE from this file.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. Function definitions and overloads
--    (all overloads with this name; do not assume a single signature)
-- ---------------------------------------------------------------------------
SELECT
  p.oid AS function_oid,
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_arguments(p.oid) AS full_arguments,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_functiondef(p.oid) AS function_definition,
  l.lanname AS language_name,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
    ELSE p.provolatile::text
  END AS volatility,
  CASE p.proisstrict
    WHEN true THEN 'RETURNS NULL ON NULL INPUT (STRICT)'
    ELSE 'CALLED ON NULL INPUT'
  END AS null_input_mode,
  CASE p.proparallel
    WHEN 's' THEN 'PARALLEL SAFE'
    WHEN 'r' THEN 'PARALLEL RESTRICTED'
    WHEN 'u' THEN 'PARALLEL UNSAFE'
    ELSE p.proparallel::text
  END AS parallel_mode,
  p.prosecdef AS is_security_definer,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.proconfig AS proconfig,
  p.prokind AS prokind,
  p.pronargs AS arg_count,
  p.prorettype::regtype AS return_type_oid_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY pg_get_function_identity_arguments(p.oid);

-- ---------------------------------------------------------------------------
-- B. Owner, security and configuration (incl. search_path from proconfig)
-- ---------------------------------------------------------------------------
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_userbyid(p.proowner) AS owner_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  p.proconfig AS proconfig,
  COALESCE(
    (
      SELECT string_agg(cfg, ', ' ORDER BY cfg)
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE cfg ILIKE 'search_path=%'
    ),
    '(no search_path in proconfig)'
  ) AS search_path_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY pg_get_function_identity_arguments(p.oid);

-- ---------------------------------------------------------------------------
-- C. Grants and ACL
--    C1) information_schema routine privileges
--    C2) raw ACL via aclexplode (includes anon/authenticated/service_role/public)
-- ---------------------------------------------------------------------------

-- C1
SELECT
  r.routine_schema,
  r.routine_name,
  r.specific_name,
  r.grantee,
  r.privilege_type,
  r.is_grantable
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'search_specialists_local_radius'
ORDER BY r.specific_name, r.grantee, r.privilege_type;

-- C2
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  COALESCE(grantor.rolname, grantor.oid::text) AS grantor,
  COALESCE(grantee.rolname, CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE acl.grantee::text END) AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl ON true
LEFT JOIN pg_roles grantor ON grantor.oid = acl.grantor
LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY
  pg_get_function_identity_arguments(p.oid),
  grantee,
  acl.privilege_type;

-- Explicit presence check for common API roles
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  role_name,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
    LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
    WHERE acl.privilege_type = 'EXECUTE'
      AND (
        (role_name = 'public' AND acl.grantee = 0)
        OR grantee.rolname = role_name
      )
  ) AS has_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role'), ('public')) AS roles(role_name)
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY pg_get_function_identity_arguments(p.oid), role_name;

-- ---------------------------------------------------------------------------
-- D. Dependencies
--    relations, types, functions, extensions referenced by the RPC
-- ---------------------------------------------------------------------------

-- D1) Relations (tables/views/etc.)
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  d.refobjid::regclass AS depends_on_relation,
  c.relkind AS relation_kind
FROM pg_depend d
JOIN pg_proc p ON p.oid = d.objid
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_class c ON c.oid = d.refobjid
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
  AND d.refclassid = 'pg_class'::regclass
ORDER BY 2, 3;

-- D2) Types
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  d.refobjid::regtype AS depends_on_type
FROM pg_depend d
JOIN pg_proc p ON p.oid = d.objid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
  AND d.refclassid = 'pg_type'::regclass
ORDER BY 2, 3;

-- D3) Other functions
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  d.refobjid::regprocedure AS depends_on_function
FROM pg_depend d
JOIN pg_proc p ON p.oid = d.objid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
  AND d.refclassid = 'pg_proc'::regclass
ORDER BY 2, 3;

-- D4) Extensions (via pg_depend → pg_extension)
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  e.extname AS depends_on_extension
FROM pg_depend d
JOIN pg_proc p ON p.oid = d.objid
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_extension e ON e.oid = d.refobjid
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
  AND d.refclassid = 'pg_extension'::regclass
ORDER BY 2, 3;

-- ---------------------------------------------------------------------------
-- E. PostGIS availability and geography-related objects
-- ---------------------------------------------------------------------------

-- E1) Is PostGIS installed?
SELECT
  e.extname,
  e.extversion,
  n.nspname AS extension_schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('postgis', 'postgis_topology', 'address_standardizer')
ORDER BY e.extname;

-- E2) Geography/geometry types present (if any)
SELECT
  n.nspname AS type_schema,
  t.typname AS type_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname IN ('geography', 'geometry', 'raster')
ORDER BY 1, 2;

-- E3) Heuristic: does function_definition mention PostGIS/geo helpers?
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  (pg_get_functiondef(p.oid) ILIKE '%ST_%'
    OR pg_get_functiondef(p.oid) ILIKE '%geography%'
    OR pg_get_functiondef(p.oid) ILIKE '%geometry%'
    OR pg_get_functiondef(p.oid) ILIKE '%postgis%') AS mentions_postgis_or_geo_types
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY 2;

-- ---------------------------------------------------------------------------
-- F. Function comments
-- ---------------------------------------------------------------------------
SELECT
  p.oid AS function_oid,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  d.description AS function_comment
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_description d ON d.objoid = p.oid AND d.classoid = 'pg_proc'::regclass
WHERE n.nspname = 'public'
  AND p.proname = 'search_specialists_local_radius'
ORDER BY 2;
