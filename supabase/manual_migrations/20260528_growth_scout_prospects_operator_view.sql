-- Freuly Growth System: operator guidance view for Scout Prospects
-- Purpose: show potential specialists as clear operator actions.

create or replace view public.growth_scout_prospects_operator_view as
select
  sp.id,

  concat(
    coalesce(sp.subcategory_candidate, sp.category_slug, 'specialist'),
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
  sp.category_slug as "Категория",
  sp.subcategory_candidate as "Подкатегория",

  case
    when sp.preferred_contact_channel is not null then
      concat(
        'Найден потенциальный специалист в сегменте ',
        coalesce(sp.subcategory_candidate, sp.category_slug, 'услуга'),
        ' / ',
        coalesce(sp.city, sp.region, sp.country, 'Germany'),
        '. Рекомендуемый канал контакта: ',
        sp.preferred_contact_channel,
        '.'
      )
    else
      concat(
        'Найден потенциальный специалист в сегменте ',
        coalesce(sp.subcategory_candidate, sp.category_slug, 'услуга'),
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
        coalesce(sp.subcategory_candidate, sp.category_slug),
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
