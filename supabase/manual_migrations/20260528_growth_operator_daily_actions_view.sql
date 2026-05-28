-- Freuly Growth System: Operator Daily Actions view
-- Purpose: combine market/category actions, content actions and scout actions into one daily operator queue.

create or replace view public.growth_operator_daily_actions_view as

select
  concat('category:', co.id::text) as id,
  co.id as source_id,
  'category_opportunity' as source_table,
  'category_focus' as action_type,

  concat(
    coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug), 'Категория'),
    ' / ',
    coalesce(co.city, co.region, co.country, 'Germany')
  ) as "Name",

  case
    when co.opportunity_score >= 80 then 90
    when co.opportunity_score >= 60 then 75
    when co.opportunity_score >= 40 then 55
    else 30
  end as "Приоритет",

  case
    when co.opportunity_score >= 80 then 'Высокий приоритет'
    when co.opportunity_score >= 60 then 'Средний приоритет'
    when co.opportunity_score >= 40 then 'Низкий приоритет'
    else 'Наблюдать'
  end as "Операторский приоритет",

  'Работа с категорией' as "Тип действия",

  case
    when co.demand_count > co.supply_count then
      concat(
        'В сегменте ',
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug), 'услуга'),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' спрос выше предложения.'
      )
    when co.supply_count > co.demand_count then
      concat(
        'В сегменте ',
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug), 'услуга'),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' предложение выше спроса.'
      )
    else
      concat(
        'В сегменте ',
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug), 'услуга'),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' есть и спрос, и предложение.'
      )
  end as "Краткий вывод",

  case
    when co.demand_count > co.supply_count then
      'Найти дополнительных специалистов и параллельно подготовить клиентский контент.'
    when co.supply_count > co.demand_count then
      'Запустить клиентский контент, SEO-тему или тестовую публикацию, чтобы привести заявки.'
    else
      'Проверить готовые content tasks и запустить тестовую публикацию.'
  end as "Что сделать",

  case
    when co.demand_count > co.supply_count then
      'Спрос уже виден, но не хватает специалистов, которым можно направлять заявки.'
    when co.supply_count > co.demand_count then
      'Специалисты уже есть, но нужно привести клиентов к форме заявки.'
    else
      'Есть базовый баланс спроса и предложения, можно тестировать полный цикл.'
  end as "Почему важно",

  case
    when co.demand_count > co.supply_count then
      'Закрыть предложение специалистами и вести клиентов к заявке Freuly.'
    when co.supply_count > co.demand_count then
      'Привести клиентов к заявке через контент или тестовую рекламу.'
    else
      'Запустить тест: публикация → заявка → специалист.'
  end as "Действие для лидогенерации",

  case
    when co.main_channels::text ilike '%instagram%' then 'Instagram / Threads'
    when co.main_channels::text ilike '%telegram%' then 'Telegram / Threads'
    when co.main_channels::text ilike '%facebook%' then 'Facebook groups / Threads'
    else 'Threads / SEO / ручная проверка'
  end as "Рекомендуемый канал",

  'new' as "Статус",
  public.growth_category_label_ru(co.category_slug) as "Категория",
  public.growth_subcategory_label_ru(co.subcategory_candidate) as "Подкатегория",
  co.region as "Регион",
  co.city as "Город",
  co.updated_at as "Обновлено"

from public.category_opportunities co
where co.opportunity_score >= 40

union all

