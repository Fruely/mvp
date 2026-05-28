-- Freuly Growth System: Russian labels for Operator Content Tasks and Operator Scout Prospects
-- Depends on:
-- public.growth_category_label_ru(text)
-- public.growth_subcategory_label_ru(text)

create or replace view public.growth_content_tasks_operator_view as
select
  ct.id,

  concat(
    coalesce(public.growth_subcategory_label_ru(ct.subcategory_candidate), public.growth_category_label_ru(ct.category_slug), 'Контент'),
    ' / ',
    coalesce(ct.city, ct.region, ct.country, 'Germany'),
    ' / ',
    coalesce(ct.channel, 'channel')
  ) as "Name",

  ct.content_goal as "Цель контента",
  ct.channel as "Канал",
  ct.content_type as "Тип контента",
  ct.status as "Статус",
  ct.priority as "Приоритет",

  ct.country as "Страна",
  ct.region as "Регион",
  ct.city as "Город",
  public.growth_category_label_ru(ct.category_slug) as "Категория",
  public.growth_subcategory_label_ru(ct.subcategory_candidate) as "Подкатегория",

  ct.topic as "Тема",
  ct.draft_text as "Готовый текст",
  ct.cta as "CTA",
  ct.target_audience as "Целевая аудитория",
  ct.source_insight as "Источник инсайта",

  case
    when ct.content_goal = 'attract_clients' then
      concat(
        'Готова контентная задача для привлечения клиентов в сегменте ',
        coalesce(public.growth_subcategory_label_ru(ct.subcategory_candidate), public.growth_category_label_ru(ct.category_slug), 'услуга'),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
    when ct.content_goal = 'attract_specialists' then
      concat(
        'Готова контентная задача для привлечения специалистов в сегменте ',
        coalesce(public.growth_subcategory_label_ru(ct.subcategory_candidate), public.growth_category_label_ru(ct.category_slug), 'услуга'),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
    else
      concat(
        'Готова контентная задача по сегменту ',
        coalesce(public.growth_subcategory_label_ru(ct.subcategory_candidate), public.growth_category_label_ru(ct.category_slug), 'услуга'),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
  end as "Краткий вывод",

  case
    when ct.status in ('draft_ready', 'ready') then
      'Проверить текст, адаптировать под стиль канала и опубликовать.'
    when ct.status in ('published') then
      'Проверить результат публикации: реакции, комментарии, переходы и заявки.'
    when ct.status in ('needs_review', 'review_needed') then
      'Проверить вручную: текст, категорию, город, CTA и релевантность.'
    else
      'Проверить задачу и решить, готова ли она к публикации.'
  end as "Что сделать",

  case
    when ct.content_goal = 'attract_clients' then
      'Эта публикация должна привести потенциального клиента к заявке Freuly.'
    when ct.content_goal = 'attract_specialists' then
      'Эта публикация помогает найти специалистов, которым потом можно направлять заявки.'
    else
      'Эта задача поддерживает рост Freuly через контент и рыночную видимость.'
  end as "Почему важно",

  case
    when ct.content_goal = 'attract_clients' then
      'Опубликовать материал и вести читателя к форме заявки Freuly.'
    when ct.content_goal = 'attract_specialists' then
      'Опубликовать материал и вести специалиста к созданию профиля Freuly.'
    else
      'Использовать материал для усиления воронки Freuly.'
  end as "Действие для лидогенерации",

  case
    when ct.priority >= 80 then 'Высокий приоритет'
    when ct.priority >= 60 then 'Средний приоритет'
    when ct.priority >= 40 then 'Низкий приоритет'
    else 'Наблюдать'
  end as "Операторский приоритет",

  case
    when ct.channel = 'threads' then 'Threads'
    when ct.channel = 'telegram' then 'Telegram'
    when ct.channel = 'facebook' then 'Facebook groups'
    when ct.channel = 'seo' then 'SEO / сайт'
    else coalesce(ct.channel, 'Ручная проверка')
  end as "Рекомендуемый канал действия",

  ct.publish_date as "Дата публикации",
  ct.published_url as "Ссылка на публикацию",
  ct.crm_external_id as "CRM ID",
  ct.notes as "Заметки",
  ct.created_at as "Создано",
  ct.updated_at as "Обновлено"

from public.content_tasks ct;


create or replace view public.growth_scout_prospects_operator_view as
select
  sp.id,

  concat(
    coalesce(public.growth_subcategory_label_ru(sp.subcategory_candidate), public.growth_category_label_ru(sp.category_slug), 'Специалист'),
    ' / ',
    coalesce(sp.city, sp.region, sp.country, 'Germany'),
    ' / ',
    coalesce(sp.preferred_contact_channel, sp.source_platform, 'contact')
  ) as "Name",

  sp.service_summary as "Описание услуги",
  sp.ai_summary as "AI-описание",
  sp.ai_score as "AI-оценка",

  sp.source_platform as "Источник",
  sp.available_channels as "Доступные каналы",
  sp.preferred_contact_channel as "Рекомендуемый канал контакта",
  sp.contact_risk_level as "Риск контакта",

  sp.status as "Статус",
  sp.outreach_status as "Статус контакта",

  sp.country as "Страна",
  sp.region as "Регион",
  sp.city as "Город",
  public.growth_category_label_ru(sp.category_slug) as "Категория",
  public.growth_subcategory_label_ru(sp.subcategory_candidate) as "Подкатегория",

  case
    when sp.preferred_contact_channel is not null then
      concat(
        'Найден потенциальный специалист в сегменте ',
        coalesce(public.growth_subcategory_label_ru(sp.subcategory_candidate), public.growth_category_label_ru(sp.category_slug), 'услуга'),
        ' / ',
        coalesce(sp.city, sp.region, sp.country, 'Germany'),
        '. Рекомендуемый канал контакта: ',
        sp.preferred_contact_channel,
        '.'
      )
    else
      concat(
        'Найден потенциальный специалист в сегменте ',
        coalesce(public.growth_subcategory_label_ru(sp.subcategory_candidate), public.growth_category_label_ru(sp.category_slug), 'услуга'),
        ' / ',
        coalesce(sp.city, sp.region, sp.country, 'Germany'),
        ', но канал контакта требует ручной проверки.'
      )
  end as "Краткий вывод",

  case
    when sp.status = 'new' and sp.outreach_status = 'not_contacted' then
      'Проверить профиль/источник. Если специалист релевантен, добавить в outreach и связаться через рекомендуемый канал.'
    when sp.outreach_status = 'contacted' then
      'Проверить, был ли ответ. Если ответа нет, решить: повторить контакт позже или закрыть как неактуального.'
    when sp.status = 'approved' then
      'Проверить, готов ли специалист к регистрации/размещению на Freuly.'
    else
      'Проверить запись вручную и определить следующий статус.'
  end as "Что сделать",

  case
    when sp.category_slug is not null then
      concat(
        'Этот специалист может закрывать спрос в категории ',
        coalesce(public.growth_subcategory_label_ru(sp.subcategory_candidate), public.growth_category_label_ru(sp.category_slug)),
        ' и принимать будущие заявки Freuly.'
      )
    else
      'Специалист может быть полезен для Freuly, но категорию нужно уточнить вручную.'
  end as "Почему важно",

  case
    when sp.preferred_contact_channel is not null then
      concat(
        'Проверить специалиста и подготовить аккуратный контакт через ',
        sp.preferred_contact_channel,
        '. Цель — привести специалиста к созданию профиля Freuly.'
      )
    else
      'Сначала определить безопасный публичный канал контакта, затем решить по outreach.'
  end as "Действие для лидогенерации",

  case
    when sp.contact_risk_level = 'low' then 'Низкий'
    when sp.contact_risk_level = 'medium' then 'Средний'
    when sp.contact_risk_level = 'high' then 'Высокий'
    else coalesce(sp.contact_risk_level, 'Не определён')
  end as "Риск контакта RU",

  sp.contact_channel_reason as "Причина выбора канала",
  sp.duplicate_key as "Ключ дубля",
  sp.notes as "Заметки",
  sp.created_at as "Создано",
  sp.updated_at as "Обновлено"

from public.scout_prospects sp;
