-- Read-only verification for client_campaign_links migration.
-- Run after applying 2026-08-15_client_campaign_links.sql

-- =============================================================================
-- A) Table exists
-- =============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'client_campaign_links';

-- Expected: one row

-- =============================================================================
-- B) service_requests.client_campaign_link_id column
-- =============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_requests'
  AND column_name = 'client_campaign_link_id';

-- Expected: uuid, YES

-- =============================================================================
-- C) RLS enabled on client_campaign_links
-- =============================================================================
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'client_campaign_links';

-- Expected: rls_enabled = true

-- =============================================================================
-- D) Privileges — anon/authenticated revoked, service_role granted
-- =============================================================================
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'client_campaign_links'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- Expected: anon/authenticated no rows; service_role has ALL
