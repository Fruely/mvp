-- Read-only verification after applying 2026-08-05_service_requests.sql
-- Run in Supabase SQL editor. Review each section manually.

-- =============================================================================
-- 1) Table exists
-- =============================================================================
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'service_requests';

-- =============================================================================
-- 2) Columns: schema, table, data type, nullable, default
-- =============================================================================
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'service_requests'
ORDER BY c.ordinal_position;

-- =============================================================================
-- 3) CHECK constraints
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_requests'
  AND con.contype = 'c'
ORDER BY con.conname;

-- =============================================================================
-- 4) RLS enabled
-- =============================================================================
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'service_requests';

-- =============================================================================
-- 5) Policies (expect zero — access via service_role API only)
-- =============================================================================
SELECT
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE pol.polcmd::text
  END AS command,
  COALESCE(array_to_string(pol.polroles::regrole[], ', '), '') AS roles,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public'
  AND cls.relname = 'service_requests'
ORDER BY pol.polname;

-- =============================================================================
-- 6) Grants for core roles
-- =============================================================================
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'service_requests'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY grantee, privilege_type;

-- =============================================================================
-- 6b) Suspicious grants on anon/authenticated
-- =============================================================================
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'service_requests'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN (
    'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'SELECT'
  )
ORDER BY grantee, privilege_type;

-- Expected: zero rows (REVOKE ALL applied in migration)

-- =============================================================================
-- 7) Indexes
-- =============================================================================
SELECT i.relname AS index_name, pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'service_requests'
ORDER BY i.relname;

-- =============================================================================
-- 8) FK to categories (optional column)
-- =============================================================================
SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_requests'
  AND con.contype = 'f';

-- =============================================================================
-- 9) No specialist FK
-- =============================================================================
SELECT pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_requests'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) ILIKE '%specialists%';

-- Expected: zero rows

-- =============================================================================
-- 10) Informational counts (do not prove immutability of leads/specialists)
-- =============================================================================
SELECT COUNT(*) AS service_requests_total FROM public.service_requests;
SELECT COUNT(*) AS leads_total FROM public.leads;
SELECT COUNT(*) AS specialists_total FROM public.specialists;

-- =============================================================================
-- 11) Table/column comments
-- =============================================================================
SELECT
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'service_requests'
  AND cols.column_name IN ('public_id', 'description', 'status')
ORDER BY cols.column_name;

SELECT obj_description(format('%I.%I', 'public', 'service_requests')::regclass) AS table_comment;
