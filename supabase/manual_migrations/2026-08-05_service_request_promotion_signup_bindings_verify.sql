-- Read-only verification after applying 2026-08-05_service_request_promotion_signup_bindings.sql
-- Run in Supabase SQL editor. Review each section manually.

-- =============================================================================
-- 1) Table exists
-- =============================================================================
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'service_request_promotion_signup_bindings';

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
  AND c.table_name = 'service_request_promotion_signup_bindings'
ORDER BY c.ordinal_position;

-- Expected columns (in order):
-- id, attribution_id, promotion_id, specialist_id, user_id, registered_at, created_at

-- =============================================================================
-- 3) Primary key
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_request_promotion_signup_bindings'
  AND con.contype = 'p'
ORDER BY con.conname;

-- =============================================================================
-- 4) UNIQUE constraints
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_request_promotion_signup_bindings'
  AND con.contype = 'u'
ORDER BY con.conname;

-- Expected:
-- UNIQUE(attribution_id)
-- UNIQUE(specialist_id)
-- UNIQUE(user_id)
-- No UNIQUE(promotion_id)

-- =============================================================================
-- 5) Foreign keys and ON DELETE CASCADE
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_request_promotion_signup_bindings'
  AND con.contype = 'f'
ORDER BY con.conname;

-- Expected:
-- attribution_id → service_request_promotion_attributions(id) ON DELETE CASCADE
-- promotion_id → service_request_promotions(id) ON DELETE CASCADE
-- specialist_id → specialists(id) ON DELETE CASCADE

-- =============================================================================
-- 6) No FK from user_id to auth.users
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_class ref ON ref.oid = con.confrelid
JOIN pg_namespace refn ON refn.oid = ref.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'service_request_promotion_signup_bindings'
  AND con.contype = 'f'
  AND refn.nspname = 'auth'
  AND ref.relname = 'users';

-- Expected: zero rows

-- =============================================================================
-- 7) RLS enabled
-- =============================================================================
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'service_request_promotion_signup_bindings';

-- =============================================================================
-- 8) Policies (expect zero — access via service_role server routes only)
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
  AND cls.relname = 'service_request_promotion_signup_bindings'
ORDER BY pol.polname;

-- Expected: zero rows

-- =============================================================================
-- 9) Grants for core roles
-- =============================================================================
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'service_request_promotion_signup_bindings'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY grantee, privilege_type;

-- =============================================================================
-- 9b) Suspicious grants on anon/authenticated
-- =============================================================================
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'service_request_promotion_signup_bindings'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN (
    'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'SELECT'
  )
ORDER BY grantee, privilege_type;

-- Expected: zero rows (REVOKE ALL applied in migration)

-- =============================================================================
-- 10) Indexes
-- =============================================================================
SELECT i.relname AS index_name, pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'service_request_promotion_signup_bindings'
ORDER BY i.relname;

-- Expected: PK, UNIQUE(attribution_id), UNIQUE(specialist_id), UNIQUE(user_id),
-- idx_service_request_promotion_signup_bindings_promotion_registered,
-- idx_service_request_promotion_signup_bindings_registered_at

-- =============================================================================
-- 11) Table and column comments
-- =============================================================================
SELECT obj_description(
  format('%I.%I', 'public', 'service_request_promotion_signup_bindings')::regclass
) AS table_comment;

SELECT
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'service_request_promotion_signup_bindings'
  AND cols.column_name IN (
    'attribution_id',
    'promotion_id',
    'specialist_id',
    'user_id',
    'registered_at'
  )
ORDER BY cols.column_name;

-- =============================================================================
-- 12) Forbidden columns must not exist (PII / payment / auth session)
-- =============================================================================
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_request_promotion_signup_bindings'
  AND column_name IN (
    'client_name',
    'client_email',
    'client_phone',
    'raw_description',
    'service_request_id',
    'stripe_customer_id',
    'payment_intent_id',
    'amount',
    'currency',
    'payment_status',
    'subscription_plan'
  )
ORDER BY column_name;

-- Expected: zero rows

-- =============================================================================
-- 13) service_request_promotion_attributions unchanged (no signup columns added)
-- =============================================================================
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_request_promotion_attributions'
  AND column_name IN ('specialist_id', 'user_id', 'registered_at')
ORDER BY column_name;

-- Expected: zero rows

-- =============================================================================
-- 14) Informational counts (do not prove immutability of other tables)
-- =============================================================================
SELECT COUNT(*) AS signup_bindings_total
FROM public.service_request_promotion_signup_bindings;

SELECT COUNT(*) AS attributions_total
FROM public.service_request_promotion_attributions;

SELECT COUNT(*) AS promotions_total
FROM public.service_request_promotions;

SELECT COUNT(*) AS service_requests_total
FROM public.service_requests;

SELECT COUNT(*) AS leads_total FROM public.leads;

SELECT COUNT(*) AS specialists_total FROM public.specialists;
