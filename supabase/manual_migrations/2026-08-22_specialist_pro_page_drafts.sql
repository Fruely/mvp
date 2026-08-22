-- Pro Page draft workspace (Phase 2A).
-- Manual migration (project convention: supabase/manual_migrations/).
-- Apply on staging first. Does not alter billing/Stripe tables.
-- Published snapshot remains in specialist_pro_pages; drafts are edited here.

BEGIN;

CREATE TABLE IF NOT EXISTS public.specialist_pro_page_drafts (
  specialist_id uuid PRIMARY KEY REFERENCES public.specialists (id) ON DELETE CASCADE,
  display_name text NULL,
  profession_label text NULL,
  positioning text NULL,
  story text NULL,
  client_language text NULL,
  client_requests jsonb NOT NULL DEFAULT '[]'::jsonb,
  work_process jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_me jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_me_image_url text NULL,
  final_cta_image_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.specialist_pro_page_drafts IS
  'Editable Pro Page draft. Never served publicly; publish copies to specialist_pro_pages.';

ALTER TABLE public.specialist_pro_pages
  ADD COLUMN IF NOT EXISTS why_me_image_url text NULL,
  ADD COLUMN IF NOT EXISTS final_cta_image_url text NULL;

COMMENT ON COLUMN public.specialist_pro_pages.why_me_image_url IS
  'Explicit editorial image for Why Me section. Not inferred from gallery.';

COMMENT ON COLUMN public.specialist_pro_pages.final_cta_image_url IS
  'Explicit editorial image for final CTA section. Not inferred from gallery.';

ALTER TABLE public.specialist_pro_page_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.specialist_pro_page_drafts FROM anon, authenticated;
GRANT ALL ON TABLE public.specialist_pro_page_drafts TO service_role;

COMMIT;
