-- READY subset seed for public.category_search_terms (approved first-load dictionary only).
-- Source: 30 child category slugs from READY basket; minimal ru/uk/de synonym terms only.
-- Excludes NEEDS_REVIEW and POSTPONE buckets; does not add categories or terms beyond that subset.
--
-- Idempotent: INSERT ... SELECT with INNER JOIN on categories.slug; missing slugs insert nothing (no error).
-- Skips rows already present for the same (category_id, lang, normalized term).
-- Does not DELETE. No schema changes.
-- Requires: 2026-04-17_category_search_terms.sql applied.
-- Note: may overlap prior 2026-04-19 seed on some slugs; duplicates are skipped by NOT EXISTS.

BEGIN;

INSERT INTO public.category_search_terms (category_id, term, lang, term_type, weight)
SELECT c.id, v.term, v.lang, v.term_type, v.weight
FROM public.categories c
INNER JOIN (
  VALUES
    -- psychologists
    ('psychologists'::text, 'психолог'::text, 'ru'::text, 'synonym'::text, 0::int),
    ('psychologists', 'психологическая консультация', 'ru', 'synonym', 0),
    ('psychologists', 'психолог', 'uk', 'synonym', 0),
    ('psychologists', 'психологічна консультація', 'uk', 'synonym', 0),
    ('psychologists', 'Psychologe', 'de', 'synonym', 0),
    ('psychologists', 'psychologische Beratung', 'de', 'synonym', 0),
    -- speech-therapists
    ('speech-therapists', 'логопед', 'ru', 'synonym', 0),
    ('speech-therapists', 'логопедия', 'ru', 'synonym', 0),
    ('speech-therapists', 'логопед', 'uk', 'synonym', 0),
    ('speech-therapists', 'логопедія', 'uk', 'synonym', 0),
    ('speech-therapists', 'Logopäde', 'de', 'synonym', 0),
    ('speech-therapists', 'Logopädie', 'de', 'synonym', 0),
    -- massage-therapists
    ('massage-therapists', 'массаж', 'ru', 'synonym', 0),
    ('massage-therapists', 'массажист', 'ru', 'synonym', 0),
    ('massage-therapists', 'масаж', 'uk', 'synonym', 0),
    ('massage-therapists', 'масажист', 'uk', 'synonym', 0),
    ('massage-therapists', 'Massage', 'de', 'synonym', 0),
    ('massage-therapists', 'Masseur', 'de', 'synonym', 0),
    -- nutritionists
    ('nutritionists', 'диетолог', 'ru', 'synonym', 0),
    ('nutritionists', 'консультация диетолога', 'ru', 'synonym', 0),
    ('nutritionists', 'дієтолог', 'uk', 'synonym', 0),
    ('nutritionists', 'консультація дієтолога', 'uk', 'synonym', 0),
    ('nutritionists', 'Ernährungsberater', 'de', 'synonym', 0),
    ('nutritionists', 'Ernährungsberatung', 'de', 'synonym', 0),
    -- cosmetologists
    ('cosmetologists', 'косметолог', 'ru', 'synonym', 0),
    ('cosmetologists', 'косметология', 'ru', 'synonym', 0),
    ('cosmetologists', 'косметолог', 'uk', 'synonym', 0),
    ('cosmetologists', 'косметологія', 'uk', 'synonym', 0),
    ('cosmetologists', 'Kosmetiker', 'de', 'synonym', 0),
    ('cosmetologists', 'Kosmetik', 'de', 'synonym', 0),
    -- nails
    ('nails', 'маникюр', 'ru', 'synonym', 0),
    ('nails', 'педикюр', 'ru', 'synonym', 0),
    ('nails', 'манікюр', 'uk', 'synonym', 0),
    ('nails', 'педикюр', 'uk', 'synonym', 0),
    ('nails', 'Maniküre', 'de', 'synonym', 0),
    ('nails', 'Pediküre', 'de', 'synonym', 0),
    -- hairdressers
    ('hairdressers', 'парикмахер', 'ru', 'synonym', 0),
    ('hairdressers', 'стрижка', 'ru', 'synonym', 0),
    ('hairdressers', 'перукар', 'uk', 'synonym', 0),
    ('hairdressers', 'стрижка', 'uk', 'synonym', 0),
    ('hairdressers', 'Friseur', 'de', 'synonym', 0),
    ('hairdressers', 'Haarschnitt', 'de', 'synonym', 0),
    -- barbers
    ('barbers', 'барбер', 'ru', 'synonym', 0),
    ('barbers', 'барбершоп', 'ru', 'synonym', 0),
    ('barbers', 'барбер', 'uk', 'synonym', 0),
    ('barbers', 'барбершоп', 'uk', 'synonym', 0),
    ('barbers', 'Barber', 'de', 'synonym', 0),
    ('barbers', 'Barbershop', 'de', 'synonym', 0),
    -- makeup-artists
    ('makeup-artists', 'визажист', 'ru', 'synonym', 0),
    ('makeup-artists', 'макияж', 'ru', 'synonym', 0),
    ('makeup-artists', 'візажист', 'uk', 'synonym', 0),
    ('makeup-artists', 'макіяж', 'uk', 'synonym', 0),
    ('makeup-artists', 'Visagist', 'de', 'synonym', 0),
    ('makeup-artists', 'Make-up', 'de', 'synonym', 0),
    -- brows-lashes
    ('brows-lashes', 'брови', 'ru', 'synonym', 0),
    ('brows-lashes', 'ресницы', 'ru', 'synonym', 0),
    ('brows-lashes', 'брови', 'uk', 'synonym', 0),
    ('brows-lashes', 'вії', 'uk', 'synonym', 0),
    ('brows-lashes', 'Augenbrauen', 'de', 'synonym', 0),
    ('brows-lashes', 'Wimpern', 'de', 'synonym', 0),
    -- cleaning
    ('cleaning', 'уборка', 'ru', 'synonym', 0),
    ('cleaning', 'клининг', 'ru', 'synonym', 0),
    ('cleaning', 'прибирання', 'uk', 'synonym', 0),
    ('cleaning', 'клінінг', 'uk', 'synonym', 0),
    ('cleaning', 'Reinigung', 'de', 'synonym', 0),
    ('cleaning', 'Putzfrau', 'de', 'synonym', 0),
    -- furniture-assembly
    ('furniture-assembly', 'сборка мебели', 'ru', 'synonym', 0),
    ('furniture-assembly', 'монтаж мебели', 'ru', 'synonym', 0),
    ('furniture-assembly', 'збірка меблів', 'uk', 'synonym', 0),
    ('furniture-assembly', 'монтаж меблів', 'uk', 'synonym', 0),
    ('furniture-assembly', 'Möbelaufbau', 'de', 'synonym', 0),
    ('furniture-assembly', 'Möbelmontage', 'de', 'synonym', 0),
    -- gardening
    ('gardening', 'садовник', 'ru', 'synonym', 0),
    ('gardening', 'сад', 'ru', 'synonym', 0),
    ('gardening', 'садівник', 'uk', 'synonym', 0),
    ('gardening', 'сад', 'uk', 'synonym', 0),
    ('gardening', 'Gartenpflege', 'de', 'synonym', 0),
    ('gardening', 'Gartenarbeit', 'de', 'synonym', 0),
    -- coaches
    ('coaches', 'коуч', 'ru', 'synonym', 0),
    ('coaches', 'коучинг', 'ru', 'synonym', 0),
    ('coaches', 'коуч', 'uk', 'synonym', 0),
    ('coaches', 'коучинг', 'uk', 'synonym', 0),
    ('coaches', 'Coach', 'de', 'synonym', 0),
    ('coaches', 'Coaching', 'de', 'synonym', 0),
    -- tutors
    ('tutors', 'репетитор', 'ru', 'synonym', 0),
    ('tutors', 'репетиторство', 'ru', 'synonym', 0),
    ('tutors', 'репетитор', 'uk', 'synonym', 0),
    ('tutors', 'репетиторство', 'uk', 'synonym', 0),
    ('tutors', 'Nachhilfe', 'de', 'synonym', 0),
    ('tutors', 'Nachhilfelehrer', 'de', 'synonym', 0),
    -- language-teachers
    ('language-teachers', 'преподаватель языков', 'ru', 'synonym', 0),
    ('language-teachers', 'языковые курсы', 'ru', 'synonym', 0),
    ('language-teachers', 'викладач мов', 'uk', 'synonym', 0),
    ('language-teachers', 'мовні курси', 'uk', 'synonym', 0),
    ('language-teachers', 'Sprachlehrer', 'de', 'synonym', 0),
    ('language-teachers', 'Sprachkurs', 'de', 'synonym', 0),
    -- music-teachers
    ('music-teachers', 'музыкальный педагог', 'ru', 'synonym', 0),
    ('music-teachers', 'уроки музыки', 'ru', 'synonym', 0),
    ('music-teachers', 'музичний педагог', 'uk', 'synonym', 0),
    ('music-teachers', 'уроки музики', 'uk', 'synonym', 0),
    ('music-teachers', 'Musiklehrer', 'de', 'synonym', 0),
    ('music-teachers', 'Musikunterricht', 'de', 'synonym', 0),
    -- online-education
    ('online-education', 'онлайн-обучение', 'ru', 'synonym', 0),
    ('online-education', 'онлайн-курсы', 'ru', 'synonym', 0),
    ('online-education', 'онлайн-навчання', 'uk', 'synonym', 0),
    ('online-education', 'онлайн-курси', 'uk', 'synonym', 0),
    ('online-education', 'Online-Bildung', 'de', 'synonym', 0),
    ('online-education', 'Online-Kurs', 'de', 'synonym', 0),
    -- apartment-moving
    ('apartment-moving', 'квартирный переезд', 'ru', 'synonym', 0),
    ('apartment-moving', 'переезд квартиры', 'ru', 'synonym', 0),
    ('apartment-moving', 'квартирний переїзд', 'uk', 'synonym', 0),
    ('apartment-moving', 'Wohnungsumzug', 'de', 'synonym', 0),
    -- furniture-removal
    ('furniture-removal', 'вывоз мебели', 'ru', 'synonym', 0),
    ('furniture-removal', 'утилизация мебели', 'ru', 'synonym', 0),
    ('furniture-removal', 'вивезення меблів', 'uk', 'synonym', 0),
    ('furniture-removal', 'Möbelentsorgung', 'de', 'synonym', 0),
    ('furniture-removal', 'Sperrmüll', 'de', 'synonym', 0),
    -- movers
    ('movers', 'грузчики', 'ru', 'synonym', 0),
    ('movers', 'погрузка', 'ru', 'synonym', 0),
    ('movers', 'вантажники', 'uk', 'synonym', 0),
    ('movers', 'навантаження', 'uk', 'synonym', 0),
    ('movers', 'Möbelpacker', 'de', 'synonym', 0),
    ('movers', 'Träger', 'de', 'synonym', 0),
    -- international-moving
    ('international-moving', 'международный переезд', 'ru', 'synonym', 0),
    ('international-moving', 'переезд в другую страну', 'ru', 'synonym', 0),
    ('international-moving', 'міжнародний переїзд', 'uk', 'synonym', 0),
    ('international-moving', 'Auslandsumzug', 'de', 'synonym', 0),
    ('international-moving', 'internationaler Umzug', 'de', 'synonym', 0),
    -- taxi-transfer
    ('taxi-transfer', 'такси', 'ru', 'synonym', 0),
    ('taxi-transfer', 'трансфер', 'ru', 'synonym', 0),
    ('taxi-transfer', 'таксі', 'uk', 'synonym', 0),
    ('taxi-transfer', 'трансфер', 'uk', 'synonym', 0),
    ('taxi-transfer', 'Taxi', 'de', 'synonym', 0),
    ('taxi-transfer', 'Transfer', 'de', 'synonym', 0),
    -- it-support
    ('it-support', 'IT-поддержка', 'ru', 'synonym', 0),
    ('it-support', 'айти помощь', 'ru', 'synonym', 0),
    ('it-support', 'IT-підтримка', 'uk', 'synonym', 0),
    ('it-support', 'IT-Support', 'de', 'synonym', 0),
    ('it-support', 'Helpdesk', 'de', 'synonym', 0),
    -- network-setup
    ('network-setup', 'настройка интернета', 'ru', 'synonym', 0),
    ('network-setup', 'Wi-Fi', 'ru', 'synonym', 0),
    ('network-setup', 'налаштування інтернету', 'uk', 'synonym', 0),
    ('network-setup', 'Wi-Fi', 'uk', 'synonym', 0),
    ('network-setup', 'WLAN', 'de', 'synonym', 0),
    ('network-setup', 'Router einrichten', 'de', 'synonym', 0),
    -- computer-repair
    ('computer-repair', 'ремонт компьютера', 'ru', 'synonym', 0),
    ('computer-repair', 'ремонт ПК', 'ru', 'synonym', 0),
    ('computer-repair', 'ремонт комп''ютера', 'uk', 'synonym', 0),
    ('computer-repair', 'ремонт ПК', 'uk', 'synonym', 0),
    ('computer-repair', 'Computerreparatur', 'de', 'synonym', 0),
    ('computer-repair', 'PC-Reparatur', 'de', 'synonym', 0),
    -- printer-repair
    ('printer-repair', 'ремонт принтера', 'ru', 'synonym', 0),
    ('printer-repair', 'оргтехника', 'ru', 'synonym', 0),
    ('printer-repair', 'ремонт принтера', 'uk', 'synonym', 0),
    ('printer-repair', 'оргтехніка', 'uk', 'synonym', 0),
    ('printer-repair', 'Druckerreparatur', 'de', 'synonym', 0),
    ('printer-repair', 'Bürotechnik', 'de', 'synonym', 0),
    -- lawyers
    ('lawyers', 'адвокат', 'ru', 'synonym', 0),
    ('lawyers', 'юрист', 'ru', 'synonym', 0),
    ('lawyers', 'адвокат', 'uk', 'synonym', 0),
    ('lawyers', 'юрист', 'uk', 'synonym', 0),
    ('lawyers', 'Anwalt', 'de', 'synonym', 0),
    ('lawyers', 'Rechtsanwalt', 'de', 'synonym', 0),
    -- migration-consultants
    ('migration-consultants', 'миграционный консультант', 'ru', 'synonym', 0),
    ('migration-consultants', 'ВНЖ', 'ru', 'synonym', 0),
    ('migration-consultants', 'міграційний консультант', 'uk', 'synonym', 0),
    ('migration-consultants', 'ВНЖ', 'uk', 'synonym', 0),
    ('migration-consultants', 'Migrationsberater', 'de', 'synonym', 0),
    ('migration-consultants', 'Aufenthaltstitel', 'de', 'synonym', 0),
    -- tax-consultants
    ('tax-consultants', 'налоговый консультант', 'ru', 'synonym', 0),
    ('tax-consultants', 'налоги', 'ru', 'synonym', 0),
    ('tax-consultants', 'податковий консультант', 'uk', 'synonym', 0),
    ('tax-consultants', 'податки', 'uk', 'synonym', 0),
    ('tax-consultants', 'Steuerberater', 'de', 'synonym', 0),
    ('tax-consultants', 'Steuerberatung', 'de', 'synonym', 0)
) AS v(slug, term, lang, term_type, weight) ON c.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.category_search_terms t
  WHERE t.category_id = c.id
    AND lower(trim(t.term)) = lower(trim(v.term))
    AND t.lang IS NOT DISTINCT FROM v.lang
);

COMMIT;