select
  concat('content:', ct.id::text) as id,
  ct.id as source_id,
  'content_tasks' as source_table,
  'publish_content' as action_type,

  concat(
    coalesce(public.growth_subcategory_label_ru(ct.subcategory_candidate), public.growth_category_label_ru(ct.category_slug), 'Контент'),
    ' / ',
    coalesce(ct.city, ct.region, ct.country, 'Germany'),
    ' / ',
    coalesce(ct.channel, 'channel')
  ) as "Name",

  coalesce(ct.priority, 50) as "Приоритет",

  case
    when coalesce(ct.priority, 0) >= 80 then 'Высокий приоритет'
    when coalesce(ct.priority, 0) >= 60 then 'Средний приоритет'
    when coalesce(ct.priority, 0) >= 40 then 'Низкий приоритет'
    else 'Наблюдать'
  end as "Операторский приоритет",

  'Публикация контента' as "Тип действия",

  concat(
    'Готова публикация: ',
    public.growth_humanize_text_ru(coalesce(ct.topic, 'без темы'))
  ) as "Краткий вывод",

  'Проверить текст, адаптировать под канал и опубликовать.' as "Что сделать",

  case
    when ct.content_goal = 'attract_clients' then
      'Эта публикация должна привести потенциального клиента к заявке Freuly.'
    when ct.content_goal = 'attract_specialists' then
      'Эта публикация помогает привлечь специалиста, который сможет принимать заявки.'
    else
      'Эта публикация усиливает видимость Freuly.'
  end as "Почему важно",

  case
    when ct.content_goal = 'attract_clients' then
      'Опубликовать и вести читателя к форме заявки Freuly.'
    when ct.content_goal = 'attract_specialists' then
      'Опубликовать и вести специалиста к созданию профиля Freuly.'
    else
      'Использовать публикацию для усиления воронки Freuly.'
  end as "Действие для лидогенерации",

  case
    when ct.channel = 'threads' then 'Threads'
    when ct.channel = 'telegram' then 'Telegram'
    when ct.channel = 'facebook' then 'Facebook groups'
    when ct.channel = 'seo' then 'SEO / сайт'
    else coalesce(ct.channel, 'Ручная проверка')
  end as "Рекомендуемый канал",

  ct.status as "Статус",
  public.growth_category_label_ru(ct.category_slug) as "Категория",
  public.growth_subcategory_label_ru(ct.subcategory_candidate) as "Подкатегория",
  ct.region as "Регион",
  ct.city as "Город",
  ct.updated_at as "Обновлено"

from public.content_tasks ct
where ct.status in ('draft_ready', 'ready', 'needs_review', 'review_needed')

union all

select
  concat('scout:', sp.id::text) as id,
  sp.id as source_id,
  'scout_prospects' as source_table,
  'check_specialist' as action_type,

  concat(
    coalesce(public.growth_subcategory_label_ru(sp.subcategory_candidate), public.growth_category_label_ru(sp.category_slug), 'Специалист'),
    ' / ',
    coalesce(sp.city, sp.region, sp.country, 'Germany'),
    ' / ',
    coalesce(sp.preferred_contact_channel, sp.source_platform, 'contact')
  ) as "Name",

  coalesce(sp.ai_score, 50) as "Приоритет",

  case
    when coalesce(sp.ai_score, 0) >= 80 then 'Высокий приоритет'
    when coalesce(sp.ai_score, 0) >= 60 then 'Средний приоритет'
    when coalesce(sp.ai_score, 0) >= 40 then 'Низкий приоритет'
    else 'Наблюдать'
  end as "Операторский приоритет",

  'Проверить специалиста' as "Тип действия",

  concat(
    'Найден потенциальный специалист: ',
    coalesce(public.growth_subcategory_label_ru(sp.subcategory_candidate), public.growth_category_label_ru(sp.category_slug), 'услуга'),
    ' / ',
    coalesce(sp.city, sp.region, sp.country, 'Germany')
  ) as "Краткий вывод",

  'Проверить профиль/источник. Если специалист релевантен, добавить в outreach и связаться вручную.' as "Что сделать",

  'Этот специалист может принимать будущие заявки Freuly в своей категории.' as "Почему важно",

  concat(
    'Проверить специалиста и подготовить аккуратный контакт через ',
    coalesce(sp.preferred_contact_channel, sp.source_platform, 'публичный канал'),
    '.'
  ) as "Действие для лидогенерации",

  coalesce(sp.preferred_contact_channel, sp.source_platform, 'Ручная проверка') as "Рекомендуемый канал",

  concat(coalesce(sp.status, 'new'), ' / ', coalesce(sp.outreach_status, 'not_contacted')) as "Статус",
  public.growth_category_label_ru(sp.category_slug) as "Категория",
  public.growth_subcategory_label_ru(sp.subcategory_candidate) as "Подкатегория",
  sp.region as "Регион",
  sp.city as "Город",
  sp.updated_at as "Обновлено"

from public.scout_prospects sp
where coalesce(sp.status, 'new') in ('new', 'approved')
  and coalesce(sp.outreach_status, 'not_contacted') in ('not_contacted', 'needs_followup');
