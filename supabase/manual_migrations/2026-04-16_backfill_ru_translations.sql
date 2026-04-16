-- ADR-001: backfill legacy text into translation tables as language_code = 'ru' (insert-if-missing only).
-- Scope: active, visible specialists with public-visible statuses; active services only.

BEGIN;

INSERT INTO public.specialist_profile_translations (
  specialist_id,
  language_code,
  about_me,
  created_at,
  updated_at
)
SELECT
  p.specialist_id,
  'ru',
  trim(p.about_me),
  now(),
  now()
FROM public.specialist_profiles p
INNER JOIN public.specialists s ON s.id = p.specialist_id
WHERE s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND s.status IN ('approved', 'published_unverified', 'featured_verified')
  AND p.about_me IS NOT NULL
  AND trim(p.about_me) <> ''
ON CONFLICT (specialist_id, language_code) DO NOTHING;

INSERT INTO public.specialist_service_translations (
  specialist_service_id,
  language_code,
  title,
  price_comment,
  description,
  created_at,
  updated_at
)
SELECT
  ss.id,
  'ru',
  trim(ss.title),
  NULLIF(trim(COALESCE(ss.price_comment, '')), ''),
  NULLIF(trim(COALESCE(ss.description, '')), ''),
  now(),
  now()
FROM public.specialist_services ss
INNER JOIN public.specialists s ON s.id = ss.specialist_id
WHERE ss.is_active IS TRUE
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND s.status IN ('approved', 'published_unverified', 'featured_verified')
  AND ss.title IS NOT NULL
  AND trim(ss.title) <> ''
ON CONFLICT (specialist_service_id, language_code) DO NOTHING;

COMMIT;
