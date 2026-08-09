-- ============================================================================
-- READ-ONLY post-migration verification
-- Apply AFTER: 2026-08-09_partner_payout_credit_ledger.sql
-- Run once in Supabase SQL editor.
--
-- No UPDATE / INSERT / DELETE / ALTER / CREATE / DROP / TRUNCATE.
-- Does NOT call mutating RPCs.
-- ============================================================================


-- ============================================================================
-- SECTION A — partner_commissions consumption columns
-- ============================================================================
SELECT
  'A1_credited_cents_column' AS section,
  c.column_name IS NOT NULL AS column_exists,
  c.data_type = 'integer' AS type_is_integer,
  c.is_nullable = 'NO' AS is_not_null,
  c.column_default IS NOT NULL AS has_default,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: credited_cents missing'
    WHEN c.data_type <> 'integer' THEN 'FAIL: expected integer'
    WHEN c.is_nullable <> 'NO' THEN 'FAIL: expected NOT NULL'
    WHEN c.column_default IS NULL THEN 'FAIL: expected DEFAULT'
    ELSE 'PASS'
  END AS section_status,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM (
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_commissions'
    AND column_name = 'credited_cents'
) c
RIGHT JOIN (SELECT 1) x ON true;


SELECT
  'A2_paid_out_cents_column' AS section,
  c.column_name IS NOT NULL AS column_exists,
  c.data_type = 'integer' AS type_is_integer,
  c.is_nullable = 'NO' AS is_not_null,
  c.column_default IS NOT NULL AS has_default,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: paid_out_cents missing'
    WHEN c.data_type <> 'integer' THEN 'FAIL: expected integer'
    WHEN c.is_nullable <> 'NO' THEN 'FAIL: expected NOT NULL'
    WHEN c.column_default IS NULL THEN 'FAIL: expected DEFAULT'
    ELSE 'PASS'
  END AS section_status,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM (
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_commissions'
    AND column_name = 'paid_out_cents'
) c
RIGHT JOIN (SELECT 1) x ON true;


SELECT
  'A3_commission_allocation_constraints' AS section,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commissions_credited_nonneg'
      AND conrelid = 'public.partner_commissions'::regclass
  ) AS credited_nonneg_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commissions_paid_out_nonneg'
      AND conrelid = 'public.partner_commissions'::regclass
  ) AS paid_out_nonneg_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commissions_allocation_lte_amount'
      AND conrelid = 'public.partner_commissions'::regclass
  ) AS allocation_lte_amount_exists,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'partner_commissions_credited_nonneg'
        AND conrelid = 'public.partner_commissions'::regclass
    ) THEN 'FAIL: credited_nonneg missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'partner_commissions_paid_out_nonneg'
        AND conrelid = 'public.partner_commissions'::regclass
    ) THEN 'FAIL: paid_out_nonneg missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'partner_commissions_allocation_lte_amount'
        AND conrelid = 'public.partner_commissions'::regclass
    ) THEN 'FAIL: allocation_lte_amount missing'
    ELSE 'PASS'
  END AS section_status;


SELECT
  'A4_commission_row_allocation_invariant_sample' AS section,
  COUNT(*) FILTER (
    WHERE credited_cents < 0
       OR paid_out_cents < 0
       OR credited_cents + paid_out_cents > amount_cents
  ) AS violating_rows,
  COUNT(*) AS total_rows,
  CASE
    WHEN COUNT(*) FILTER (
      WHERE credited_cents < 0
         OR paid_out_cents < 0
         OR credited_cents + paid_out_cents > amount_cents
    ) > 0 THEN 'FAIL: row allocation invariant violated'
    ELSE 'PASS'
  END AS section_status
FROM public.partner_commissions;


