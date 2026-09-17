-- Localized anonymized live-demand copy for RU/UA/DE.
-- Preferred client language stays on service_requests.preferred_language
-- and is not a visibility filter for the public drum.
-- Apply manually in Supabase SQL editor.

BEGIN;

ALTER TABLE public.service_request_promotions
  ADD COLUMN IF NOT EXISTS localized_copy jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_request_promotions.localized_copy IS
  'Anonymized public_title/public_summary per locale: {"ru":{"title":"...","summary":"..."},"ua":{...},"de":{...}}. Missing locales fall back to public_title/public_summary.';

UPDATE public.service_request_promotions
SET localized_copy = jsonb_build_object(
  locale,
  jsonb_build_object('title', public_title, 'summary', public_summary)
)
WHERE COALESCE(localized_copy, '{}'::jsonb) = '{}'::jsonb
  AND locale IN ('ru', 'ua', 'de')
  AND length(trim(public_title)) > 0
  AND length(trim(public_summary)) > 0;

COMMIT;
