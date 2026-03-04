-- Marketplace v2 additive migration.
-- Safe rollout: only ADD columns/tables/indexes + data backfill.

BEGIN;

-- 1) specialists: new marketplace fields
ALTER TABLE public.specialists
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS featured_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Keep status as text for backward compatibility, but normalize values for v2 rollout.
-- Legacy -> v2 mapping:
-- approved => published_unverified
-- paused/pending => draft
UPDATE public.specialists
SET status = CASE
  WHEN status = 'approved' THEN 'published_unverified'
  WHEN status = 'featured_verified' THEN 'featured_verified'
  WHEN status = 'blocked' THEN 'blocked'
  ELSE 'draft'
END
WHERE status IS DISTINCT FROM CASE
  WHEN status = 'approved' THEN 'published_unverified'
  WHEN status = 'featured_verified' THEN 'featured_verified'
  WHEN status = 'blocked' THEN 'blocked'
  ELSE 'draft'
END;

-- Generate slug if missing (slugify from name; fallback to short id).
UPDATE public.specialists
SET slug = LOWER(
  REGEXP_REPLACE(
    COALESCE(NULLIF(name, ''), 'specialist-' || SUBSTRING(id::text, 1, 8)),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
WHERE slug IS NULL OR BTRIM(slug) = '';

-- Cleanup leading/trailing dashes and duplicate separators.
UPDATE public.specialists
SET slug = REGEXP_REPLACE(REGEXP_REPLACE(slug, '-+', '-', 'g'), '(^-|-$)', '', 'g')
WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_specialists_slug ON public.specialists (slug);
CREATE INDEX IF NOT EXISTS idx_specialists_status_featured_priority
  ON public.specialists (status, featured_priority DESC);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'specialists' AND column_name = 'city'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_specialists_status_city ON public.specialists (status, city)';
  END IF;
END $$;

-- Optional status guard (NOT VALID to avoid locking legacy rows during rollout).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'specialists_status_marketplace_v2_check'
  ) THEN
    ALTER TABLE public.specialists
      ADD CONSTRAINT specialists_status_marketplace_v2_check
      CHECK (status IN ('draft', 'published_unverified', 'featured_verified', 'blocked')) NOT VALID;
  END IF;
END $$;

-- 2) Programmatic SEO catalog
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  city_slug text,
  language_slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_services_scope UNIQUE (category_slug, slug, city_slug, language_slug)
);

CREATE INDEX IF NOT EXISTS idx_services_category_slug ON public.services (category_slug);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services (is_active);

-- 3) specialist_services: add SEO helper columns for URL dimensions (nullable)
ALTER TABLE public.specialist_services
  ADD COLUMN IF NOT EXISTS service_slug text,
  ADD COLUMN IF NOT EXISTS city_slug text,
  ADD COLUMN IF NOT EXISTS language_slug text;

CREATE INDEX IF NOT EXISTS idx_specialist_services_seo_lookup
  ON public.specialist_services (service_slug, city_slug, language_slug, is_active);

-- 4) specialist assets
CREATE TABLE IF NOT EXISTS public.specialist_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specialist_assets_specialist
  ON public.specialist_assets (specialist_id, asset_type, is_active, sort_order);

-- 5) specialist plans
CREATE TABLE IF NOT EXISTS public.specialist_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL UNIQUE REFERENCES public.specialists(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free',
  plan_status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specialist_plan_code_status
  ON public.specialist_plan (plan_code, plan_status);

-- Backfill specialist_plan from legacy columns if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'specialists' AND column_name = 'plan_name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'specialists' AND column_name = 'subscription_status'
  ) THEN
    INSERT INTO public.specialist_plan (specialist_id, plan_code, plan_status, started_at)
    SELECT
      s.id,
      COALESCE(NULLIF(s.plan_name, ''), 'free') AS plan_code,
      COALESCE(NULLIF(s.subscription_status, ''), 'active') AS plan_status,
      COALESCE(s.created_at, now()) AS started_at
    FROM public.specialists s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.specialist_plan p WHERE p.specialist_id = s.id
    );
  ELSE
    INSERT INTO public.specialist_plan (specialist_id, plan_code, plan_status, started_at)
    SELECT
      s.id,
      'free' AS plan_code,
      'active' AS plan_status,
      COALESCE(s.created_at, now()) AS started_at
    FROM public.specialists s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.specialist_plan p WHERE p.specialist_id = s.id
    );
  END IF;
END $$;

COMMIT;