SELECT
  'A5_commission_payout_id_fk' AS section,
  c.column_name IS NOT NULL AS payout_id_column_exists,
  fk.conname IS NOT NULL AS fk_exists,
  fk.confrelid = 'public.partner_payouts'::regclass AS fk_targets_partner_payouts,
  fk.confdeltype = 'n' AS fk_on_delete_set_null,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: payout_id column missing'
    WHEN fk.conname IS NULL THEN 'FAIL: payout_id FK missing'
    WHEN fk.confrelid <> 'public.partner_payouts'::regclass THEN 'FAIL: FK wrong target'
    WHEN fk.confdeltype <> 'n' THEN 'FAIL: expected ON DELETE SET NULL'
    ELSE 'PASS'
  END AS section_status,
  fk.conname AS fk_name
FROM (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_commissions'
    AND column_name = 'payout_id'
) c
LEFT JOIN LATERAL (
  SELECT con.conname, con.confrelid, con.confdeltype
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
  WHERE con.contype = 'f'
    AND con.conrelid = 'public.partner_commissions'::regclass
    AND att.attname = 'payout_id'
  LIMIT 1
) fk ON true
RIGHT JOIN (SELECT 1) x ON true;


-- ============================================================================
-- SECTION B — partner_credit_applications
-- ============================================================================
SELECT
  'B1_credit_applications_table' AS section,
  t.tablename IS NOT NULL AS table_exists,
  CASE
    WHEN t.tablename IS NULL THEN 'FAIL: table missing'
    ELSE 'PASS'
  END AS section_status
FROM pg_tables t
RIGHT JOIN (SELECT 1) x ON t.schemaname = 'public' AND t.tablename = 'partner_credit_applications';


SELECT
  'B2_credit_applications_required_columns' AS section,
  COUNT(*) FILTER (WHERE column_name IN (
    'id', 'partner_id', 'commission_id', 'specialist_id', 'amount_cents', 'currency',
    'status', 'note', 'created_at', 'updated_at', 'applied_at', 'rejected_at',
    'rejection_reason', 'created_by_user_id', 'idempotency_key'
  )) AS required_column_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE column_name IN (
      'id', 'partner_id', 'commission_id', 'specialist_id', 'amount_cents', 'currency',
      'status', 'note', 'created_at', 'updated_at', 'applied_at', 'rejected_at',
      'rejection_reason', 'created_by_user_id', 'idempotency_key'
    )) < 15 THEN 'FAIL: missing required columns'
    ELSE 'PASS'
  END AS section_status,
  array_agg(column_name ORDER BY column_name) AS present_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'partner_credit_applications';


SELECT
  'B2a_legacy_note_column_preserved' AS section,
  c.column_name IS NOT NULL AS note_exists,
  c.is_nullable = 'YES' AS note_nullable,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: legacy note column missing'
    ELSE 'PASS'
  END AS section_status
FROM (
  SELECT column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_credit_applications'
    AND column_name = 'note'
) c
RIGHT JOIN (SELECT 1) x ON true;


SELECT
  'B2b_commission_id_not_null' AS section,
  c.column_name IS NOT NULL AS column_exists,
  c.is_nullable = 'NO' AS is_not_null,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: commission_id missing'
    WHEN c.is_nullable <> 'NO' THEN 'FAIL: commission_id must be NOT NULL'
    ELSE 'PASS'
  END AS section_status
FROM (
  SELECT column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_credit_applications'
    AND column_name = 'commission_id'
) c
RIGHT JOIN (SELECT 1) x ON true;


SELECT
  'B2c_idempotency_key_not_null' AS section,
  c.column_name IS NOT NULL AS column_exists,
  c.is_nullable = 'NO' AS is_not_null,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: idempotency_key missing'
    WHEN c.is_nullable <> 'NO' THEN 'FAIL: idempotency_key must be NOT NULL'
    ELSE 'PASS'
  END AS section_status
FROM (
  SELECT column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_credit_applications'
    AND column_name = 'idempotency_key'
) c
RIGHT JOIN (SELECT 1) x ON true;


