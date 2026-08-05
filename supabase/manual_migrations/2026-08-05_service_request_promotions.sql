-- Phase 3A: anonymized public promotion of an existing service_request.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_request_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL
    REFERENCES public.service_requests (id) ON DELETE CASCADE,
  public_token text NOT NULL,
  locale text NOT NULL,
  public_title text NOT NULL,
  public_summary text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  closed_at timestamptz NULL,
  CONSTRAINT service_request_promotions_service_request_id_unique
    UNIQUE (service_request_id),
  CONSTRAINT service_request_promotions_public_token_unique
    UNIQUE (public_token),
  CONSTRAINT service_request_promotions_public_title_not_empty
    CHECK (length(trim(public_title)) > 0),
  CONSTRAINT service_request_promotions_public_summary_not_empty
    CHECK (length(trim(public_summary)) > 0),
  CONSTRAINT service_request_promotions_public_token_not_empty
    CHECK (length(trim(public_token)) > 0),
  CONSTRAINT service_request_promotions_locale_check
    CHECK (locale IN ('ru', 'ua', 'de')),
  CONSTRAINT service_request_promotions_status_check
    CHECK (status IN ('draft', 'published', 'closed')),
  CONSTRAINT service_request_promotions_published_requires_published_at
    CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT service_request_promotions_closed_requires_closed_at
    CHECK (status <> 'closed' OR closed_at IS NOT NULL),
  CONSTRAINT service_request_promotions_published_no_closed_at
    CHECK (status <> 'published' OR closed_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_service_request_promotions_status_published_at
  ON public.service_request_promotions (status, published_at DESC);

COMMENT ON TABLE public.service_request_promotions IS
  'Anonymized public listing derived from a service_request (Phase 3A). No client contacts or raw description.';

COMMENT ON COLUMN public.service_request_promotions.service_request_id IS
  'Source assisted service_request; at most one promotion per request in the current schema.';

COMMENT ON COLUMN public.service_request_promotions.public_token IS
  'Opaque public URL token; generated server-side in runtime — not the service_request UUID.';

COMMENT ON COLUMN public.service_request_promotions.public_title IS
  'Admin-prepared anonymized headline for the public listing.';

COMMENT ON COLUMN public.service_request_promotions.public_summary IS
  'Admin-prepared anonymized summary for the public listing; not the original client description.';

COMMENT ON COLUMN public.service_request_promotions.status IS
  'Publication lifecycle: draft (not public), published (live listing), closed (removed from public).';

ALTER TABLE public.service_request_promotions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_request_promotions FROM anon, authenticated;
GRANT ALL ON public.service_request_promotions TO service_role;

COMMIT;
