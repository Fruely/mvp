-- Phase 3C-A: first-party attribution for public promotion landing visits.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_request_promotion_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL
    REFERENCES public.service_request_promotions (id) ON DELETE CASCADE,
  attribution_token text NOT NULL,
  landing_locale text NOT NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  utm_content text NULL,
  referrer_host text NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_promotion_attributions_token_unique
    UNIQUE (attribution_token),
  CONSTRAINT service_request_promotion_attributions_token_not_empty
    CHECK (length(trim(attribution_token)) > 0),
  CONSTRAINT service_request_promotion_attributions_token_max_len
    CHECK (length(attribution_token) <= 128),
  CONSTRAINT service_request_promotion_attributions_landing_locale_check
    CHECK (landing_locale IN ('ru', 'ua', 'de')),
  CONSTRAINT service_request_promotion_attributions_utm_source_max_len
    CHECK (utm_source IS NULL OR length(utm_source) <= 100),
  CONSTRAINT service_request_promotion_attributions_utm_medium_max_len
    CHECK (utm_medium IS NULL OR length(utm_medium) <= 100),
  CONSTRAINT service_request_promotion_attributions_utm_campaign_max_len
    CHECK (utm_campaign IS NULL OR length(utm_campaign) <= 200),
  CONSTRAINT service_request_promotion_attributions_utm_content_max_len
    CHECK (utm_content IS NULL OR length(utm_content) <= 200),
  CONSTRAINT service_request_promotion_attributions_referrer_host_max_len
    CHECK (referrer_host IS NULL OR length(referrer_host) <= 255),
  CONSTRAINT service_request_promotion_attributions_visit_count_min
    CHECK (visit_count >= 1)
);

CREATE INDEX IF NOT EXISTS idx_service_request_promotion_attributions_promotion_first_seen
  ON public.service_request_promotion_attributions (promotion_id, first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_request_promotion_attributions_utm_source_first_seen
  ON public.service_request_promotion_attributions (utm_source, first_seen_at DESC);

COMMENT ON TABLE public.service_request_promotion_attributions IS
  'First-party campaign attribution for visits to a public service_request promotion (Phase 3C-A). Not referral, not auth, no client contacts.';

COMMENT ON COLUMN public.service_request_promotion_attributions.promotion_id IS
  'Parent public promotion listing; attribution rows cascade-delete with the promotion.';

COMMENT ON COLUMN public.service_request_promotion_attributions.attribution_token IS
  'Opaque first-party identifier for one visitor session; generated server-side in runtime — not promotion UUID, not auth token, not referral code.';

COMMENT ON COLUMN public.service_request_promotion_attributions.utm_source IS
  'Optional UTM source from landing URL; bounded length, no full query string stored.';

COMMENT ON COLUMN public.service_request_promotion_attributions.utm_medium IS
  'Optional UTM medium from landing URL; bounded length, no full query string stored.';

COMMENT ON COLUMN public.service_request_promotion_attributions.utm_campaign IS
  'Optional UTM campaign from landing URL; bounded length, no full query string stored.';

COMMENT ON COLUMN public.service_request_promotion_attributions.utm_content IS
  'Optional UTM content from landing URL; bounded length, no full query string stored.';

COMMENT ON COLUMN public.service_request_promotion_attributions.referrer_host IS
  'Optional referrer host only (no full URL, no PII from query strings).';

COMMENT ON COLUMN public.service_request_promotion_attributions.visit_count IS
  'Repeat visits for the same first-party attribution_token; runtime updates last_seen_at and increments this counter.';

ALTER TABLE public.service_request_promotion_attributions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_request_promotion_attributions FROM anon, authenticated;
GRANT ALL ON public.service_request_promotion_attributions TO service_role;

COMMIT;
