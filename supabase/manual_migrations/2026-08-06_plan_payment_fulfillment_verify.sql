-- Read-only consolidated verification after applying 2026-08-06_plan_payment_fulfillment.sql
-- Run in Supabase SQL editor. Always returns exactly one row.

WITH target AS (
  SELECT pg_catalog.to_regprocedure(
    'public.fulfill_plan_payment_entitlement(uuid,timestamptz,text,text,text)'
  ) AS oid
),
fn AS (
  SELECT
    p.*,
    n.nspname
  FROM target t
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = t.oid
  LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
)
SELECT
  fn.oid IS NOT NULL AS function_exists,
  CASE
    WHEN fn.oid IS NOT NULL THEN pg_catalog.pg_get_function_identity_arguments(fn.oid)
  END AS exact_signature,
  CASE
    WHEN fn.oid IS NOT NULL THEN pg_catalog.pg_get_function_result(fn.oid)
  END AS return_type,
  CASE
    WHEN fn.oid IS NULL THEN NULL
    WHEN fn.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_definer,
  CASE
    WHEN fn.oid IS NOT NULL THEN pg_catalog.pg_get_userbyid(fn.proowner)
  END AS owner,
  fn.proconfig AS search_path,
  CASE
    WHEN fn.oid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          fn.proacl,
          pg_catalog.acldefault('f', fn.proowner)
        )
      ) acl
      WHERE acl.grantee = 0
        AND acl.privilege_type = 'EXECUTE'
    )
  END AS public_execute,
  CASE
    WHEN fn.oid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          fn.proacl,
          pg_catalog.acldefault('f', fn.proowner)
        )
      ) acl
      JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
      WHERE r.rolname = 'anon'
        AND acl.privilege_type = 'EXECUTE'
    )
  END AS anon_execute,
  CASE
    WHEN fn.oid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          fn.proacl,
          pg_catalog.acldefault('f', fn.proowner)
        )
      ) acl
      JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
      WHERE r.rolname = 'authenticated'
        AND acl.privilege_type = 'EXECUTE'
    )
  END AS authenticated_execute,
  CASE
    WHEN fn.oid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          fn.proacl,
          pg_catalog.acldefault('f', fn.proowner)
        )
      ) acl
      JOIN pg_catalog.pg_roles r ON r.oid = acl.grantee
      WHERE r.rolname = 'service_role'
        AND acl.privilege_type = 'EXECUTE'
    )
  END AS service_role_execute,
  CASE
    WHEN fn.oid IS NOT NULL THEN pg_catalog.pg_get_functiondef(fn.oid)
  END AS function_definition
FROM fn;
