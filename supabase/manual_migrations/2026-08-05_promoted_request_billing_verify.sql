-- Read-only verification after applying 2026-08-05_promoted_request_billing.sql
-- Run in Supabase SQL editor. Review each section manually.

-- =============================================================================
-- A) All three tables exist
-- =============================================================================
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
ORDER BY table_name;

-- Expected: 3 rows

-- =============================================================================
-- B) Columns: types, nullability, defaults — promoted_request_payments
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'promoted_request_payments'
ORDER BY c.ordinal_position;

-- Expected columns (in order):
-- id, signup_binding_id, promotion_id, specialist_id, user_id,
-- amount_cents, currency, status,
-- stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id,
-- created_at, updated_at, checkout_created_at, paid_at, failed_at,
-- expired_at, refunded_at, disputed_at

-- =============================================================================
-- B) Columns — promoted_request_access_grants
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'promoted_request_access_grants'
ORDER BY c.ordinal_position;

-- Expected: id, specialist_id, promotion_id, source_type, source_payment_id,
-- granted_at, revoked_at, revoke_reason, created_at, updated_at

-- =============================================================================
-- B) Columns — promoted_request_subscription_credits
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'promoted_request_subscription_credits'
ORDER BY c.ordinal_position;

-- Expected: id, specialist_id, source_payment_id, credit_cents, currency,
-- eligible_until, consumed_at, consumed_checkout_session_id, consumed_plan_code,
-- created_at, updated_at

-- =============================================================================
-- C) Primary keys
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND con.contype = 'p'
ORDER BY rel.relname, con.conname;

-- Expected: one PK per table on id

-- =============================================================================
-- C) UNIQUE constraints (table-level)
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND con.contype = 'u'
ORDER BY rel.relname, con.conname;

-- Expected payments:
-- UNIQUE(stripe_checkout_session_id)
-- UNIQUE(stripe_payment_intent_id)
-- UNIQUE(stripe_charge_id)
-- Expected access_grants: UNIQUE(specialist_id, promotion_id)
-- Expected credits: UNIQUE(source_payment_id), UNIQUE(specialist_id),
-- UNIQUE(consumed_checkout_session_id)

-- =============================================================================
-- C) CHECK constraints
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND con.contype = 'c'
ORDER BY rel.relname, con.conname;

-- Expected payments CHECK includes:
-- amount_cents = 1000, currency = 'eur', status enum,
-- paid/refunded/disputed → paid_at NOT NULL,
-- refunded → refunded_at, disputed → disputed_at, failed → failed_at,
-- expired → expired_at, paid → stripe session + intent NOT NULL

-- Expected access CHECK includes:
-- source_type IN ('payment','subscription'),
-- payment → source_payment_id NOT NULL,
-- subscription → source_payment_id NULL,
-- revoke_reason consistency

-- Expected credits CHECK includes:
-- credit_cents = 1000, currency = 'eur', eligible_until > created_at,
-- consumed_plan_code basic/premium or NULL,
-- consumption field pairing

-- =============================================================================
-- C) Partial unique index — one paid payment per specialist+promotion
-- =============================================================================
SELECT i.relname AS index_name, pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'promoted_request_payments'
  AND i.relname = 'uq_promoted_request_payments_one_paid_per_pair';

-- Expected: UNIQUE (specialist_id, promotion_id) WHERE status = 'paid'

-- =============================================================================
-- D) Foreign keys — targets and ON DELETE RESTRICT
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND con.contype = 'f'
ORDER BY rel.relname, con.conname;

-- Expected payments FK:
-- signup_binding_id → service_request_promotion_signup_bindings RESTRICT
-- promotion_id → service_request_promotions RESTRICT
-- specialist_id → specialists RESTRICT
-- Expected access FK:
-- specialist_id, promotion_id RESTRICT; source_payment_id → promoted_request_payments RESTRICT
-- Expected credits FK:
-- specialist_id, source_payment_id RESTRICT

-- =============================================================================
-- D) No FK to auth.users or service_requests on new tables
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_class ref ON ref.oid = con.confrelid
JOIN pg_namespace refn ON refn.oid = ref.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND con.contype = 'f'
  AND (
    (refn.nspname = 'auth' AND ref.relname = 'users')
    OR (refn.nspname = 'public' AND ref.relname = 'service_requests')
  );