SELECT
  'B2d_status_default_pending' AS section,
  c.column_default IS NOT NULL AS has_default,
  c.column_default ILIKE '%pending%' AS default_is_pending,
  CASE
    WHEN c.column_default IS NULL THEN 'FAIL: status default missing'
    WHEN c.column_default NOT ILIKE '%pending%' THEN 'FAIL: status default is not pending'
    ELSE 'PASS'
  END AS section_status,
  c.column_default
FROM (
  SELECT column_name, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'partner_credit_applications'
    AND column_name = 'status'
) c
RIGHT JOIN (SELECT 1) x ON true;


SELECT
  'B2e_legacy_status_values_not_allowed' AS section,
  pg_get_constraintdef(oid) AS status_check_def,
  pg_get_constraintdef(oid) ILIKE '%pending%'
    AND pg_get_constraintdef(oid) ILIKE '%applied%'
    AND pg_get_constraintdef(oid) ILIKE '%rejected%'
    AND pg_get_constraintdef(oid) ILIKE '%cancelled%' AS target_statuses_present,
  pg_get_constraintdef(oid) NOT ILIKE '%reserved%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%consumed%' AS legacy_statuses_absent,
  CASE
    WHEN pg_get_constraintdef(oid) IS NULL THEN 'FAIL: status CHECK missing'
    WHEN pg_get_constraintdef(oid) ILIKE '%reserved%'
      OR pg_get_constraintdef(oid) ILIKE '%consumed%' THEN 'FAIL: legacy status values still allowed'
    WHEN pg_get_constraintdef(oid) NOT ILIKE '%pending%' THEN 'FAIL: pending status missing from CHECK'
    ELSE 'PASS'
  END AS section_status
FROM pg_constraint
WHERE conname = 'partner_credit_applications_status_check';


SELECT
  'B2f_empty_table_no_synthetic_rows' AS section,
  COUNT(*) AS row_count,
  COUNT(*) FILTER (WHERE status IN ('reserved', 'consumed')) AS legacy_status_rows,
  CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('reserved', 'consumed')) > 0
      THEN 'FAIL: legacy status rows present after conversion'
    ELSE 'PASS'
  END AS section_status
FROM public.partner_credit_applications;


SELECT
  'B3_credit_applications_constraints' AS section,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_credit_applications'::regclass
      AND contype = 'p'
  ) AS pk_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_credit_applications_status_check'
  ) AS status_check_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_credit_applications_amount_positive'
  ) AS amount_positive_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_credit_applications_currency_check'
  ) AS currency_check_exists,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.partner_credit_applications'::regclass AND contype = 'p'
    ) THEN 'FAIL: PK missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'partner_credit_applications_status_check'
    ) THEN 'FAIL: status CHECK missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'partner_credit_applications_amount_positive'
    ) THEN 'FAIL: amount CHECK missing'
    ELSE 'PASS'
  END AS section_status;


SELECT
  'B4_credit_applications_fks' AS section,
  EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND con.conrelid = 'public.partner_credit_applications'::regclass
      AND att.attname = 'partner_id'
      AND con.confrelid = 'public.partners'::regclass
  ) AS partner_fk_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND con.conrelid = 'public.partner_credit_applications'::regclass
      AND att.attname = 'commission_id'
      AND con.confrelid = 'public.partner_commissions'::regclass
      AND con.confdeltype = 'r'
  ) AS commission_fk_restrict_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND con.conrelid = 'public.partner_credit_applications'::regclass
      AND att.attname = 'specialist_id'
      AND con.confrelid = 'public.specialists'::regclass
      AND con.confdeltype = 'n'
  ) AS specialist_fk_set_null_exists,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f'
        AND con.conrelid = 'public.partner_credit_applications'::regclass
        AND att.attname = 'partner_id'
    ) THEN 'FAIL: partner_id FK missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f'
        AND con.conrelid = 'public.partner_credit_applications'::regclass
        AND att.attname = 'commission_id'
    ) THEN 'FAIL: commission_id FK missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f'
        AND con.conrelid = 'public.partner_credit_applications'::regclass
        AND att.attname = 'commission_id'
        AND con.confdeltype = 'r'
    ) THEN 'FAIL: commission_id FK must be ON DELETE RESTRICT'
    ELSE 'PASS'
  END AS section_status;


