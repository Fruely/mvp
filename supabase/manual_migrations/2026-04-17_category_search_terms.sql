-- Category synonym / search-term data layer (future autocomplete; no API/UI in this phase).
-- Contract: `lang` is data/search language code (e.g. uk for Ukrainian), not route locale (ua).
-- Use uk in stored rows; ua is rejected by CHECK. lang NULL = language-neutral terms.

BEGIN;

CREATE TABLE IF NOT EXISTS public.category_search_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  term text NOT NULL,
  lang text NULL,
  term_type text NULL,
  weight integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_search_terms_term_not_blank CHECK (length(trim(term)) > 0),
  CONSTRAINT category_search_terms_lang_not_route_locale CHECK (lang IS NULL OR lang <> 'ua')
);

CREATE INDEX IF NOT EXISTS idx_category_search_terms_category_id
  ON public.category_search_terms (category_id);

CREATE INDEX IF NOT EXISTS idx_category_search_terms_lang_active
  ON public.category_search_terms (lang, is_active);

-- No duplicate normalized term for the same category when lang is neutral (NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_search_terms_category_neutral_term
  ON public.category_search_terms (category_id, lower(trim(term)))
  WHERE lang IS NULL;

-- No duplicate normalized term for the same category + explicit data language.
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_search_terms_category_lang_term
  ON public.category_search_terms (category_id, lang, lower(trim(term)))
  WHERE lang IS NOT NULL;

CREATE OR REPLACE FUNCTION set_category_search_terms_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_search_terms_updated_at
  ON public.category_search_terms;

CREATE TRIGGER trg_category_search_terms_updated_at
  BEFORE UPDATE ON public.category_search_terms
  FOR EACH ROW
  EXECUTE FUNCTION set_category_search_terms_updated_at();

COMMIT;
