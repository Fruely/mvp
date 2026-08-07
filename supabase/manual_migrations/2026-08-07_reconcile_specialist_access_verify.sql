-- Verify reconcile_specialist_access RPC, new columns, and updated objects.
-- Run in Supabase SQL editor after applying the migration.

-- 1. Verify reconcile_specialist_access RPC
WITH target AS (
  SELECT pg_catalog.to_regprocedure('public.reconcile_specialist_access(uuid)') AS oid
),
fn AS (
  SELECT
    t.oid,
    p.proname,
    p.prorettype::regtype::text AS return_type,
    p.prosecdef AS is_security_definer,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner_name
  FROM target t
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = t.oid
)
SELECT
  fn.oid IS NOT NULL AS function_exists,
  fn.proname,
  fn.return_type,
  fn.is_security_definer,
  fn.owner_name,
  fn.owner_name = 'postgres' AS owner_is_postgres,
  (
    SELECT bool_or(grantee_role.rolname = 'service_role' AND privilege_type = 'EXECUTE')
    FROM pg_catalog.pg_proc p2
    CROSS JOIN LATERAL pg_catalog.aclexplode(p2.proacl) AS acl
    JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = acl.grantee
    WHERE p2.oid = fn.oid
  ) AS service_role_can_execute,
  (
    SELECT NOT bool_or(
      grantee_role.rolname IN ('anon', 'authenticated') AND privilege_type = 'EXECUTE'
    )
    FROM pg_catalog.pg_proc p3
    CROSS JOIN LATERAL pg_catalog.aclexplode(p3.proacl) AS acl
    JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = acl.grantee
    WHERE p3.oid = fn.oid
  ) AS public_roles_blocked,
  CASE
    WHEN fn.oid IS NULL THEN 'MISSING'
    WHEN fn.return_type <> 'jsonb' THEN 'WRONG_RETURN_TYPE'
    WHEN NOT fn.is_security_definer THEN 'NOT_SECURITY_DEFINER'
    WHEN fn.owner_name <> 'postgres' THEN 'WRONG_OWNER'
    ELSE 'OK'
  END AS overall_status
FROM fn;

-- 2. Verify billing_visibility_blocked column on specialists
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'specialists'
  AND column_name = 'billing_visibility_blocked';

-- 3. Verify lifecycle_enrolled_at column on specialist_plan
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'specialist_plan'
  AND column_name = 'lifecycle_enrolled_at';

-- 4. Verify partial index on billing_visibility_blocked
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'specialists'
  AND indexname = 'idx_specialists_billing_visibility_blocked';

-- 5. Verify category_specialist_counts view includes billing_visibility_blocked
SELECT pg_get_viewdef('public.category_specialist_counts'::regclass, true) AS view_definition;
