-- Homepage featured categories: management table for category placement on homepage.
-- Supports multiple placements: hero, featured, popular.
-- Created 2026-05-15

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS public.homepage_featured_categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category_id UUID NOT NULL,
  placement VARCHAR(50) NOT NULL DEFAULT 'featured',
  sort_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_category FOREIGN KEY (category_id) 
    REFERENCES public.categories(id) ON DELETE CASCADE,
  CONSTRAINT valid_placement CHECK (placement IN ('hero', 'featured', 'popular')),
  CONSTRAINT uniq_category_placement UNIQUE (category_id, placement)
);

-- Index for fast filtering by placement and active status
CREATE INDEX IF NOT EXISTS idx_homepage_featured_categories_placement_active 
  ON public.homepage_featured_categories(placement, is_active, sort_order);

-- Seed: explicit mapping for featured placement
-- sort_order assigned explicitly to avoid relying on alphabetical order
INSERT INTO public.homepage_featured_categories (category_id, placement, sort_order, is_active)
SELECT c.id, 'featured', v.sort_order, true
FROM (
  VALUES
    ('it-support', 1),
    ('health-psychology', 2),
    ('pflege-betreuung', 3),
    ('auto-mobilitaet', 4),
    ('business-consulting', 5),
    ('education-development', 6)
) AS v(slug, sort_order)
JOIN public.categories c ON c.slug = v.slug
WHERE c.is_active = true
ON CONFLICT (category_id, placement) DO NOTHING;

COMMIT;