SELECT
  'B5_credit_applications_idempotency_unique' AS section,
  i.indexname IS NOT NULL AS unique_index_exists,
  i.indexdef ILIKE '%UNIQUE%' AS is_unique,
  i.indexdef ILIKE '%idempotency_key%' AS on_idempotency_key,
  CASE
    WHEN i.indexname IS NULL THEN 'FAIL: idempotency UNIQUE index missing'
    WHEN i.indexdef NOT ILIKE '%UNIQUE%' THEN 'FAIL: index not UNIQUE'
    ELSE 'PASS'
  END AS section_status,
  i.indexname,
  i.indexdef
FROM pg_indexes i
RIGHT JOIN (SELECT 1) x ON i.schemaname = 'public'
  AND i.tablename = 'partner_credit_applications'
  AND i.indexname = 'uq_partner_credit_applications_idempotency_key';


SELECT
  'B6_credit_applications_indexes' AS section,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'partner_credit_applications'
      AND indexname = 'idx_partner_credit_applications_partner_created'
  ) AS partner_created_idx,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'partner_credit_applications'
      AND indexname = 'idx_partner_credit_applications_commission_created'
  ) AS commission_created_idx,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'partner_credit_applications'
      AND indexname = 'idx_partner_credit_applications_status_created'
  ) AS status_created_idx,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
        AND tablename = 'partner_credit_applications'
        AND indexname = 'idx_partner_credit_applications_partner_created'
    ) THEN 'FAIL: partner_created index missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
        AND tablename = 'partner_credit_applications'
        AND indexname = 'idx_partner_credit_applications_commission_created'
    ) THEN 'FAIL: commission_created index missing'
    ELSE 'PASS'
  END AS section_status;


SELECT
  'B7_credit_applications_rls' AS section,
  c.relrowsecurity AS rls_enabled,
  (
    SELECT COUNT(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'partner_credit_applications'
  ) AS policy_count,
  has_table_privilege('anon', 'public.partner_credit_applications', 'SELECT') AS anon_select,
  has_table_privilege('authenticated', 'public.partner_credit_applications', 'SELECT') AS auth_select,
  has_table_privilege('service_role', 'public.partner_credit_applications', 'SELECT') AS service_select,
  CASE
    WHEN NOT c.relrowsecurity THEN 'FAIL: RLS not enabled'
    WHEN (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'partner_credit_applications') > 0
      THEN 'FAIL: unexpected RLS policies'
    WHEN has_table_privilege('anon', 'public.partner_credit_applications', 'SELECT') THEN 'FAIL: anon has SELECT'
    WHEN has_table_privilege('authenticated', 'public.partner_credit_applications', 'SELECT') THEN 'FAIL: authenticated has SELECT'
    WHEN NOT has_table_privilege('service_role', 'public.partner_credit_applications', 'SELECT') THEN 'FAIL: service_role missing access'
    ELSE 'PASS'
  END AS section_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'partner_credit_applications';


-- ============================================================================
-- SECTION C — partner_payouts operational columns (preserve existing semantics)
-- ============================================================================
SELECT
  'C1_payouts_table_preserved' AS section,
  t.tablename IS NOT NULL AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_payouts_status_check'
  ) AS status_check_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_payouts'
      AND column_name IN ('amount_cents', 'currency', 'status', 'payment_reference', 'paid_at')
  ) AS core_columns_exist,
  CASE
    WHEN t.tablename IS NULL THEN 'FAIL: partner_payouts missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'partner_payouts_status_check'
    ) THEN 'FAIL: status CHECK missing'
    ELSE 'PASS'
  END AS section_status
