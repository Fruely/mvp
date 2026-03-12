-- Materialise the "Popular Categories" homepage block as a Postgres VIEW.
--
-- Source of truth: homepage_popular_categories controls which categories
-- appear and in what order (sort_order).
--
-- LEFT JOIN on specialists ensures categories with 0 active specialists
-- still appear. Only is_active + is_visible specialists are counted.
--
-- To add a new homepage category:
--   1. INSERT INTO categories (with image_url, is_active = true)
--   2. INSERT INTO homepage_popular_categories (category_id, sort_order)
--   No code changes required.

CREATE OR REPLACE VIEW public.homepage_popular_categories_view AS
SELECT
  c.id,
  c.slug,
  c.title,
  c.image_url,
  c.parent_id,
  c.is_active,
  h.sort_order,
  count(s.id)::int AS specialists_count
FROM public.homepage_popular_categories h
JOIN public.categories c ON c.id = h.category_id
LEFT JOIN public.specialists s
  ON s.category_id = c.id
  AND s.is_active = true
  AND s.is_visible = true
WHERE c.is_active = true
GROUP BY c.id, c.slug, c.title, c.image_url, c.parent_id, c.is_active, h.sort_order
ORDER BY h.sort_order;
