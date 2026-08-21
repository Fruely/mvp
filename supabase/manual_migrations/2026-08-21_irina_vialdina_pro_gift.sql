-- Gifted Pro Page seed for Irina Vialdina (slug: psychologists-irina-vialdina).
-- Manual data script — apply AFTER 2026-08-21_specialist_pro_pages.sql.
-- No-op when the exact slug is absent. Does not touch other specialists.

BEGIN;

DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT s.id
  INTO target_id
  FROM public.specialists s
  WHERE s.slug = 'psychologists-irina-vialdina'
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE NOTICE 'psychologists-irina-vialdina not found; skipping Irina Pro gift seed.';
    RETURN;
  END IF;

  INSERT INTO public.specialist_pro_entitlements (
    specialist_id,
    source,
    is_active,
    granted_at,
    metadata
  )
  VALUES (
    target_id,
    'gifted',
    true,
    now(),
    jsonb_build_object(
      'reason', 'Freuly gifted Pro Page reference (Phase 1)',
      'slug', 'psychologists-irina-vialdina'
    )
  )
  ON CONFLICT (specialist_id) DO UPDATE SET
    source = EXCLUDED.source,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  INSERT INTO public.specialist_pro_pages (
    specialist_id,
    status,
    display_name,
    profession_label,
    positioning,
    client_requests,
    work_process,
    why_me,
    story,
    client_language,
    published_at,
    updated_at
  )
  VALUES (
    target_id,
    'published',
    'Ирина Вялдина',
    'NLP-консультант',
    'Помогаю разобраться с конкретной ситуацией, которая сейчас мешает жить спокойнее и свободнее: страхом, тревогой, сложным решением или повторяющейся реакцией.',
    '[
      {"title":"Когда тревожно и трудно успокоиться","description":"Если внутри постоянно напряжение, мысли возвращаются к одному и тому же, а расслабиться не получается."},
      {"title":"Когда что-то стало страшно делать","description":"Например, сесть за руль, выступить перед людьми, начать новое дело или сделать важный шаг."},
      {"title":"Когда трудно принять важное решение","description":"Работа, отношения, переезд, новый этап жизни — иногда разумом всё понятно, а внутренней ясности всё равно нет."},
      {"title":"Когда жизнь сильно изменилась","description":"Переезд, новая страна, новая работа, расставание или новый этап жизни."},
      {"title":"Когда похожая ситуация повторяется снова","description":"Другие обстоятельства, а ощущение или реакция почему-то снова знакомы."},
      {"title":"Когда есть одна конкретная проблема","description":"Не обязательно разбираться сразу со всей жизнью. Можно начать с того, что беспокоит сейчас."}
    ]'::jsonb,
    '[
      {"title":"Вы рассказываете о ситуации","description":""},
      {"title":"Вместе уточняете, что именно хочется изменить","description":""},
      {"title":"Работаете с конкретным запросом","description":""},
      {"title":"Определяете следующий шаг","description":""}
    ]'::jsonb,
    '[
      {"title":"Большой жизненный опыт","description":"За плечами — смена стран, профессий и жизненных этапов. Это помогает лучше понимать разные ситуации клиентов."},
      {"title":"Смена профессионального пути","description":"Сначала маркетинг и бизнес, затем консультирование. Я знаю, каково это — начинать заново и искать опору."},
      {"title":"Практический подход","description":"Без обещаний «волшебного результата». Работаем с конкретным запросом и следующим шагом, который можно сделать уже сейчас."}
    ]'::jsonb,
    'Мне не раз приходилось в жизни начинать всё заново: новая страна, новая работа, новые правила. Этот опыт научил меня опираться на себя и искать ясность шаг за шагом. Сейчас я помогаю другим так же — через консультирование и практическую работу с конкретной ситуацией, которая мешает двигаться дальше.',
    'ru',
    now(),
    now()
  )
  ON CONFLICT (specialist_id) DO UPDATE SET
    status = EXCLUDED.status,
    display_name = EXCLUDED.display_name,
    profession_label = EXCLUDED.profession_label,
    positioning = EXCLUDED.positioning,
    client_requests = EXCLUDED.client_requests,
    work_process = EXCLUDED.work_process,
    why_me = EXCLUDED.why_me,
    story = EXCLUDED.story,
    client_language = EXCLUDED.client_language,
    published_at = EXCLUDED.published_at,
    updated_at = now();
END $$;

COMMIT;
