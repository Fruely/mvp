-- READ-ONLY geo audit (before remediation). Do not UPDATE/DELETE.
-- Published-like = status in published set AND is_active AND is_visible.

WITH published AS (
  SELECT
    s.id,
    s.name,
    s.slug,
    s.category_id,
    s.work_format,
    s.mobile_service,
    s.country_code,
    s.postal_code,
    s.lat,
    s.lng,
    s.service_radius_km,
    s.status,
    s.is_active,
    s.is_visible,
    s.published_at,
    s.created_at,
    s.updated_at,
    p.city AS profile_city
  FROM public.specialists s
  LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
  WHERE s.status IN ('published_unverified', 'featured_verified', 'approved', 'paused')
    AND s.is_active IS TRUE
    AND s.is_visible IS TRUE
)
SELECT
  id,
  name,
  slug,
  category_id,
  work_format,
  mobile_service,
  country_code,
  postal_code,
  profile_city,
  lat,
  lng,
  service_radius_km,
  status,
  is_active,
  is_visible,
  published_at,
  created_at,
  updated_at,
  CASE WHEN country_code IS NULL OR btrim(country_code) = '' THEN true ELSE false END AS missing_country,
  CASE WHEN postal_code IS NULL OR postal_code !~ '^\d{5}$' THEN true ELSE false END AS missing_plz,
  CASE WHEN profile_city IS NULL OR btrim(profile_city) = '' THEN true ELSE false END AS missing_city,
  CASE WHEN lat IS NULL OR lng IS NULL THEN true ELSE false END AS missing_coords,
  CASE WHEN lat = 0 AND lng = 0 THEN true ELSE false END AS zero_coords,
  CASE
    WHEN work_format IN ('offline', 'hybrid')
     AND (service_radius_km IS NULL OR service_radius_km NOT IN (5,10,25,50,100))
    THEN true ELSE false
  END AS bad_or_missing_radius,
  CASE
    WHEN postal_code ~ '^\d{5}$'
     AND (profile_city IS NULL OR btrim(profile_city) = '')
    THEN true ELSE false
  END AS plz_without_city
FROM published
ORDER BY published_at DESC NULLS LAST;
