CREATE TABLE IF NOT EXISTS public.homepage_parent_category_slots (
  slot int NOT NULL CHECK (slot BETWEEN 1 AND 4),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slot)
);

WITH desired_slots AS (
  SELECT 1 AS slot, 'tech-it-support' AS slug, true AS is_active, 'Initial homepage parent slot 1' AS note UNION ALL
  SELECT 2, 'house-garden', true, 'Initial homepage parent slot 2' UNION ALL
  SELECT 3, 'pflege-betreuung', true, 'Initial homepage parent slot 3' UNION ALL
  SELECT 4, 'health-psychology', true, 'Initial homepage parent slot 4'
),
resolved AS (
  SELECT
    ds.slot,
    c.id AS category_id,
    ds.is_active,
    ds.note
  FROM desired_slots ds
  JOIN public.categories c ON c.slug = ds.slug
)
INSERT INTO public.homepage_parent_category_slots (slot, category_id, is_active, note)
SELECT slot, category_id, is_active, note
FROM resolved
ON CONFLICT (slot) DO UPDATE
SET
  category_id = EXCLUDED.category_id,
  is_active = EXCLUDED.is_active,
  note = EXCLUDED.note,
  updated_at = now();
