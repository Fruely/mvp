-- Freuly Pro Page entitlement + authored content schema (Phase 1).
-- Manual migration (project convention: supabase/manual_migrations/).
-- Apply on staging first. Does not alter billing/Stripe tables.
-- Specialist-specific seed data lives in separate manual data scripts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.specialist_pro_entitlements (
  specialist_id uuid PRIMARY KEY REFERENCES public.specialists (id) ON DELETE CASCADE,
  source text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_pro_entitlements_source_check CHECK (
    source IN ('paid', 'gifted', 'admin_granted')
  )
);

CREATE INDEX IF NOT EXISTS idx_specialist_pro_entitlements_active
  ON public.specialist_pro_entitlements (specialist_id)
  WHERE is_active = true;

COMMENT ON TABLE public.specialist_pro_entitlements IS
  'Separate Pro Page access. Independent of specialist_plan / Stripe subscriptions.';

COMMENT ON COLUMN public.specialist_pro_entitlements.source IS
  'paid | gifted | admin_granted — how Pro Page access was granted.';

CREATE TABLE IF NOT EXISTS public.specialist_pro_pages (
  specialist_id uuid PRIMARY KEY REFERENCES public.specialists (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  display_name text NULL,
  profession_label text NULL,
  positioning text NULL,
  client_requests jsonb NOT NULL DEFAULT '[]'::jsonb,
  work_process jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_me jsonb NOT NULL DEFAULT '[]'::jsonb,
  story text NULL,
  client_language text NULL,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_pro_pages_status_check CHECK (
    status IN ('draft', 'published')
  )
);

CREATE INDEX IF NOT EXISTS idx_specialist_pro_pages_published
  ON public.specialist_pro_pages (specialist_id)
  WHERE status = 'published';

COMMENT ON TABLE public.specialist_pro_pages IS
  'Pro Page authored content only. Specialist profile data remains canonical elsewhere.';

COMMENT ON COLUMN public.specialist_pro_pages.display_name IS
  'Optional Pro Page presentation name override. Does not replace specialists.name.';

COMMENT ON COLUMN public.specialist_pro_pages.client_language IS
  'Editorial/SEO source language hint; not necessarily rendered on the public page.';

ALTER TABLE public.specialist_pro_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_pro_pages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.specialist_pro_entitlements FROM anon, authenticated;
REVOKE ALL ON TABLE public.specialist_pro_pages FROM anon, authenticated;
GRANT ALL ON TABLE public.specialist_pro_entitlements TO service_role;
GRANT ALL ON TABLE public.specialist_pro_pages TO service_role;

COMMIT;
