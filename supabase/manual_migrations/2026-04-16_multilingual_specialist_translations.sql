-- ADR-001: additive multilingual schema (languages + translation tables only).
-- Does not alter existing specialist_profiles or specialist_services columns.

CREATE TABLE public.languages (
  code text PRIMARY KEY,
  label_native text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.specialist_profile_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.languages (code) ON DELETE RESTRICT,
  about_me text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (specialist_id, language_code)
);

CREATE INDEX idx_specialist_profile_translations_specialist_id
  ON public.specialist_profile_translations (specialist_id);

CREATE INDEX idx_specialist_profile_translations_language_code
  ON public.specialist_profile_translations (language_code);

CREATE TABLE public.specialist_service_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_service_id uuid NOT NULL REFERENCES public.specialist_services (id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.languages (code) ON DELETE RESTRICT,
  title text,
  description text,
  price_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (specialist_service_id, language_code)
);

CREATE INDEX idx_specialist_service_translations_specialist_service_id
  ON public.specialist_service_translations (specialist_service_id);

CREATE INDEX idx_specialist_service_translations_language_code
  ON public.specialist_service_translations (language_code);

INSERT INTO public.languages (code, label_native, sort_order)
VALUES
  ('ru', 'Русский', 0),
  ('uk', 'Українська', 1),
  ('de', 'Deutsch', 2)
ON CONFLICT (code) DO NOTHING;
