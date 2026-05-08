-- Add search synonyms for new category slug: martial-arts-self-defense
-- Safe to re-run: skips existing rows by (category_id, normalized term, lang).

BEGIN;

INSERT INTO public.category_search_terms (category_id, term, lang, term_type, weight)
SELECT c.id, v.term, v.lang, 'synonym'::text, 0::int
FROM public.categories c
INNER JOIN (
  VALUES
    -- ru
    ('martial-arts-self-defense'::text, 'боевые искусства'::text, 'ru'::text),
    ('martial-arts-self-defense', 'единоборства', 'ru'),
    ('martial-arts-self-defense', 'самооборона', 'ru'),
    ('martial-arts-self-defense', 'карате', 'ru'),
    ('martial-arts-self-defense', 'дзюдо', 'ru'),
    ('martial-arts-self-defense', 'бокс', 'ru'),
    ('martial-arts-self-defense', 'кикбоксинг', 'ru'),
    ('martial-arts-self-defense', 'тхэквондо', 'ru'),
    ('martial-arts-self-defense', 'айкидо', 'ru'),
    ('martial-arts-self-defense', 'джиу-джитсу', 'ru'),
    ('martial-arts-self-defense', 'бразильское джиу-джитсу', 'ru'),
    ('martial-arts-self-defense', 'рукопашный бой', 'ru'),
    ('martial-arts-self-defense', 'mma', 'ru'),
    ('martial-arts-self-defense', 'мма', 'ru'),
    ('martial-arts-self-defense', 'смешанные единоборства', 'ru'),
    -- uk
    ('martial-arts-self-defense', 'бойові мистецтва', 'uk'),
    ('martial-arts-self-defense', 'єдиноборства', 'uk'),
    ('martial-arts-self-defense', 'самооборона', 'uk'),
    ('martial-arts-self-defense', 'карате', 'uk'),
    ('martial-arts-self-defense', 'дзюдо', 'uk'),
    ('martial-arts-self-defense', 'бокс', 'uk'),
    ('martial-arts-self-defense', 'кікбоксинг', 'uk'),
    ('martial-arts-self-defense', 'тхеквондо', 'uk'),
    ('martial-arts-self-defense', 'айкідо', 'uk'),
    ('martial-arts-self-defense', 'джиу-джитсу', 'uk'),
    ('martial-arts-self-defense', 'рукопашний бій', 'uk'),
    ('martial-arts-self-defense', 'змішані єдиноборства', 'uk'),
    -- de
    ('martial-arts-self-defense', 'kampfsport', 'de'),
    ('martial-arts-self-defense', 'kampfkunst', 'de'),
    ('martial-arts-self-defense', 'selbstverteidigung', 'de'),
    ('martial-arts-self-defense', 'karate', 'de'),
    ('martial-arts-self-defense', 'judo', 'de'),
    ('martial-arts-self-defense', 'boxen', 'de'),
    ('martial-arts-self-defense', 'kickboxen', 'de'),
    ('martial-arts-self-defense', 'taekwondo', 'de'),
    ('martial-arts-self-defense', 'aikido', 'de'),
    ('martial-arts-self-defense', 'jiu-jitsu', 'de'),
    ('martial-arts-self-defense', 'bjj', 'de'),
    ('martial-arts-self-defense', 'mma', 'de'),
    ('martial-arts-self-defense', 'mixed martial arts', 'de'),
    -- en
    ('martial-arts-self-defense', 'martial arts', 'en'),
    ('martial-arts-self-defense', 'self defense', 'en'),
    ('martial-arts-self-defense', 'self-defence', 'en'),
    ('martial-arts-self-defense', 'karate', 'en'),
    ('martial-arts-self-defense', 'judo', 'en'),
    ('martial-arts-self-defense', 'boxing', 'en'),
    ('martial-arts-self-defense', 'kickboxing', 'en'),
    ('martial-arts-self-defense', 'taekwondo', 'en'),
    ('martial-arts-self-defense', 'aikido', 'en'),
    ('martial-arts-self-defense', 'jiu-jitsu', 'en'),
    ('martial-arts-self-defense', 'bjj', 'en'),
    ('martial-arts-self-defense', 'mma', 'en'),
    ('martial-arts-self-defense', 'mixed martial arts', 'en')
) AS v(slug, term, lang) ON c.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.category_search_terms t
  WHERE t.category_id = c.id
    AND lower(trim(t.term)) = lower(trim(v.term))
    AND t.lang IS NOT DISTINCT FROM v.lang
);

COMMIT;