-- Expected: zero rows

-- =============================================================================
-- E) RLS enabled on all three tables
-- =============================================================================
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
ORDER BY c.relname;

-- Expected: rls_enabled = true for each

-- =============================================================================
-- F) Policies — expect zero for all three
-- =============================================================================
SELECT
  cls.relname AS table_name,
  pol.polname AS policy_name
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public'
  AND cls.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
ORDER BY cls.relname, pol.polname;

-- Expected: zero rows

-- =============================================================================
-- G) Grants for core roles
-- =============================================================================
SELECT table_name, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY table_name, grantee, privilege_type;

-- =============================================================================
-- H) Suspicious anon/authenticated grants — expect zero
-- =============================================================================
SELECT table_name, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN (
    'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'SELECT'
  )
ORDER BY table_name, grantee, privilege_type;

-- Expected: zero rows

-- =============================================================================
-- I) Indexes — full list and definitions
-- =============================================================================
SELECT t.relname AS table_name, i.relname AS index_name, pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
ORDER BY t.relname, i.relname;

-- Expected payments indexes:
-- PK, 3 Stripe UNIQUE, uq_promoted_request_payments_one_paid_per_pair (partial),
-- idx_promoted_request_payments_specialist_promotion_created,
-- idx_promoted_request_payments_status_created,
-- idx_promoted_request_payments_signup_binding_created
-- Expected access indexes:
-- PK, UNIQUE(specialist_id,promotion_id),
-- idx_promoted_request_access_grants_promotion_granted,
-- idx_promoted_request_access_grants_active_pair (partial revoked_at IS NULL)
-- Expected credits indexes:
-- PK, 3 UNIQUE constraints as indexes,
-- idx_promoted_request_subscription_credits_specialist_eligible,
-- idx_promoted_request_subscription_credits_available_eligible (partial consumed_at IS NULL)

-- =============================================================================
-- J) Table and key column comments
-- =============================================================================
SELECT
  c.relname AS table_name,
  obj_description(c.oid) AS table_comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
ORDER BY c.relname;

SELECT
  cols.table_name,
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'promoted_request_payments'
  AND cols.column_name IN (
    'signup_binding_id',
    'promotion_id',
    'specialist_id',
    'user_id',
    'amount_cents',
    'status',
    'stripe_checkout_session_id',
    'paid_at'
  )
ORDER BY cols.column_name;

SELECT
  cols.table_name,
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'promoted_request_access_grants'
  AND cols.column_name IN (
    'source_type',
    'source_payment_id',
    'revoked_at'
  )
ORDER BY cols.column_name;

SELECT
  cols.table_name,
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'promoted_request_subscription_credits'
  AND cols.column_name IN (
    'eligible_until',
    'consumed_checkout_session_id',
    'consumed_plan_code'
  )
ORDER BY cols.column_name;

-- =============================================================================
-- K) Forbidden columns must not exist on any new table (PII / secrets / tokens)
-- =============================================================================
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'promoted_request_payments',
    'promoted_request_access_grants',
    'promoted_request_subscription_credits'
  )
  AND column_name IN (
    'client_name',
    'client_email',
    'client_phone',
    'raw_description',
    'description',
    'service_request_id',
    'attribution_token',
    'public_token',
    'stripe_secret',
    'card_number',
    'payment_method_details'
  )
ORDER BY table_name, column_name;

-- Expected: zero rows

-- =============================================================================
-- L) Existing tables unchanged — column inventory for manual diff
-- =============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'billing_events'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'billing_customers'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'specialist_plan'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_request_promotion_signup_bindings'
ORDER BY ordinal_position;

-- Compare against pre-migration baseline manually; this migration must not ALTER these tables.

-- =============================================================================
-- M) Informational counts (do not prove immutability of other tables)
-- =============================================================================
SELECT COUNT(*) AS promoted_payments_total
FROM public.promoted_request_payments;

SELECT COUNT(*) AS promoted_access_grants_total
FROM public.promoted_request_access_grants;

SELECT COUNT(*) AS promoted_credits_total
FROM public.promoted_request_subscription_credits;

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
