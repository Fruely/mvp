-- Read-only verification after applying 2026-08-15_promoted_request_reservations.sql
-- Run in Supabase SQL Editor. Review each section manually.

-- =============================================================================
-- A) Summary — table, PK, FK count, indexes, RLS, privileges, row count
-- =============================================================================
WITH table_exists AS (
  SELECT COUNT(*) AS n
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'promoted_request_reservations'
),
pk_exists AS (
  SELECT COUNT(*) AS n
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'promoted_request_reservations'
    AND con.contype = 'p'
),
fk_names AS (
  SELECT con.conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'promoted_request_reservations'
    AND con.contype = 'f'
),
index_names AS (
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'promoted_request_reservations'
),
rls AS (
  SELECT c.relrowsecurity AS enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'promoted_request_reservations'
),
row_count AS (
  SELECT COUNT(*) AS n FROM public.promoted_request_reservations
)
SELECT
  'table_exists' AS check_name,
  (SELECT n FROM table_exists)::text AS actual,
  '1' AS expected,
  CASE WHEN (SELECT n FROM table_exists) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
UNION ALL
SELECT
  'primary_key_exists',
  (SELECT n FROM pk_exists)::text,
  '1',
  CASE WHEN (SELECT n FROM pk_exists) = 1 THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT
  'foreign_keys_count',
  (SELECT COUNT(*) FROM fk_names)::text,
  '4',
  CASE WHEN (SELECT COUNT(*) FROM fk_names) = 4 THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT
  'indexes_count',
  (SELECT COUNT(*) FROM index_names)::text,
  '>= 3',
  CASE WHEN (SELECT COUNT(*) FROM index_names) >= 3 THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT
  'rls_enabled',
  COALESCE((SELECT enabled FROM rls)::text, 'missing'),
  'true',
  CASE WHEN COALESCE((SELECT enabled FROM rls), false) THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT
  'reservation_rows',
  (SELECT n FROM row_count)::text,
  '0',
  CASE WHEN (SELECT n FROM row_count) = 0 THEN 'PASS' ELSE 'REVIEW' END;

-- Expected summary: table_exists PASS, primary_key_exists PASS, foreign_keys_count PASS (4),
-- indexes_count PASS (>=3), rls_enabled PASS, reservation_rows PASS (0 on fresh apply)

-- =============================================================================
-- B) Columns — types, nullability, defaults
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'promoted_request_reservations'
ORDER BY c.ordinal_position;

-- Expected defaults include:
-- status = 'pending_payment', amount_cents = 1000, currency = 'eur'

-- =============================================================================
-- C) Primary key
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'promoted_request_reservations'
  AND con.contype = 'p';

-- Expected: PRIMARY KEY (id)

-- =============================================================================
-- D) Foreign keys
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'promoted_request_reservations'
  AND con.contype = 'f'
ORDER BY con.conname;

-- Expected FK targets:
-- promotion_id -> service_request_promotions(id)
-- specialist_id -> specialists(id)
-- signup_binding_id -> service_request_promotion_signup_bindings(id)
-- promoted_payment_id -> promoted_request_payments(id)

-- =============================================================================
-- E) UNIQUE / CHECK constraints (Stripe + status + amount)
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'promoted_request_reservations'
  AND con.contype IN ('c', 'u')
ORDER BY con.contype, con.conname;

-- Expected includes:
-- amount_cents = 1000, currency = 'eur', status enum check,
-- UNIQUE stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id,
-- paid_pending_registration requires paid_at + registration_deadline

-- =============================================================================
-- F) Indexes
-- =============================================================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'promoted_request_reservations'
ORDER BY indexname;

-- Expected at least:
-- promoted_request_reservations_pkey
-- idx_promoted_request_reservations_promotion_created
-- idx_promoted_request_reservations_email_status

-- =============================================================================
-- G) RLS status
-- =============================================================================
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'promoted_request_reservations';

-- Expected: rls_enabled = true

-- =============================================================================
-- H) Table privileges — anon, authenticated, service_role
-- =============================================================================
SELECT
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'promoted_request_reservations'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- Expected after migration:
-- anon: no rows (REVOKE ALL)
-- authenticated: no rows (REVOKE ALL)
-- service_role: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER (GRANT ALL)
