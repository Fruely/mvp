-- Starter seed for public.category_search_terms: high-signal synonyms/aliases so
-- /api/categories/suggest matches everyday queries, not only category titles.
--
-- Slug rule: only keys that exist under `categories` in locales/ru.json AND de.json AND ua.json
-- (same slug in all three). Omits extended keys present only in ru.json (e.g. seniorenbetreuung,
-- reiseberatung) until de/ua i18n parity — avoids guessing DB slugs for half-localized ids.
-- Massage uses `massage-therapists` only; `masseurs` is not a locale categories.* key.
--
-- Safe to re-run: skips rows that already exist for the same (category_id, lang, term).
-- Requires: 2026-04-17_category_search_terms.sql applied.

BEGIN;

INSERT INTO public.category_search_terms (category_id, term, lang, term_type, weight)
SELECT c.id, v.term, v.lang, v.term_type, v.weight
FROM public.categories c
INNER JOIN (
  VALUES
    -- psychologists
    ('psychologists'::text, 'Psychologen'::text, 'de'::text, 'title'::text, 0::int),
    ('psychologists', 'Психологи', 'ru', 'title', 0),
    ('psychologists', 'Психологи', 'uk', 'title', 0),
    ('psychologists', 'Psychologe', 'de', 'synonym', 0),
    ('psychologists', 'психолог', 'ru', 'synonym', 0),
    ('psychologists', 'психолог', 'uk', 'synonym', 0),
    -- psychotherapists
    ('psychotherapists', 'Psychotherapeuten', 'de', 'title', 0),
    ('psychotherapists', 'Психотерапевты', 'ru', 'title', 0),
    ('psychotherapists', 'Психотерапевти', 'uk', 'title', 0),
    ('psychotherapists', 'Psychotherapie', 'de', 'synonym', 0),
    ('psychotherapists', 'психотерапия', 'ru', 'synonym', 0),
    ('psychotherapists', 'психотерапія', 'uk', 'synonym', 0),
    -- coaches
    ('coaches', 'Coaches', 'de', 'title', 0),
    ('coaches', 'Коучи', 'ru', 'title', 0),
    ('coaches', 'Коучі', 'uk', 'title', 0),
    ('coaches', 'Coaching', 'de', 'alias', 0),
    ('coaches', 'коучинг', 'ru', 'synonym', 0),
    -- nutritionists
    ('nutritionists', 'Ernährungsberater', 'de', 'title', 0),
    ('nutritionists', 'Диетологи', 'ru', 'title', 0),
    ('nutritionists', 'Дієтологи', 'uk', 'title', 0),
    ('nutritionists', 'Диетолог', 'ru', 'synonym', 0),
    ('nutritionists', 'дієтолог', 'uk', 'synonym', 0),
    -- massage (canonical slug: locales de|ru|ua categories.massage-therapists)
    ('massage-therapists', 'Masseure', 'de', 'title', 0),
    ('massage-therapists', 'Массажисты', 'ru', 'title', 0),
    ('massage-therapists', 'Масажисти', 'uk', 'title', 0),
    ('massage-therapists', 'Massage', 'de', 'synonym', 0),
    ('massage-therapists', 'массаж', 'ru', 'synonym', 0),
    ('massage-therapists', 'масаж', 'uk', 'synonym', 0),
    -- tutors
    ('tutors', 'Nachhilfelehrer', 'de', 'title', 0),
    ('tutors', 'Репетиторы', 'ru', 'title', 0),
    ('tutors', 'Репетитори', 'uk', 'title', 0),
    ('tutors', 'Nachhilfe', 'de', 'alias', 0),
    ('tutors', 'репетитор', 'ru', 'synonym', 0)
) AS v(slug, term, lang, term_type, weight) ON c.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.category_search_terms t
  WHERE t.category_id = c.id
    AND lower(trim(t.term)) = lower(trim(v.term))
    AND t.lang IS NOT DISTINCT FROM v.lang
);

COMMIT;
