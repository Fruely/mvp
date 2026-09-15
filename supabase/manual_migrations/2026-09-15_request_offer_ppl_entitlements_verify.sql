-- Verification for 2026-09-15_request_offer_ppl_entitlements.sql

-- 1) Tables and RLS state.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('request_offer_payments', 'request_offer_access_grants')
ORDER BY c.relname;

-- 2) Columns.
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('request_offer_payments', 'request_offer_access_grants')
ORDER BY table_name, ordinal_position;

-- 3) Explicit table grants. Expected: service_role only for app roles.
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('request_offer_payments', 'request_offer_access_grants')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- 4) Constraints/indexes useful for entitlement safety and idempotency.
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('request_offer_payments', 'request_offer_access_grants')
ORDER BY tablename, indexname;

-- 5) Sanity counts. Expected to be 0 immediately after migration.
SELECT 'request_offer_payments' AS table_name, count(*) AS row_count
FROM public.request_offer_payments
UNION ALL
SELECT 'request_offer_access_grants', count(*)
FROM public.request_offer_access_grants;