FROM pg_tables t
RIGHT JOIN (SELECT 1) x ON t.schemaname = 'public' AND t.tablename = 'partner_payouts';


SELECT
  'C2_payouts_operational_columns' AS section,
  COUNT(*) FILTER (WHERE column_name IN (
    'requested_at', 'ready_at', 'cancelled_at', 'requested_amount_cents', 'admin_note'
  )) AS new_column_count,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_payouts' AND column_name = 'paid_at'
  ) AS paid_at_preserved,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_payouts' AND column_name = 'payment_reference'
  ) AS payment_reference_preserved,
  CASE
    WHEN COUNT(*) FILTER (WHERE column_name IN (
      'requested_at', 'ready_at', 'cancelled_at', 'requested_amount_cents', 'admin_note'
    )) < 5 THEN 'FAIL: missing operational columns'
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'partner_payouts' AND column_name = 'paid_at'
    ) THEN 'FAIL: paid_at missing'
    ELSE 'PASS'
  END AS section_status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'partner_payouts';


SELECT
  'C3_payouts_status_values' AS section,
  pg_get_constraintdef(oid) AS status_check_def,
  pg_get_constraintdef(oid) ILIKE '%draft%'
    AND pg_get_constraintdef(oid) ILIKE '%ready%'
    AND pg_get_constraintdef(oid) ILIKE '%paid%'
    AND pg_get_constraintdef(oid) ILIKE '%cancelled%' AS canonical_statuses_present,
  CASE
    WHEN pg_get_constraintdef(oid) NOT ILIKE '%draft%' THEN 'FAIL: draft status missing from CHECK'
    WHEN pg_get_constraintdef(oid) NOT ILIKE '%paid%' THEN 'FAIL: paid status missing from CHECK'
    ELSE 'PASS'
  END AS section_status
FROM pg_constraint
WHERE conname = 'partner_payouts_status_check';


SELECT
  'C4_payouts_indexes' AS section,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'partner_payouts'
      AND indexname = 'idx_partner_payouts_partner_created'
  ) AS partner_created_idx,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'partner_payouts'
      AND indexname = 'idx_partner_payouts_status_created'
  ) AS status_created_idx,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'partner_payouts'
        AND indexname = 'idx_partner_payouts_status_created'
    ) THEN 'FAIL: status_created index missing'
    ELSE 'PASS'
  END AS section_status;


