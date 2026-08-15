-- Structured client timing for assisted service requests (additive, backwards-compatible).
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS service_timing_type text NULL,
  ADD COLUMN IF NOT EXISTS service_timing_date date NULL,
  ADD COLUMN IF NOT EXISTS service_timing_time text NULL,
  ADD COLUMN IF NOT EXISTS service_timing_date_end date NULL,
  ADD COLUMN IF NOT EXISTS service_timing_period text NULL,
  ADD COLUMN IF NOT EXISTS service_timing_note text NULL;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_type_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_type_check CHECK (
    service_timing_type IS NULL
    OR service_timing_type IN (
      'asap',
      'exact_datetime',
      'date_flexible',
      'date_range',
      'flexible_period'
    )
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_period_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_period_check CHECK (
    service_timing_period IS NULL
    OR service_timing_period IN ('next_week', 'next_month', 'flexible')
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_time_format_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_time_format_check CHECK (
    service_timing_time IS NULL
    OR service_timing_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_range_order_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_range_order_check CHECK (
    service_timing_type <> 'date_range'
    OR (
      service_timing_date IS NOT NULL
      AND service_timing_date_end IS NOT NULL
      AND service_timing_date_end >= service_timing_date
    )
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_exact_requires_date;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_exact_requires_date CHECK (
    service_timing_type NOT IN ('exact_datetime', 'date_flexible', 'date_range')
    OR service_timing_date IS NOT NULL
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_exact_datetime_requires_time;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_exact_datetime_requires_time CHECK (
    service_timing_type <> 'exact_datetime'
    OR service_timing_time IS NOT NULL
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_flexible_period_requires_period;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_flexible_period_requires_period CHECK (
    service_timing_type <> 'flexible_period'
    OR service_timing_period IS NOT NULL
  );

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_service_timing_note_len_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_service_timing_note_len_check CHECK (
    service_timing_note IS NULL OR length(service_timing_note) <= 500
  );

COMMENT ON COLUMN public.service_requests.service_timing_type IS
  'Structured client timing preference for new assisted requests; NULL on legacy rows.';

COMMENT ON COLUMN public.service_requests.service_timing_time IS
  'Local time HH:MM for exact_datetime; not a booking slot guarantee.';

COMMIT;
