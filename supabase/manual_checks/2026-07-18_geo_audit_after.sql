-- READ-ONLY checks after future remediation / code deploy.
-- Expect: no NEW published offline/hybrid without full geo (legacy may remain until manual fix).

-- A) Bonn control (53115)
SELECT
  s.id,
  s.name,
  s.postal_code,
  p.city,
  s.lat,
  s.lng,
  s.service_radius_km,
  s.work_format,
  s.status
FROM public.specialists s
LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
WHERE s.postal_code = '53115';

-- B) Count published offline/hybrid missing required geo
SELECT count(*) AS incomplete_offline_hybrid
FROM public.specialists s
LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
WHERE s.status IN ('published_unverified', 'featured_verified', 'approved')
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND s.work_format IN ('offline', 'hybrid')
  AND (
    s.country_code IS DISTINCT FROM 'DE'
    OR s.postal_code IS NULL OR s.postal_code !~ '^\d{5}$'
    OR p.city IS NULL OR btrim(p.city) = ''
    OR s.lat IS NULL OR s.lng IS NULL
    OR s.service_radius_km IS NULL
    OR s.service_radius_km NOT IN (5,10,25,50,100)
  );

-- C) Online published missing admin geo
SELECT count(*) AS incomplete_online
FROM public.specialists s
LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
WHERE s.status IN ('published_unverified', 'featured_verified', 'approved')
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND s.work_format = 'online'
  AND (
    s.country_code IS DISTINCT FROM 'DE'
    OR s.postal_code IS NULL OR s.postal_code !~ '^\d{5}$'
    OR p.city IS NULL OR btrim(p.city) = ''
    OR s.lat IS NULL OR s.lng IS NULL
  );
