-- Read-only verification after applying 2026-08-06_billing_subscriptions.sql
-- Run in Supabase SQL editor. Review each section manually.

-- =============================================================================
-- 1) Table exists
-- =============================================================================
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'billing_subscriptions';

-- Expected: 1 row

-- =============================================================================
-- 2) Columns: types, nullability, defaults
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'billing_subscriptions'
ORDER BY c.ordinal_position;

-- Expected columns (in order):
-- id, specialist_id, provider, provider_customer_id, provider_subscription_id,
-- provider_price_id, plan_code, status, cancel_at_period_end,
-- current_period_start, current_period_end, trial_start, trial_end,
-- canceled_at, ended_at, created_at, updated_at, last_provider_event_created_at

-- =============================================================================
-- 3) Primary key
-- =============================================================================
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'p';

-- Expected: PRIMARY KEY (id)

-- =============================================================================
-- 4) UNIQUE(provider, provider_subscription_id)
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'u'
ORDER BY con.conname;

-- Expected: UNIQUE (provider, provider_subscription_id)

-- =============================================================================
-- 5) Partial current-subscription UNIQUE on specialist_id
-- =============================================================================
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'billing_subscriptions'
  AND indexname = 'uq_billing_subscriptions_one_current_per_specialist';

-- Expected predicate:
-- WHERE status IN ('incomplete','trialing','active','past_due','unpaid','paused')

-- =============================================================================
-- 6) CHECK constraints — provider, plan_code, status
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'c'
ORDER BY con.conname;

-- Expected CHECK includes:
-- provider = 'stripe'
-- plan_code IN ('basic','premium')
-- status IN ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
-- current_period pair/range
-- trial pair/range

-- =============================================================================
-- 7) Period pair/range CHECK (explicit)
-- =============================================================================
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'c'
  AND con.conname IN (
    'billing_subscriptions_current_period_pair_check',
    'billing_subscriptions_trial_period_pair_check'
  )
ORDER BY con.conname;

-- Expected: both pair/range CHECK constraints present

-- =============================================================================
-- 8) FK specialist_id → specialists
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'f';

-- Expected: FOREIGN KEY (specialist_id) REFERENCES specialists(id)

-- =============================================================================
-- 9) ON DELETE RESTRICT
-- =============================================================================
SELECT
  con.conname,
  CASE con.confdeltype
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'a' THEN 'NO ACTION'
    ELSE con.confdeltype::text
  END AS on_delete_action
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'f';

-- Expected: RESTRICT

-- =============================================================================
-- 10) No FK to auth.users
-- =============================================================================
SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) ILIKE '%auth.users%';

-- Expected: zero rows

-- =============================================================================
-- 11) No FK to billing_customers
-- =============================================================================
SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'billing_subscriptions'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) ILIKE '%billing_customers%';

-- Expected: zero rows

-- =============================================================================
-- 12) RLS enabled
-- =============================================================================
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'billing_subscriptions';

-- Expected: relrowsecurity = true

-- =============================================================================
-- 13) Policies = 0
-- =============================================================================
SELECT cls.relname AS table_name, pol.polname AS policy_name
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public'
  AND cls.relname = 'billing_subscriptions'
ORDER BY pol.polname;

-- Expected: zero rows

-- =============================================================================
-- 14) Grants for core roles
-- =============================================================================
SELECT table_name, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'billing_subscriptions'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY grantee, privilege_type;

-- =============================================================================
-- 15) Dangerous anon/authenticated grants — expect zero
-- =============================================================================
SELECT table_name, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'billing_subscriptions'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN (
    'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'SELECT'
  )
ORDER BY grantee, privilege_type;

-- Expected: zero rows

-- =============================================================================
-- 16) Indexes and predicates
-- =============================================================================
SELECT t.relname AS table_name, i.relname AS index_name, pg_get_indexdef(i.oid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'billing_subscriptions'
ORDER BY i.relname;

-- Expected indexes:
-- PK on id
-- billing_subscriptions_provider_subscription_unique (UNIQUE provider+subscription)
-- uq_billing_subscriptions_one_current_per_specialist (partial UNIQUE specialist_id)
-- idx_billing_subscriptions_specialist_created
-- idx_billing_subscriptions_provider_customer_created
-- idx_billing_subscriptions_status_current_period_end
-- idx_billing_subscriptions_last_provider_event_created

-- =============================================================================
-- 17) Table and key column comments
-- =============================================================================
SELECT
  c.relname AS table_name,
  obj_description(c.oid) AS table_comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'billing_subscriptions';

SELECT
  cols.column_name,
  pg_catalog.col_description(
    format('%I.%I', cols.table_schema, cols.table_name)::regclass,
    cols.ordinal_position
  ) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'billing_subscriptions'
  AND cols.column_name IN (
    'specialist_id',
    'provider_customer_id',
    'provider_subscription_id',
    'provider_price_id',
    'plan_code',
    'status',
    'current_period_end',
    'last_provider_event_created_at'
  )
ORDER BY cols.column_name;

-- Expected: non-null comments on table and listed columns

-- =============================================================================
-- 18) specialist_plan unchanged — column inventory for manual diff
-- =============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'specialist_plan'
ORDER BY ordinal_position;

-- Compare against pre-migration baseline manually; this migration must not ALTER specialist_plan.

-- =============================================================================
-- 19) billing_customers unchanged — column inventory for manual diff
-- =============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'billing_customers'
ORDER BY ordinal_position;

-- Compare against pre-migration baseline manually; this migration must not ALTER billing_customers.

-- =============================================================================
-- 20) billing_events unchanged — column inventory for manual diff
-- =============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'billing_events'
ORDER BY ordinal_position;

-- Compare against pre-migration baseline manually; this migration must not ALTER billing_events.

-- =============================================================================
-- 21) Forbidden columns must not exist (PII / secrets / unrelated entities)
-- =============================================================================
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'billing_subscriptions'
  AND column_name IN (
    'client_name',
    'client_email',
    'client_phone',
    'description',
    'service_request_id',
    'attribution_token',
    'public_token',
    'card_number',
    'payment_method_details',
    'webhook_payload',
    'invoice_pdf',
    'hosted_invoice_url',
    'early_access_until',
    'profile_trial_until'
  )
ORDER BY column_name;

-- Expected: zero rows

-- =============================================================================
-- 22) Informational counts (do not prove immutability of other tables)
-- =============================================================================
SELECT COUNT(*) AS billing_subscriptions_total
FROM public.billing_subscriptions;

SELECT COUNT(*) AS specialist_plan_total
FROM public.specialist_plan;

SELECT COUNT(*) AS billing_customers_total
FROM public.billing_customers;

SELECT COUNT(*) AS billing_events_total
FROM public.billing_events;

SELECT COUNT(*) AS promoted_payments_total
FROM public.promoted_request_payments;

SELECT COUNT(*) AS specialists_total
FROM public.specialists;