SELECT
  'C5_payouts_rls_unchanged_safe' AS section,
  c.relrowsecurity AS rls_enabled,
  (
    SELECT COUNT(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'partner_payouts'
  ) AS policy_count,
  has_table_privilege('anon', 'public.partner_payouts', 'SELECT') AS anon_select,
  has_table_privilege('authenticated', 'public.partner_payouts', 'SELECT') AS auth_select,
  has_table_privilege('service_role', 'public.partner_payouts', 'SELECT') AS service_select,
  CASE
    WHEN NOT c.relrowsecurity THEN 'FAIL: RLS not enabled on partner_payouts'
    WHEN (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'partner_payouts') > 0
      THEN 'FAIL: unexpected browser policies on partner_payouts'
    WHEN has_table_privilege('anon', 'public.partner_payouts', 'SELECT') THEN 'FAIL: anon SELECT on payouts'
    WHEN NOT has_table_privilege('service_role', 'public.partner_payouts', 'SELECT') THEN 'FAIL: service_role missing payouts access'
    ELSE 'PASS'
  END AS section_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'partner_payouts';


-- ============================================================================
-- SECTION D — forbidden sensitive columns absent from new additions
-- ============================================================================
SELECT
  'D_forbidden_columns_absent' AS section,
  COUNT(*) AS forbidden_column_count,
  array_agg(table_name || '.' || column_name ORDER BY table_name, column_name) AS forbidden_found,
  CASE
    WHEN COUNT(*) > 0 THEN 'FAIL: forbidden columns present'
    ELSE 'PASS'
  END AS section_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('partner_credit_applications', 'partner_payouts', 'partner_commissions')
  AND column_name IN (
    'client_email', 'client_phone', 'client_name',
    'card_number', 'card_token', 'payment_method_details',
    'bank_password', 'online_banking_password',
    'stripe_secret', 'webhook_payload',
    'attribution_token', 'public_token',
    'iban', 'bic', 'bank_account_number'
  );


-- ============================================================================
-- SECTION E — payout lifecycle documentation present (COMMENT sanity)
-- ============================================================================
SELECT
  'E_payout_table_comment' AS section,
  obj_description('public.partner_payouts'::regclass, 'pg_class') IS NOT NULL AS has_table_comment,
  obj_description('public.partner_payouts'::regclass, 'pg_class') ILIKE '%manual bank%' AS mentions_manual_bank,
  obj_description('public.partner_payouts'::regclass, 'pg_class') ILIKE '%credential%' AS mentions_no_credentials,
  CASE
    WHEN obj_description('public.partner_payouts'::regclass, 'pg_class') IS NULL THEN 'FAIL: table comment missing'
    WHEN obj_description('public.partner_payouts'::regclass, 'pg_class') NOT ILIKE '%manual%' THEN 'WARN: comment may not document manual transfer'
    ELSE 'PASS'
  END AS section_status,
  LEFT(obj_description('public.partner_payouts'::regclass, 'pg_class'), 200) AS comment_preview;


-- ============================================================================
-- SECTION F — informational row counts (read-only)
-- ============================================================================
SELECT 'F_counts_partners' AS section, COUNT(*) AS row_count FROM public.partners;
SELECT 'F_counts_partner_attributions' AS section, COUNT(*) AS row_count FROM public.partner_attributions;
SELECT 'F_counts_partner_commissions' AS section, COUNT(*) AS row_count FROM public.partner_commissions;
SELECT 'F_counts_partner_credit_applications' AS section, COUNT(*) AS row_count FROM public.partner_credit_applications;
SELECT 'F_counts_partner_payouts' AS section, COUNT(*) AS row_count FROM public.partner_payouts;
SELECT 'F_counts_billing_subscriptions' AS section, COUNT(*) AS row_count FROM public.billing_subscriptions;
SELECT 'F_counts_specialists' AS section, COUNT(*) AS row_count FROM public.specialists;


-- ============================================================================
-- SECTION G — consolidated PASS/FAIL summary
-- ============================================================================
WITH checks AS (
  SELECT section_status FROM (
    SELECT CASE
      WHEN c.column_name IS NULL THEN 'FAIL'
      ELSE 'PASS'
    END AS section_status
    FROM (
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'partner_commissions'
        AND column_name IN ('credited_cents', 'paid_out_cents')
    ) cols
    RIGHT JOIN (SELECT unnest(ARRAY['credited_cents', 'paid_out_cents']) AS col) expected
      ON cols.column_name = expected.col
  ) x
  UNION ALL
  SELECT CASE WHEN to_regclass('public.partner_credit_applications') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
      AND tablename = 'partner_credit_applications'
      AND indexname = 'uq_partner_credit_applications_idempotency_key'
  ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_credit_applications'
      AND column_name = 'commission_id' AND is_nullable = 'NO'
  ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_credit_applications'
      AND column_name = 'idempotency_key' AND is_nullable = 'NO'
  ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_credit_applications_status_check'
      AND pg_get_constraintdef(oid) ILIKE '%pending%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%reserved%'
  ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_payouts'
      AND column_name = 'requested_at'
  ) THEN 'PASS' ELSE 'FAIL' END
)
SELECT
  'G_summary' AS section,
  COUNT(*) FILTER (WHERE section_status = 'PASS') AS pass_count,
  COUNT(*) FILTER (WHERE section_status = 'FAIL') AS fail_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE section_status = 'FAIL') > 0 THEN 'FAIL'
    ELSE 'PASS'
  END AS overall_status
FROM checks;
