-- Read-only verification after applying 2026-08-15_service_request_timing.sql
-- Run in Supabase SQL Editor. Review each section manually.

-- =============================================================================
-- A) Summary — columns, constraints, legacy NULL timing, row count
-- =============================================================================
WITH timing_columns AS (
  SELECT
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'service_requests'
    AND c.column_name IN (
      'service_timing_type',
      'service_timing_date',
      'service_timing_time',
      'service_timing_date_end',
      'service_timing_period',
      'service_timing_note'
    )
),
expected_constraints AS (
  SELECT unnest(ARRAY[
    'service_requests_service_timing_type_check',
    'service_requests_service_timing_period_check',
    'service_requests_service_timing_time_format_check',
    'service_requests_service_timing_range_order_check',
    'service_requests_service_timing_exact_requires_date',
    'service_requests_service_timing_exact_datetime_requires_time',
    'service_requests_service_timing_flexible_period_requires_period',
    'service_requests_service_timing_note_len_check'
  ]) AS constraint_name
),
present_constraints AS (
  SELECT con.conname AS constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'service_requests'
    AND con.contype = 'c'
    AND con.conname LIKE 'service_requests_service_timing%'
),
legacy_timing AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE service_timing_type IS NULL) AS rows_with_null_timing_type,
    COUNT(*) FILTER (
      WHERE service_timing_type IS NULL
        AND service_timing_date IS NULL
        AND service_timing_time IS NULL
        AND service_timing_date_end IS NULL
        AND service_timing_period IS NULL
        AND (service_timing_note IS NULL OR service_timing_note = '')
    ) AS rows_with_all_timing_null
  FROM public.service_requests
)
SELECT
  'timing_columns_present' AS check_name,
  (SELECT COUNT(*) FROM timing_columns)::text AS actual,
  '6' AS expected,
  CASE WHEN (SELECT COUNT(*) FROM timing_columns) = 6 THEN 'PASS' ELSE 'FAIL' END AS status
UNION ALL
SELECT
  'timing_constraints_present',
  (SELECT COUNT(*) FROM present_constraints)::text,
  (SELECT COUNT(*)::text FROM expected_constraints),
  CASE
    WHEN (SELECT COUNT(*) FROM present_constraints) = (SELECT COUNT(*) FROM expected_constraints)
    THEN 'PASS'
    ELSE 'FAIL'
  END
UNION ALL
SELECT
  'service_requests_total_rows',
  total_rows::text,
  '(informational)',
  'INFO'
FROM legacy_timing
UNION ALL
SELECT
  'legacy_rows_null_timing_type',
  rows_with_null_timing_type::text,
  '(informational — legacy rows may be NULL)',
  'INFO'
FROM legacy_timing
UNION ALL
SELECT
  'legacy_rows_all_timing_null',
  rows_with_all_timing_null::text,
  '(informational — should equal total if migration just applied)',
  'INFO'
FROM legacy_timing;

-- Expected summary: timing_columns_present PASS (6/6), timing_constraints_present PASS (8/8)

-- =============================================================================
-- B) Timing columns — types and nullability
-- =============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'service_requests'
  AND c.column_name IN (
    'service_timing_type',
    'service_timing_date',
    'service_timing_time',
    'service_timing_date_end',
    'service_timing_period',
    'service_timing_note'
  )
ORDER BY c.column_name;

-- Expected types:
-- service_timing_type      text      YES NULL
-- service_timing_date      date      YES NULL
-- service_timing_time      text      YES NULL
-- service_timing_date_end  date      YES NULL
-- service_timing_period    text      YES NULL
-- service_timing_note      text      YES NULL

-- =============================================================================
-- C) Timing CHECK constraints — definitions
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
  AND con.conname LIKE 'service_requests_service_timing%'
ORDER BY con.conname;

-- Expected 8 constraints (type, period, time format, range order, exact date,
-- exact datetime requires time, flexible period requires period, note length)

-- =============================================================================
-- D) Missing timing columns (should return zero rows)
-- =============================================================================
SELECT expected.column_name
FROM (
  SELECT unnest(ARRAY[
    'service_timing_type',
    'service_timing_date',
    'service_timing_time',
    'service_timing_date_end',
    'service_timing_period',
    'service_timing_note'
  ]) AS column_name
) AS expected
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = 'service_requests'
 AND c.column_name = expected.column_name
WHERE c.column_name IS NULL
ORDER BY expected.column_name;

-- Expected: 0 rows
