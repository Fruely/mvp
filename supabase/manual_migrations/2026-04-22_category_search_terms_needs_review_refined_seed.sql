-- Refined NEEDS_REVIEW subset (approved 6 slugs only) for public.category_search_terms.
-- Excludes moving-help and all other NEEDS_REVIEW/POSTPONE slugs not listed below.
-- Terms match the agreed refined synonym lists (category-level; disambiguated from neighbors).
--
-- Idempotent: INSERT ... SELECT with INNER JOIN on categories.slug; missing slugs insert nothing (no error).
-- Skips rows already present for the same (category_id, lang, normalized term).
-- Does not DELETE. No schema changes.
-- Requires: 2026-04-17_category_search_terms.sql applied.

BEGIN;

INSERT INTO public.category_search_terms (category_id, term, lang, term_type, weight)
SELECT c.id, v.term, v.lang, v.term_type, v.weight
FROM public.categories c
INNER JOIN (
  VALUES
    -- psychotherapists
    ('psychotherapists'::text, 'психотерапевт'::text, 'ru'::text, 'synonym'::text, 0::int),
    ('psychotherapists', 'психотерапия', 'ru', 'synonym', 0),
    ('psychotherapists', 'психотерапевт', 'uk', 'synonym', 0),
    ('psychotherapists', 'психотерапія', 'uk', 'synonym', 0),
    ('psychotherapists', 'Psychotherapeut', 'de', 'synonym', 0),
    ('psychotherapists', 'Psychotherapie', 'de', 'synonym', 0),
    -- buchfuehrung
    ('buchfuehrung', 'бухгалтерия', 'ru', 'synonym', 0),
    ('buchfuehrung', 'бухгалтер', 'ru', 'synonym', 0),
    ('buchfuehrung', 'учёт', 'ru', 'synonym', 0),
    ('buchfuehrung', 'бухгалтерія', 'uk', 'synonym', 0),
    ('buchfuehrung', 'бухгалтер', 'uk', 'synonym', 0),
    ('buchfuehrung', 'облік', 'uk', 'synonym', 0),
    ('buchfuehrung', 'Buchhaltung', 'de', 'synonym', 0),
    ('buchfuehrung', 'Buchführung', 'de', 'synonym', 0),
    ('buchfuehrung', 'Buchhalter', 'de', 'synonym', 0),
    -- business-analytics
    ('business-analytics', 'бизнес-аналитика', 'ru', 'synonym', 0),
    ('business-analytics', 'аналитика данных', 'ru', 'synonym', 0),
    ('business-analytics', 'BI', 'ru', 'synonym', 0),
    ('business-analytics', 'бізнес-аналітика', 'uk', 'synonym', 0),
    ('business-analytics', 'аналітика даних', 'uk', 'synonym', 0),
    ('business-analytics', 'Business Intelligence', 'de', 'synonym', 0),
    ('business-analytics', 'Datenanalyse', 'de', 'synonym', 0),
    ('business-analytics', 'Reporting', 'de', 'synonym', 0),
    -- exam-prep
    ('exam-prep', 'подготовка к экзамену', 'ru', 'synonym', 0),
    ('exam-prep', 'подготовка к экзаменам', 'ru', 'synonym', 0),
    ('exam-prep', 'экзамен', 'ru', 'synonym', 0),
    ('exam-prep', 'підготовка до іспиту', 'uk', 'synonym', 0),
    ('exam-prep', 'іспит', 'uk', 'synonym', 0),
    ('exam-prep', 'Prüfungsvorbereitung', 'de', 'synonym', 0),
    ('exam-prep', 'Prüfung', 'de', 'synonym', 0),
    ('exam-prep', 'Abiturvorbereitung', 'de', 'synonym', 0),
    -- housemaster
    ('housemaster', 'мастер на дом', 'ru', 'synonym', 0),
    ('housemaster', 'домашний мастер', 'ru', 'synonym', 0),
    ('housemaster', 'майстер додому', 'uk', 'synonym', 0),
    ('housemaster', 'домашній майстер', 'uk', 'synonym', 0),
    ('housemaster', 'Hausmeister', 'de', 'synonym', 0),
    ('housemaster', 'Haushandwerker', 'de', 'synonym', 0),
    -- small-repairs
    ('small-repairs', 'мелкий ремонт', 'ru', 'synonym', 0),
    ('small-repairs', 'мелкие работы', 'ru', 'synonym', 0),
    ('small-repairs', 'дрібний ремонт', 'uk', 'synonym', 0),
    ('small-repairs', 'дрібні роботи', 'uk', 'synonym', 0),
    ('small-repairs', 'Kleinreparaturen', 'de', 'synonym', 0),
    ('small-repairs', 'kleine Reparaturen', 'de', 'synonym', 0)
) AS v(slug, term, lang, term_type, weight) ON c.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.category_search_terms t
  WHERE t.category_id = c.id
    AND lower(trim(t.term)) = lower(trim(v.term))
    AND t.lang IS NOT DISTINCT FROM v.lang
);

COMMIT;
