-- Read-only verification after applying 2026-08-06_plan_payments.sql
-- Run in Supabase SQL editor. Review each section manually.

-- =============================================================================
-- A) Table exists
-- =============================================================================
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'plan_payments';

-- Expected: 1 row

-- =============================================================================
-- B) Columns — plan_payments
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'plan_payments'
ORDER BY c.ordinal_position;

-- Expected columns (in order):
-- id, specialist_id, user_id, provider, status, plan_code, billing_interval,
-- currency, gross_amount_cents, discount_amount_cents, net_amount_cents,
-- period_months, provider_customer_id, provider_price_id,
-- stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id,
-- promoted_credit_id, checkout_created_at, paid_at, failed_at, expired_at,
-- refunded_at, disputed_at, failure_code,
-- entitlement_applied_at, prior_expires_at, period_end_at,
-- metadata, created_at, updated_at

-- =============================================================================
-- C) Allowed statuses (exact set)
-- =============================================================================
SELECT pg_get_constraintdef(c.oid) AS status_check_def
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'plan_payments'
  AND c.conname = 'plan_payments_status_check';

-- Expected substring:
-- CHECK ((status = ANY (ARRAY['pending'::text, 'checkout_created'::text, 'paid'::text,
-- 'failed'::text, 'expired'::text, 'refunded'::text, 'disputed'::text])))

-- =============================================================================
-- D) Key CHECK constraints — exact definitions
-- =============================================================================
SELECT
  c.conname,
  pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'plan_payments'
  AND c.contype = 'c'
  AND c.conname IN (
    'plan_payments_promoted_credit_discount_pair',
    'plan_payments_entitlement_status_check',
    'plan_payments_entitlement_fields_pair',
    'plan_payments_terminal_requires_paid_at',
    'plan_payments_terminal_requires_intent',
    'plan_payments_refunded_requires_refunded_at',
    'plan_payments_disputed_requires_disputed_at',
    'plan_payments_failed_requires_failed_at',
    'plan_payments_expired_requires_expired_at',
    'plan_payments_net_equals_gross_minus_discount'
  )
ORDER BY c.conname;

-- Expected highlights:
-- plan_payments_promoted_credit_discount_pair:
--   (promoted_credit_id IS NULL AND discount_amount_cents = 0)
--   OR (promoted_credit_id IS NOT NULL AND discount_amount_cents = 1000)
-- plan_payments_entitlement_status_check:
--   entitlement_applied_at IS NULL OR status IN ('paid','refunded','disputed')

-- =============================================================================
-- E) Foreign keys + ON DELETE actions
-- =============================================================================
SELECT
  con.conname AS constraint_name,
  att.attname AS column_name,
  frel.relname AS foreign_table,
  fatt.attname AS foreign_column,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
JOIN pg_class frel ON frel.oid = con.confrelid
JOIN pg_attribute fatt ON fatt.attrelid = con.confrelid AND fatt.attnum = ANY (con.confkey)
WHERE nsp.nspname = 'public'
  AND rel.relname = 'plan_payments'
  AND con.contype = 'f'
ORDER BY con.conname;

-- Expected:
-- specialist_id → specialists(id) ON DELETE RESTRICT
-- promoted_credit_id → promoted_request_subscription_credits(id) ON DELETE RESTRICT
-- user_id has no FK row

-- =============================================================================
-- F) Partial index predicates — promoted credit reservation + paid retry queue
-- =============================================================================
SELECT
  i.relname AS index_name,
  pg_get_expr(i.indpred, i.indrelid) AS index_predicate,
  ix.indisunique AS is_unique
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'plan_payments'
  AND ix.indpred IS NOT NULL
ORDER BY i.relname;

-- Expected uq_plan_payments_promoted_credit_reserved predicate contains:
-- promoted_credit_id IS NOT NULL
-- status IN ('pending','checkout_created','paid','refunded','disputed')
-- Expected idx_plan_payments_paid_unapplied_entitlement predicate contains:
-- status = 'paid' AND entitlement_applied_at IS NULL

-- =============================================================================
-- G) Reservation index exists and is UNIQUE
-- =============================================================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'plan_payments'
  AND indexname = 'uq_plan_payments_promoted_credit_reserved';

-- Expected: UNIQUE INDEX ... WHERE promoted_credit_id IS NOT NULL
-- AND status IN ('pending', 'checkout_created', 'paid', 'refunded', 'disputed')

-- =============================================================================
-- H) All indexes on plan_payments
-- =============================================================================
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'plan_payments'
ORDER BY indexname;

-- Expected includes:
-- plan_payments_pkey
-- plan_payments_stripe_checkout_session_id_unique
-- plan_payments_stripe_payment_intent_id_unique
-- plan_payments_stripe_charge_id_unique
-- uq_plan_payments_promoted_credit_reserved
-- idx_plan_payments_specialist_status_created
-- idx_plan_payments_paid_unapplied_entitlement

-- Must NOT include legacy:
-- uq_plan_payments_one_entitlement_per_promoted_credit

-- =============================================================================
-- I) RLS enabled, no policies
-- =============================================================================
SELECT relname, relrowsecurity
FROM pg_class
JOIN pg_namespace nsp ON nsp.oid = relnamespace
WHERE nsp.nspname = 'public'
  AND relname = 'plan_payments';

-- Expected: relrowsecurity = true

SELECT polname, polcmd, polroles::regrole[]
FROM pg_policy pol
JOIN pg_class rel ON rel.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'plan_payments';

-- Expected: 0 rows

-- =============================================================================
-- J) Grants
-- =============================================================================
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'plan_payments'
ORDER BY grantee, privilege_type;

-- Expected: service_role has privileges; anon/authenticated absent

-- =============================================================================
-- K) No updated_at trigger
-- =============================================================================
SELECT
  tg.tgname AS trigger_name,
  pg_get_triggerdef(tg.oid) AS trigger_def
FROM pg_trigger tg
JOIN pg_class rel ON rel.oid = tg.tgrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'plan_payments'
  AND NOT tg.tgisinternal;

-- Expected: 0 rows (runtime must set updated_at explicitly)

-- =============================================================================
-- L) Phase 4G-A schema marker present
-- =============================================================================
SELECT c.conname
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'plan_payments'
  AND c.conname = 'plan_payments_promoted_credit_discount_pair';

-- Expected: 1 row

-- =============================================================================
-- M) Row counts (post-apply baseline)
-- =============================================================================
SELECT COUNT(*) AS plan_payments_total
FROM public.plan_payments;

-- Expected: 0 immediately after migration
