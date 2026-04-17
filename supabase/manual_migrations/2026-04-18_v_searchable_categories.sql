-- Searchable child categories for future category autocomplete (view only; no API/UI here).
--
-- specialists_count MUST match public.category_specialist_counts — the DB aggregation used for the
-- same contract as lib/specialists/publicCategoryCounts.ts and app/api/specialists/categories/route.ts
-- (active specialist_services with price_from >= 0, public specialist status/visibility, excludes test).
-- Do not re-count from public.specialists alone; that diverges from category/service-based counts.

BEGIN;

CREATE OR REPLACE VIEW public.v_searchable_categories AS
SELECT
  c.id AS category_id,
  c.slug,
  c.title,
  c.title_ru,
  c.title_de,
  c.title_ua,
  csc.specialists_count
FROM public.categories c
INNER JOIN public.category_specialist_counts csc
  ON csc.category_id = c.id
WHERE c.parent_id IS NOT NULL
  AND c.is_active IS TRUE
  AND csc.specialists_count > 0;

COMMIT;
