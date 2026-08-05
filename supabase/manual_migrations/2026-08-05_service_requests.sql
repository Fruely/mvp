-- Phase 2: assisted service requests (fallback when no specialist match).
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  client_name text NOT NULL,
  client_email text NULL,
  client_phone text NULL,
  category_id uuid NULL REFERENCES public.categories (id) ON DELETE SET NULL,
  category_text text NULL,
  description text NOT NULL,
  preferred_language text NULL,
  work_format text NULL,
  city text NULL,
  postal_code text NULL,
  country_code text NULL,
  radius_km integer NULL,
  urgency text NOT NULL,
  desired_date date NULL,
  locale text NOT NULL,
  source text NOT NULL DEFAULT 'assisted_search',
  source_path text NULL,
  status text NOT NULL DEFAULT 'new',
  CONSTRAINT service_requests_public_id_unique UNIQUE (public_id),
  CONSTRAINT service_requests_client_name_not_empty CHECK (length(trim(client_name)) > 0),
  CONSTRAINT service_requests_description_not_empty CHECK (length(trim(description)) > 0),
  CONSTRAINT service_requests_contact_required CHECK (
    (client_email IS NOT NULL AND length(trim(client_email)) > 0)
    OR (client_phone IS NOT NULL AND length(trim(client_phone)) > 0)
  ),
  CONSTRAINT service_requests_status_check CHECK (
    status IN ('new', 'reviewing', 'searching', 'matched', 'closed', 'cancelled', 'spam')
  ),
  CONSTRAINT service_requests_urgency_check CHECK (
    urgency IN (
      'asap',
      'within_24h',
      'within_3_days',
      'within_week',
      'within_month',
      'flexible',
      'specific_date'
    )
  ),
  CONSTRAINT service_requests_work_format_check CHECK (
    work_format IS NULL OR work_format IN ('online', 'offline', 'hybrid')
  ),
  CONSTRAINT service_requests_radius_non_negative CHECK (
    radius_km IS NULL OR radius_km >= 0
  ),
  CONSTRAINT service_requests_specific_date_requires_desired_date CHECK (
    urgency <> 'specific_date' OR desired_date IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_service_requests_created_at
  ON public.service_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_status_created
  ON public.service_requests (status, created_at DESC);

COMMENT ON TABLE public.service_requests IS
  'Client-assisted search requests without a pre-selected specialist (Phase 2 fallback flow).';

COMMENT ON COLUMN public.service_requests.public_id IS
  'Human-readable operational reference (e.g. REQ-YYYYMMDD-XXXXXX), generated server-side.';

COMMENT ON COLUMN public.service_requests.description IS
  'Free-text task description from the client; may contain contact-like fragments.';

COMMENT ON COLUMN public.service_requests.status IS
  'Manual processing status for owner/admin queue.';

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_requests FROM anon, authenticated;
GRANT ALL ON public.service_requests TO service_role;

COMMIT;
