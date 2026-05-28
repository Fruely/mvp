-- Freuly Growth System: cleanup Russian operator labels
-- Purpose:
-- 1. Avoid empty labels when category/subcategory is null.
-- 2. Humanize technical slugs inside operator-facing topics.

create or replace function public.growth_category_label_ru(slug text)
returns text
language sql
immutable
as $$
  select case
    when slug is null or btrim(slug) = '' then null
    when slug = 'beauty' then 'Красота'
    when slug = 'repair' then 'Ремонт'
    when slug = 'tutoring' then 'Обучение'
    when slug = 'business-services' then 'Бизнес-услуги'
    when slug = 'documents-relocation' then 'Документы и переезд'
    when slug = 'legal-services' then 'Юридические услуги'
    when slug = 'health-psychology' then 'Здоровье и психология'
    when slug = 'psychology' then 'Психология'
    when slug = 'home-services' then 'Домашние услуги'
    when slug = 'family-services' then 'Семейные услуги'
    when slug = 'auto-services' then 'Автоуслуги'
    when slug = 'photo-video' then 'Фото и видео'
    else slug
  end
$$;

create or replace function public.growth_subcategory_label_ru(slug text)
returns text
language sql
immutable
as $$
  select case
    when slug is null or btrim(slug) = '' then null
    when slug = 'manicure' then 'Маникюр'
    when slug = 'electrician' then 'Электрик'
    when slug = 'german_tutor' then 'Репетитор немецкого'
    when slug = 'accountant' then 'Бухгалтер'
    when slug = 'renovation' then 'Ремонт квартиры'
    when slug = 'documents_help' then 'Помощь с документами'
    when slug = 'lawyer' then 'Юрист'
    when slug = 'massage' then 'Массаж'
    when slug = 'brows_lashes' then 'Брови и ресницы'
    when slug = 'cosmetologist' then 'Косметолог'
    when slug = 'plumber' then 'Сантехник'
    when slug = 'psychologist' then 'Психолог'
    when slug = 'photographer' then 'Фотограф'
    when slug = 'translator' then 'Переводчик'
    when slug = 'cleaning' then 'Уборка'
    when slug = 'babysitter' then 'Няня'
    when slug = 'car_repair' then 'Автомеханик'
    when slug = 'repair' then 'Ремонт'
    else slug
  end
$$;

create or replace function public.growth_humanize_text_ru(value text)
returns text
language sql
immutable
as $$
  select
    case
      when value is null then null
      else
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
          value,
          'brows_lashes', 'брови и ресницы'
        ),
          'documents_help', 'помощь с документами'
        ),
          'german_tutor', 'репетитор немецкого'
        ),
          'car_repair', 'автомеханик'
        ),
          'accountant', 'бухгалтер'
        ),
          'renovation', 'ремонт квартиры'
        ),
          'electrician', 'электрик'
        ),
          'manicure', 'маникюр'
        ),
          'lawyer', 'юрист'
        ),
          'massage', 'массаж'
        ),
          'cosmetologist', 'косметолог'
        ),
          'translator', 'переводчик'
        )
    end
$$;

create or replace view public.growth_content_tasks_operator_view as
select
  ct.id,

  concat(
    coalesce(
      public.growth_subcategory_label_ru(ct.subcategory_candidate),
      public.growth_category_label_ru(ct.category_slug),
      'Контент'
    ),
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

  public.growth_humanize_text_ru(ct.topic) as "Тема",
  ct.draft_text as "Готовый текст",
  ct.cta as "CTA",
  ct.target_audience as "Целевая аудитория",
  public.growth_humanize_text_ru(ct.source_insight) as "Источник инсайта",

  case
    when ct.content_goal = 'attract_clients' then
      concat(
        'Готова контентная задача для привлечения клиентов в сегменте ',
        coalesce(
          public.growth_subcategory_label_ru(ct.subcategory_candidate),
          public.growth_category_label_ru(ct.category_slug),
          'услуга'
        ),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
    when ct.content_goal = 'attract_specialists' then
      concat(
        'Готова контентная задача для привлечения специалистов в сегменте ',
        coalesce(
          public.growth_subcategory_label_ru(ct.subcategory_candidate),
          public.growth_category_label_ru(ct.category_slug),
          'услуга'
        ),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
    else
      concat(
        'Готова контентная задача по сегменту ',
        coalesce(
          public.growth_subcategory_label_ru(ct.subcategory_candidate),
          public.growth_category_label_ru(ct.category_slug),
          'услуга'
        ),
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
    coalesce(
      public.growth_subcategory_label_ru(sp.subcategory_candidate),
      public.growth_category_label_ru(sp.category_slug),
      'Специалист'
    ),
    ' / ',
    coalesce(sp.city, sp.region, sp.country, 'Germany'),
    ' / ',
    coalesce(sp.preferred_contact_channel, sp.source_platform, 'contact')
  ) as "Name",

  sp.service_summary as "Описание услуги",
  public.growth_humanize_text_ru(sp.ai_summary) as "AI-описание",
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
        coalesce(
          public.growth_subcategory_label_ru(sp.subcategory_candidate),
          public.growth_category_label_ru(sp.category_slug),
          'услуга'
        ),
        ' / ',
        coalesce(sp.city, sp.region, sp.country, 'Germany'),
        '. Рекомендуемый канал контакта: ',
        sp.preferred_contact_channel,
        '.'
      )
    else
      concat(
        'Найден потенциальный специалист в сегменте ',
        coalesce(
          public.growth_subcategory_label_ru(sp.subcategory_candidate),
          public.growth_category_label_ru(sp.category_slug),
          'услуга'
        ),
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
        coalesce(
          public.growth_subcategory_label_ru(sp.subcategory_candidate),
          public.growth_category_label_ru(sp.category_slug)
        ),
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
