BEGIN;

CREATE OR REPLACE VIEW public.category_specialist_counts AS
SELECT
  ss.category_id,
  COUNT(DISTINCT ss.specialist_id)::bigint AS specialists_count
FROM public.specialist_services ss
JOIN public.specialists s ON s.id = ss.specialist_id
WHERE
  ss.is_active = true
  AND ss.price_from >= 0
  AND s.status IN ('approved', 'published_unverified', 'featured_verified')
  AND s.is_active = true
  AND s.is_visible = true
  AND COALESCE(s.is_test, false) = false
GROUP BY ss.category_id;

COMMIT;
