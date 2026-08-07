-- ============================================================================
-- READ-ONLY combined post-migration verification
-- Apply AFTER: 2026-08-07_reconcile_specialist_access.sql
-- Run this entire file once in Supabase SQL editor.
--
-- No UPDATE / INSERT / DELETE / ALTER / CREATE / DROP / TRUNCATE.
-- Does NOT call reconcile_specialist_access or any other mutating RPC.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — specialists.billing_visibility_blocked
-- ============================================================================
SELECT
  '1_billing_visibility_blocked_column' AS section,
  c.column_name IS NOT NULL AS column_exists,
  c.data_type = 'boolean' AS type_is_boolean,
  c.is_nullable = 'NO' AS is_not_null,
  c.column_default IS NOT NULL
    AND c.column_default ILIKE '%false%' AS default_is_false,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: column missing'
    WHEN c.data_type <> 'boolean' THEN 'FAIL: expected boolean'
    WHEN c.is_nullable <> 'NO' THEN 'FAIL: expected NOT NULL'
    WHEN c.column_default IS NULL OR c.column_default NOT ILIKE '%false%' THEN 'FAIL: expected DEFAULT false'
    ELSE 'PASS'
  END AS section_status,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM (
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'specialists'
    AND column_name = 'billing_visibility_blocked'
) c
RIGHT JOIN (SELECT 1) x ON true;


-- ============================================================================
-- SECTION 2 — specialist_plan.lifecycle_enrolled_at
-- ============================================================================
SELECT
  '2_lifecycle_enrolled_at_column' AS section,
  c.column_name IS NOT NULL AS column_exists,
  c.data_type = 'timestamp with time zone' AS type_is_timestamptz,
  c.is_nullable = 'YES' AS is_nullable,
  CASE
    WHEN c.column_name IS NULL THEN 'FAIL: column missing'
    WHEN c.data_type <> 'timestamp with time zone' THEN 'FAIL: expected timestamptz'
    WHEN c.is_nullable <> 'YES' THEN 'FAIL: expected nullable'
    ELSE 'PASS'
  END AS section_status,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM (
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'specialist_plan'
    AND column_name = 'lifecycle_enrolled_at'
) c
RIGHT JOIN (SELECT 1) x ON true;


-- ============================================================================
-- SECTION 3 — idx_specialists_billing_visibility_blocked
-- ============================================================================
SELECT
  '3_billing_visibility_index' AS section,
  i.indexname IS NOT NULL AS index_exists,
  i.tablename = 'specialists' AS index_on_specialists,
  i.indexdef ILIKE '%billing_visibility_blocked = true%' AS partial_predicate_matches,
  CASE
    WHEN i.indexname IS NULL THEN 'FAIL: index missing'
    WHEN i.tablename <> 'specialists' THEN 'FAIL: wrong table'
    WHEN i.indexdef NOT ILIKE '%billing_visibility_blocked = true%' THEN 'FAIL: partial predicate mismatch'
    ELSE 'PASS'
  END AS section_status,
  i.indexname,
  i.tablename,
  i.indexdef
FROM pg_indexes i
WHERE i.schemaname = 'public'
  AND i.indexname = 'idx_specialists_billing_visibility_blocked'
UNION ALL
SELECT
  '3_billing_visibility_index',
  false,
  false,
  false,
  'FAIL: index missing',
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_specialists_billing_visibility_blocked'
);


