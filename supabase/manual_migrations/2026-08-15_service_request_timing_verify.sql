-- Verify service_requests structured timing columns (run after 2026-08-15_service_request_timing.sql).

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_requests'
  AND column_name LIKE 'service_timing%'
ORDER BY column_name;
