-- Freuly Growth System: operator guidance view for Content Tasks
-- Purpose: show content tasks as clear operator actions, not technical CRM rows.

create or replace view public.growth_content_tasks_operator_view as
select
  ct.id,

  concat(
    coalesce(ct.subcategory_candidate, ct.category_slug, 'content'),
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
  ct.category_slug as "Категория",
  ct.subcategory_candidate as "Подкатегория",

  ct.topic as "Тема",
  ct.draft_text as "Готовый текст",
  ct.cta as "CTA",
  ct.target_audience as "Целевая аудитория",
  ct.source_insight as "Источник инсайта",

  case
    when ct.content_goal = 'attract_clients' then
      concat(
        'Готова контентная задача для привлечения клиентов в сегменте ',
        coalesce(ct.subcategory_candidate, ct.category_slug, 'услуга'),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
    when ct.content_goal = 'attract_specialists' then
      concat(
        'Готова контентная задача для привлечения специалистов в сегменте ',
        coalesce(ct.subcategory_candidate, ct.category_slug, 'услуга'),
        ' / ',
        coalesce(ct.city, ct.region, ct.country, 'Germany'),
        '.'
      )
    else
      concat(
        'Готова контентная задача по сегменту ',
        coalesce(ct.subcategory_candidate, ct.category_slug, 'услуга'),
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