-- ============================================================================
-- SECTION 4 — public.reconcile_specialist_access(uuid) security
-- ============================================================================
WITH target AS (
  SELECT pg_catalog.to_regprocedure('public.reconcile_specialist_access(uuid)') AS oid
),
fn AS (
  SELECT
    t.oid,
    p.prosecdef,
    p.proconfig,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    CASE WHEN t.oid IS NOT NULL THEN pg_catalog.pg_get_functiondef(t.oid) END AS function_definition
  FROM target t
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = t.oid
),
acl AS (
  SELECT
    fn.*,
    EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn.oid),
          pg_catalog.acldefault('f', (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = fn.oid))
        )
      ) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ) AS public_execute,
    EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn.oid),
          pg_catalog.acldefault('f', (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = fn.oid))
        )
      ) a
      JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
      WHERE r.rolname = 'anon' AND a.privilege_type = 'EXECUTE'
    ) AS anon_execute,
    EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn.oid),
          pg_catalog.acldefault('f', (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = fn.oid))
        )
      ) a
      JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
      WHERE r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE'
    ) AS authenticated_execute,
    EXISTS (
      SELECT 1
      FROM pg_catalog.aclexplode(
        COALESCE(
          (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = fn.oid),
          pg_catalog.acldefault('f', (SELECT proowner FROM pg_catalog.pg_proc WHERE oid = fn.oid))
        )
      ) a
      JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
      WHERE r.rolname = 'service_role' AND a.privilege_type = 'EXECUTE'
    ) AS service_role_execute,
    EXISTS (
      SELECT 1
      FROM unnest(COALESCE(fn.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg = 'search_path=pg_catalog, public'
    ) AS search_path_ok
  FROM fn
)
SELECT
  '4_reconcile_specialist_access_rpc' AS section,
  a.oid IS NOT NULL AS function_exists,
  a.return_type = 'jsonb' AS return_is_jsonb,
  a.prosecdef AS is_security_definer,
  a.owner_name = 'postgres' AS owner_is_postgres,
  a.search_path_ok AS search_path_is_pg_catalog_public,
  NOT a.public_execute AS public_execute_false,
  NOT a.anon_execute AS anon_execute_false,
  NOT a.authenticated_execute AS authenticated_execute_false,
  a.service_role_execute AS service_role_execute_true,
  a.function_definition NOT ILIKE '%pg_catalog.greatest%' AS no_pg_catalog_greatest,
  a.function_definition ILIKE '%GREATEST(%' AS uses_greatest_expression,
  CASE
    WHEN a.oid IS NULL THEN 'FAIL: function missing'
    WHEN a.return_type <> 'jsonb' THEN 'FAIL: return type not jsonb'
    WHEN NOT a.prosecdef THEN 'FAIL: not SECURITY DEFINER'
    WHEN a.owner_name <> 'postgres' THEN 'FAIL: owner not postgres'
    WHEN NOT a.search_path_ok THEN 'FAIL: search_path not pg_catalog, public'
    WHEN a.public_execute THEN 'FAIL: PUBLIC can EXECUTE'
    WHEN a.anon_execute THEN 'FAIL: anon can EXECUTE'
    WHEN a.authenticated_execute THEN 'FAIL: authenticated can EXECUTE'
    WHEN NOT a.service_role_execute THEN 'FAIL: service_role cannot EXECUTE'
    WHEN a.function_definition ILIKE '%pg_catalog.greatest%' THEN 'FAIL: pg_catalog.greatest in function body'
    WHEN a.function_definition NOT ILIKE '%GREATEST(%' THEN 'FAIL: missing GREATEST grace expression'
    ELSE 'PASS'
  END AS section_status,
  a.return_type,
  a.owner_name,
  a.proconfig AS search_path_config
FROM acl a;


-- ============================================================================
-- SECTION 5 — category_specialist_counts view gates
-- ============================================================================
WITH view_def AS (
  SELECT pg_catalog.pg_get_viewdef('public.category_specialist_counts'::regclass, true) AS def
)
SELECT
  '5_category_specialist_counts_view' AS section,
  to_regclass('public.category_specialist_counts') IS NOT NULL AS view_exists,
  vd.def ILIKE '%billing_visibility_blocked%' AS has_billing_gate,
  vd.def ILIKE '%is_active%' AS has_is_active_gate,
  vd.def ILIKE '%is_visible%' AS has_is_visible_gate,
  vd.def ILIKE '%status%' AS has_status_gate,
  CASE
    WHEN to_regclass('public.category_specialist_counts') IS NULL THEN 'FAIL: view missing'
    WHEN vd.def NOT ILIKE '%billing_visibility_blocked%' THEN 'FAIL: missing billing_visibility_blocked gate'
    WHEN vd.def NOT ILIKE '%is_active%' THEN 'FAIL: missing is_active gate'
    WHEN vd.def NOT ILIKE '%is_visible%' THEN 'FAIL: missing is_visible gate'
    WHEN vd.def NOT ILIKE '%status%' THEN 'FAIL: missing status gate'
    ELSE 'PASS'
  END AS section_status,
  vd.def AS view_definition
FROM view_def vd;


-- ============================================================================
-- SECTION 6 — search_specialists_local_radius gates
-- ============================================================================
WITH target AS (
  SELECT pg_catalog.to_regprocedure(
    'public.search_specialists_local_radius(double precision,double precision,double precision,text,uuid,text,integer,integer)'
  ) AS oid
),
fn_def AS (
  SELECT
    t.oid,
    CASE WHEN t.oid IS NOT NULL THEN pg_catalog.pg_get_functiondef(t.oid) END AS def
  FROM target t
)
SELECT
  '6_search_specialists_local_radius' AS section,
  fd.oid IS NOT NULL AS function_exists,
  fd.def ILIKE '%billing_visibility_blocked%' AS has_billing_gate,
  fd.def ILIKE '%is_active%' AS has_is_active_gate,
  fd.def ILIKE '%is_visible%' AS has_is_visible_gate,
  CASE
    WHEN fd.oid IS NULL THEN 'FAIL: function missing'
    WHEN fd.def NOT ILIKE '%billing_visibility_blocked%' THEN 'FAIL: missing billing_visibility_blocked gate'
    WHEN fd.def NOT ILIKE '%is_active%' THEN 'FAIL: missing is_active gate'
    WHEN fd.def NOT ILIKE '%is_visible%' THEN 'FAIL: missing is_visible gate'
    ELSE 'PASS'
  END AS section_status,
  fd.def AS function_definition
FROM fn_def fd;


-- ============================================================================
-- SECTION 7 — Legacy safety / deployment impact (READ-ONLY counts)
-- Expected immediately after migration apply (no backfill):
--   billing_visibility_blocked = true  → 0
--   lifecycle_enrolled_at IS NOT NULL  → 0
-- ============================================================================
SELECT
  '7_legacy_safety_counts' AS section,
  (SELECT COUNT(*)::bigint FROM public.specialists) AS total_specialists,
  (SELECT COUNT(*)::bigint FROM public.specialists WHERE billing_visibility_blocked = true) AS billing_blocked_true,
  (SELECT COUNT(*)::bigint FROM public.specialists WHERE billing_visibility_blocked = false) AS billing_blocked_false,
  (SELECT COUNT(*)::bigint FROM public.specialist_plan WHERE lifecycle_enrolled_at IS NOT NULL) AS lifecycle_enrolled_not_null,
  (SELECT COUNT(*)::bigint FROM public.specialist_plan WHERE lifecycle_enrolled_at IS NULL) AS lifecycle_enrolled_null,
  CASE
    WHEN (SELECT COUNT(*) FROM public.specialists WHERE billing_visibility_blocked = true) = 0
     AND (SELECT COUNT(*) FROM public.specialist_plan WHERE lifecycle_enrolled_at IS NOT NULL) = 0
    THEN 'PASS (no backfill detected)'
    ELSE 'WARN: unexpected backfill — review counts before enabling flag'
  END AS section_status;


-- ============================================================================
-- SECTION 8 — Lifecycle state distribution (pre-flag baseline)
-- ============================================================================
SELECT
  '8_lifecycle_state_distribution' AS section,
  sp.plan_status,
  COUNT(*)::bigint AS specialist_count
FROM public.specialist_plan sp
GROUP BY sp.plan_status
ORDER BY specialist_count DESC, sp.plan_status;


-- ============================================================================
-- SECTION 9 — E2E refunded payment baseline (PRE-reconciliation)
-- Payment: 9a7076d6-f99d-4f7c-a452-32303e8e398a
-- Does NOT call reconcile_specialist_access.
-- ============================================================================
SELECT
  '9_e2e_refunded_payment_baseline' AS section,
  pp.id AS payment_id,
  pp.status AS payment_status,
  pp.refunded_at,
  pp.entitlement_applied_at,
  pp.specialist_id,
  pp.plan_code AS payment_plan_code,
  pp.period_end_at,
  sp.plan_code AS current_plan_code,
  sp.plan_status AS current_plan_status,
  sp.expires_at AS current_expires_at,
  sp.grace_until AS current_grace_until,
  sp.lifecycle_enrolled_at,
  s.status AS specialist_status,
  s.is_active,
  s.is_visible,
  s.billing_visibility_blocked,
  'PRE-reconciliation baseline (no RPC called)' AS note
FROM public.plan_payments pp
LEFT JOIN public.specialist_plan sp ON sp.specialist_id = pp.specialist_id
LEFT JOIN public.specialists s ON s.id = pp.specialist_id
WHERE pp.id = '9a7076d6-f99d-4f7c-a452-32303e8e398a'::uuid;


-- ============================================================================
-- SECTION 10 — Expected refund grace timestamp (READ-ONLY compute)
-- expected_refund_grace_until = refunded_at + interval '7 days'
-- ============================================================================
SELECT
  '10_expected_refund_grace_until' AS section,
  pp.id AS payment_id,
  pp.refunded_at,
  pp.refunded_at + INTERVAL '7 days' AS expected_refund_grace_until,
  sp.grace_until AS current_grace_until_in_plan,
  sp.plan_status AS current_plan_status,
  CASE
    WHEN pp.refunded_at IS NULL THEN 'N/A: payment not refunded or missing'
    ELSE 'Computed READ-ONLY — compare after manual reconcile'
  END AS note
FROM public.plan_payments pp
LEFT JOIN public.specialist_plan sp ON sp.specialist_id = pp.specialist_id
WHERE pp.id = '9a7076d6-f99d-4f7c-a452-32303e8e398a'::uuid;


-- ============================================================================
-- SECTION 11 — Cron preflight (READ-ONLY candidate counts)
-- Shows who cron would reconcile when flag is enabled. No RPC calls.
-- ============================================================================
SELECT
  '11_cron_preflight' AS section,
  (SELECT COUNT(*)::bigint
   FROM public.specialist_plan
   WHERE plan_status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at <= pg_catalog.now()
  ) AS active_expired_candidates,
  (SELECT COUNT(*)::bigint
   FROM public.specialist_plan
   WHERE plan_status IN ('grace', 'grace_period')
     AND grace_until IS NOT NULL
     AND grace_until <= pg_catalog.now()
  ) AS grace_expired_candidates,
  pg_catalog.now() AS checked_at,
  'READ-ONLY preflight — cron not invoked' AS note;


-- ============================================================================
-- SECTION 12 — Public visibility safety (old gate vs new gate)
-- Expected delta = 0 immediately after migration (default billing_visibility_blocked=false)
-- ============================================================================
WITH old_gate AS (
  SELECT COUNT(*)::bigint AS cnt
  FROM public.specialists s
  WHERE s.status IN ('approved', 'published_unverified', 'featured_verified')
    AND s.is_active = true
    AND s.is_visible = true
    AND COALESCE(s.is_test, false) = false
),
new_gate AS (
  SELECT COUNT(*)::bigint AS cnt
  FROM public.specialists s
  WHERE s.status IN ('approved', 'published_unverified', 'featured_verified')
    AND s.is_active = true
    AND s.is_visible = true
    AND COALESCE(s.is_test, false) = false
    AND s.billing_visibility_blocked = false
)
SELECT
  '12_public_visibility_delta' AS section,
  o.cnt AS old_gate_public_count,
  n.cnt AS new_gate_public_count,
  (o.cnt - n.cnt)::bigint AS delta_hidden_by_billing,
  CASE
    WHEN o.cnt = n.cnt THEN 'PASS (delta = 0)'
    ELSE 'FAIL: billing gate hides specialists before flag enable'
  END AS section_status
FROM old_gate o, new_gate n;


-- ============================================================================
-- SECTION 13 — CONSOLIDATED PASS/FAIL SUMMARY (single row)
-- ============================================================================
WITH
col_billing AS (
  SELECT
    c.column_name IS NOT NULL
      AND c.data_type = 'boolean'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NOT NULL
      AND c.column_default ILIKE '%false%' AS ok
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'specialists'
    AND c.column_name = 'billing_visibility_blocked'
),
col_enrolled AS (
  SELECT
    c.column_name IS NOT NULL
      AND c.data_type = 'timestamp with time zone'
      AND c.is_nullable = 'YES' AS ok
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'specialist_plan'
    AND c.column_name = 'lifecycle_enrolled_at'
),
idx AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_specialists_billing_visibility_blocked'
      AND tablename = 'specialists'
      AND indexdef ILIKE '%billing_visibility_blocked = true%'
  ) AS ok
),
rpc_target AS (
  SELECT pg_catalog.to_regprocedure('public.reconcile_specialist_access(uuid)') AS oid
),
rpc AS (
  SELECT
    p.oid IS NOT NULL
      AND pg_catalog.pg_get_function_result(p.oid) = 'jsonb'
      AND p.prosecdef
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      AND EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
        WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
        JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
        WHERE r.rolname = 'anon' AND a.privilege_type = 'EXECUTE'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
        JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
        WHERE r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE'
      )
      AND EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
        JOIN pg_catalog.pg_roles r ON r.oid = a.grantee
        WHERE r.rolname = 'service_role' AND a.privilege_type = 'EXECUTE'
      )
      AND pg_catalog.pg_get_functiondef(p.oid) NOT ILIKE '%pg_catalog.greatest%'
      AND pg_catalog.pg_get_functiondef(p.oid) ILIKE '%GREATEST(%'
    AS ok
  FROM rpc_target t
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = t.oid
),
view_gate AS (
  SELECT
    to_regclass('public.category_specialist_counts') IS NOT NULL
      AND pg_catalog.pg_get_viewdef('public.category_specialist_counts'::regclass, true) ILIKE '%billing_visibility_blocked%'
      AND pg_catalog.pg_get_viewdef('public.category_specialist_counts'::regclass, true) ILIKE '%is_active%'
      AND pg_catalog.pg_get_viewdef('public.category_specialist_counts'::regclass, true) ILIKE '%is_visible%'
      AND pg_catalog.pg_get_viewdef('public.category_specialist_counts'::regclass, true) ILIKE '%status%'
    AS ok
),
search_gate AS (
  SELECT
    pg_catalog.to_regprocedure(
      'public.search_specialists_local_radius(double precision,double precision,double precision,text,uuid,text,integer,integer)'
    ) IS NOT NULL
      AND pg_catalog.pg_get_functiondef(
        pg_catalog.to_regprocedure(
          'public.search_specialists_local_radius(double precision,double precision,double precision,text,uuid,text,integer,integer)'
        )
      ) ILIKE '%billing_visibility_blocked%'
      AND pg_catalog.pg_get_functiondef(
        pg_catalog.to_regprocedure(
          'public.search_specialists_local_radius(double precision,double precision,double precision,text,uuid,text,integer,integer)'
        )
      ) ILIKE '%is_active%'
      AND pg_catalog.pg_get_functiondef(
        pg_catalog.to_regprocedure(
          'public.search_specialists_local_radius(double precision,double precision,double precision,text,uuid,text,integer,integer)'
        )
      ) ILIKE '%is_visible%'
    AS ok
),
legacy AS (
  SELECT
    (SELECT COUNT(*) FROM public.specialists WHERE billing_visibility_blocked = true) = 0
      AND (SELECT COUNT(*) FROM public.specialist_plan WHERE lifecycle_enrolled_at IS NOT NULL) = 0
    AS ok
),
public_delta AS (
  SELECT
    (SELECT COUNT(*) FROM public.specialists s
     WHERE s.status IN ('approved', 'published_unverified', 'featured_verified')
       AND s.is_active = true AND s.is_visible = true
       AND COALESCE(s.is_test, false) = false)
    =
    (SELECT COUNT(*) FROM public.specialists s
     WHERE s.status IN ('approved', 'published_unverified', 'featured_verified')
       AND s.is_active = true AND s.is_visible = true
       AND COALESCE(s.is_test, false) = false
       AND s.billing_visibility_blocked = false)
    AS ok
)
SELECT
  '13_consolidated_summary' AS section,
  COALESCE((SELECT ok FROM col_billing), false)
    AND COALESCE((SELECT ok FROM col_enrolled), false) AS columns_ok,
  COALESCE((SELECT ok FROM idx), false) AS index_ok,
  COALESCE((SELECT ok FROM rpc), false) AS rpc_security_ok,
  COALESCE((SELECT ok FROM view_gate), false) AS view_gate_ok,
  COALESCE((SELECT ok FROM search_gate), false) AS search_rpc_gate_ok,
  COALESCE((SELECT ok FROM legacy), false) AS legacy_no_backfill_ok,
  COALESCE((SELECT ok FROM public_delta), false) AS public_visibility_delta_zero,
  CASE
    WHEN NOT (
      COALESCE((SELECT ok FROM col_billing), false)
      AND COALESCE((SELECT ok FROM col_enrolled), false)
    ) THEN 'FAIL'
    WHEN NOT COALESCE((SELECT ok FROM idx), false) THEN 'FAIL'
    WHEN NOT COALESCE((SELECT ok FROM rpc), false) THEN 'FAIL'
    WHEN NOT COALESCE((SELECT ok FROM view_gate), false) THEN 'FAIL'
    WHEN NOT COALESCE((SELECT ok FROM search_gate), false) THEN 'FAIL'
    WHEN NOT COALESCE((SELECT ok FROM legacy), false) THEN 'FAIL'
    WHEN NOT COALESCE((SELECT ok FROM public_delta), false) THEN 'FAIL'
    ELSE 'PASS'
  END AS overall_status,
  pg_catalog.now() AS verified_at;
