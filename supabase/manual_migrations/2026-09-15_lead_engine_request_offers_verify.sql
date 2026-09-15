-- Verification only: Lead Engine Phase 1 request_offers foundation.
-- Run after 2026-09-15_lead_engine_request_offers.sql in the target Supabase project.
-- This file performs read-only catalog checks.

-- 1) Required columns.
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'request_offers'
ORDER BY c.ordinal_position;

-- 2) Expected CHECK / FK / PK constraints.
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'request_offers'
ORDER BY con.conname;

-- 3) Expected indexes, including unique idempotency index.
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'request_offers'
ORDER BY indexname;

-- 4) RLS must be enabled.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'request_offers';

-- 5) anon/authenticated should not have direct table privileges.
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'request_offers'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- Expected result summary:
-- - request_offers exists with origin, specialist, pricing snapshot and lifecycle fields.
-- - request_offers_exactly_one_origin_check exists.
-- - uq_request_offers_idempotency_key exists and is UNIQUE for non-null keys.
-- - RLS is enabled.
-- - anon/authenticated have no direct privileges.
-- - service_role has table privileges.
