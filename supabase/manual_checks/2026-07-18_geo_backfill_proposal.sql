-- PROPOSAL ONLY — do not execute automatically.
-- Manual backfill ideas for legacy published specialists.
-- Never invent city/coords/radius. Never hide or unpublish.

-- 1) Set country_code = 'DE' where NULL and postal_code looks German (5 digits)
-- UPDATE public.specialists
-- SET country_code = 'DE'
-- WHERE country_code IS NULL
--   AND postal_code ~ '^\d{5}$'
--   AND status IN ('published_unverified','featured_verified','approved','paused');

-- 2) City from Nominatim / ops spreadsheet keyed by postal_code → specialist_profiles.city
-- (no reliable city column on postal_codes in production as of 2026-07-18; only 8 PLZ rows)

-- 3) Coordinates from postal_codes when present:
-- UPDATE specialists s
-- SET lat = pc.lat, lng = pc.lng
-- FROM postal_codes pc
-- WHERE s.postal_code = pc.postal_code
--   AND s.lat IS NULL AND s.lng IS NULL
--   AND pc.lat IS NOT NULL AND pc.lng IS NOT NULL;

-- 4) DO NOT auto-assign service_radius_km. Report allowlist violations for manual fix.

SELECT
  s.id,
  s.name,
  s.postal_code,
  p.city AS profile_city,
  s.lat,
  s.lng,
  s.service_radius_km,
  s.work_format,
  s.status
FROM public.specialists s
LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
WHERE s.status IN ('published_unverified', 'featured_verified', 'approved', 'paused')
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND (
    p.city IS NULL OR btrim(p.city) = ''
    OR s.lat IS NULL OR s.lng IS NULL
    OR (
      s.work_format IN ('offline', 'hybrid')
      AND (s.service_radius_km IS NULL OR s.service_radius_km NOT IN (5,10,25,50,100))
    )
  )
ORDER BY s.published_at DESC NULLS LAST;
