-- Read-only verification after applying 2026-08-05_leads_contact_unlock.sql
-- Run in Supabase SQL editor. Review each section manually; zero-row checks are noted inline.

-- =============================================================================
-- 1) New columns: schema, table, data type, nullable, default
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
  AND c.table_name = 'leads'
  AND c.column_name IN ('contact_unlocked_at', 'contact_unlocked_by')
ORDER BY c.column_name;

-- Expected:
--   contact_unlocked_at | timestamptz | YES | NULL default (no default expression)
--   contact_unlocked_by | uuid        | YES | NULL default (no default expression)

-- =============================================================================
-- 2) Table exists and RLS is enabled on public.leads
-- =============================================================================
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'leads';

-- Expected: one row, rls_enabled = true

-- =============================================================================
-- 3) All grants for core roles (including anon/authenticated)
-- =============================================================================
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY grantee, privilege_type;

-- SELECT on anon/authenticated may be expected under RLS; review manually.

-- =============================================================================
-- 3b) Suspicious grants: anon/authenticated with dangerous table-level privileges
-- =============================================================================
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'TRIGGER',
    'REFERENCES'
  )
ORDER BY grantee, privilege_type;

-- Expected: zero rows. Any row here warrants manual review before deploy.

-- =============================================================================
-- 4) Existing RLS policies on public.leads
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
  AND cls.relname = 'leads'
ORDER BY pol.polname;

-- =============================================================================
-- 5) Constraints on new columns (migration adds none — expect zero rows)
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'leads'
  AND (
    pg_get_constraintdef(con.oid) ILIKE '%contact_unlocked_at%'
    OR pg_get_constraintdef(con.oid) ILIKE '%contact_unlocked_by%'
  )
ORDER BY con.conname;

-- Expected: zero rows

-- =============================================================================
-- 6) Indexes on new columns (migration adds none — expect zero rows)
-- =============================================================================
SELECT
  i.relname AS index_name,
  pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (ix.indkey)
WHERE n.nspname = 'public'
  AND t.relname = 'leads'
  AND a.attname IN ('contact_unlocked_at', 'contact_unlocked_by')
ORDER BY i.relname;

-- Expected: zero rows

-- =============================================================================
-- 7) Informational counts only (do not prove row immutability by themselves)
-- =============================================================================
SELECT COUNT(*) AS leads_total FROM public.leads;
SELECT COUNT(*) AS specialists_total FROM public.specialists;

-- Compare with pre-migration ops notes if available.

-- =============================================================================
-- 8) Column comments added by migration
-- =============================================================================
SELECT
  cols.table_schema,
  cols.table_name,
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'leads'
  AND cols.column_name IN ('contact_unlocked_at', 'contact_unlocked_by')
ORDER BY cols.column_name;

-- Expected: both columns have non-null comments describing unlock semantics.
