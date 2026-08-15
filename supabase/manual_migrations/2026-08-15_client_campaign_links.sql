-- Client advertising campaign links (CLIENT acquisition only).
-- Manual migration (project convention: supabase/manual_migrations/).
-- Apply on staging first. Does not touch promoted-request / Stripe flows.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_campaign_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  ui_lang text NOT NULL,
  category_id uuid NULL REFERENCES public.categories (id) ON DELETE SET NULL,
  category_slug text NULL,
  service_query text NULL,
  place text NULL,
  preferred_language text NULL,
  work_format text NULL,
  radius_km integer NULL,
  source text NULL,
  campaign_code text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_campaign_links_slug_unique UNIQUE (slug),
  CONSTRAINT client_campaign_links_ui_lang_check CHECK (
    ui_lang IN ('ru', 'ua', 'de')
  ),
  CONSTRAINT client_campaign_links_preferred_language_check CHECK (
    preferred_language IS NULL
    OR preferred_language IN ('ru', 'ua', 'de', 'uk')
  ),
  CONSTRAINT client_campaign_links_work_format_check CHECK (
    work_format IS NULL OR work_format IN ('online', 'offline', 'hybrid')
  ),
  CONSTRAINT client_campaign_links_radius_non_negative CHECK (
    radius_km IS NULL OR radius_km >= 0
  ),
  CONSTRAINT client_campaign_links_slug_format CHECK (
    slug ~ '^[a-z0-9]([a-z0-9-]{1,62}[a-z0-9])?$'
  ),
  CONSTRAINT client_campaign_links_name_not_empty CHECK (
    length(trim(name)) > 0
  ),
  CONSTRAINT client_campaign_links_target_required CHECK (
    category_id IS NOT NULL
    OR (category_slug IS NOT NULL AND length(trim(category_slug)) > 0)
    OR (service_query IS NOT NULL AND length(trim(service_query)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_client_campaign_links_active_slug
  ON public.client_campaign_links (slug)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_client_campaign_links_created_at
  ON public.client_campaign_links (created_at DESC);

COMMENT ON TABLE public.client_campaign_links IS
  'Reusable public short links for CLIENT acquisition ads (/go/{slug} → prefilled request-service).';

COMMENT ON COLUMN public.client_campaign_links.slug IS
  'Stable public path segment; lowercase URL-safe; no PII or secrets.';

COMMENT ON COLUMN public.client_campaign_links.source IS
  'Marketing channel label (facebook, instagram, meta_ads, telegram, google_ads, offline, other).';

COMMENT ON COLUMN public.client_campaign_links.service_query IS
  'Free-text service intent (q) when no canonical category is selected.';

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS client_campaign_link_id uuid NULL
  REFERENCES public.client_campaign_links (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_client_campaign_link_id
  ON public.service_requests (client_campaign_link_id)
  WHERE client_campaign_link_id IS NOT NULL;

COMMENT ON COLUMN public.service_requests.client_campaign_link_id IS
  'Nullable FK to the client campaign link that generated this request (marketing attribution).';

ALTER TABLE public.client_campaign_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.client_campaign_links FROM anon, authenticated;
GRANT ALL ON TABLE public.client_campaign_links TO service_role;

COMMIT;
