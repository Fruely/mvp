-- Add category_id to specialist_services and backfill from specialists.
-- Required for list API /api/specialists/list to show specialists in category pages.

-- 1) Add column if missing (production may already have it)
ALTER TABLE public.specialist_services
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id);

-- 2) Backfill: set category_id from specialist's main category where null
UPDATE public.specialist_services ss
SET category_id = s.category_id
FROM public.specialists s
WHERE ss.specialist_id = s.id
  AND ss.category_id IS NULL
  AND s.category_id IS NOT NULL;

-- 3) Index for category list queries
CREATE INDEX IF NOT EXISTS idx_specialist_services_category_active
  ON public.specialist_services (category_id, is_active)
  WHERE category_id IS NOT NULL;
