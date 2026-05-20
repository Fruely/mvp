-- Freuly Growth System CRM views
-- Human-readable views for external CRM/Baserow sync
-- Created: 2026-05-20

create or replace view public.growth_category_opportunities_view as
select
  co.id,
  co.country as "Страна",
  co.region as "Регион",
  co.city as "Город",
  co.category_slug as "Категория",
  co.subcategory_candidate as "Подкатегория",
  co.supply_count as "Сигналы предложения",
  co.demand_count as "Сигналы спроса",
  co.unique_source_count as "Уникальные источники",
  co.main_channels as "Основные каналы",
  case co.market_density
    when 'low' then 'Низкая'
    when 'medium' then 'Средняя'
    when 'high' then 'Высокая'
    when 'very_high' then 'Очень высокая'
    else 'Не определена'
  end as "Плотность рынка",
  case co.supply_demand_balance
    when 'supply_higher' then 'Предложение выше спроса'
    when 'demand_higher' then 'Спрос выше предложения'
    when 'balanced' then 'Спрос и предложение сбалансированы'
    when 'insufficient_data' then 'Недостаточно данных'
    else 'Не определено'
  end as "Баланс спроса и предложения",
  co.opportunity_score as "Оценка перспективности",
  case
    when co.opportunity_score >= 80 then 'Высокий приоритет'
    when co.opportunity_score >= 60 then 'Средний приоритет'
    when co.opportunity_score >= 40 then 'Низкий приоритет'
    when co.opportunity_score is null then 'Не оценено'
    else 'Очень низкий приоритет'
  end as "Приоритет",
  co.recommended_action as "Рекомендованное действие",
  co.ai_summary as "AI-вывод",
  co.last_calculated_at as "Последний расчёт",
  co.created_at as "Создано",
  co.updated_at as "Обновлено"
from public.category_opportunities co;

create or replace view public.growth_content_tasks_view as
select
  ct.id,
  ct.source_opportunity_id,
  ct.source_signal_id,
  case ct.content_goal
    when 'attract_specialists' then 'Привлечение специалистов'
    when 'attract_clients' then 'Привлечение клиентов'
    when 'seo' then 'SEO'
    when 'brand' then 'Бренд'
    when 'other' then 'Другое'
    else ct.content_goal
  end as "Цель контента",
  case ct.channel
    when 'threads' then 'Threads'
    when 'telegram' then 'Telegram'
    when 'facebook' then 'Facebook'
    when 'instagram' then 'Instagram'
    when 'seo' then 'SEO'
    when 'other' then 'Другое'
    else ct.channel
  end as "Канал",
  case ct.content_type
    when 'post' then 'Пост'
    when 'thread' then 'Цепочка'
    when 'seo_page' then 'SEO-страница'
    when 'ad_idea' then 'Идея рекламы'
    when 'message' then 'Сообщение'
    when 'other' then 'Другое'
    else ct.content_type
  end as "Тип контента",
  ct.country as "Страна",
  ct.region as "Регион",
  ct.city as "Город",
  ct.category_slug as "Категория",
  ct.subcategory_candidate as "Подкатегория",
  ct.target_audience as "Целевая аудитория",
  ct.topic as "Тема",
  ct.angle as "Угол подачи",
  ct.source_insight as "Основание из данных",
  ct.draft_text as "Готовый текст",
  ct.cta as "CTA",
  ct.priority as "Приоритет",
  case ct.status
    when 'idea' then 'Идея'
    when 'draft_ready' then 'Черновик готов'
    when 'needs_review' then 'Нужна проверка'
    when 'approved' then 'Одобрено'
    when 'published' then 'Опубликовано'
    when 'rejected' then 'Отклонено'
    else ct.status
  end as "Статус",
  ct.publish_date as "Дата публикации",
  ct.published_url as "Ссылка на публикацию",
  ct.crm_external_id as "CRM ID",
  ct.notes as "Заметки",
  ct.created_at as "Создано",
  ct.updated_at as "Обновлено"
from public.content_tasks ct;

create or replace view public.growth_scout_prospects_view as
select
  sp.id,
  sp.source_signal_id,
  sp.source_type as "Тип источника",
  sp.source_platform as "Платформа источника",
  sp.source_url as "Ссылка на источник",
  coalesce(sp.business_name, sp.name, 'Без имени') as "Имя / бизнес",
  sp.service_summary as "Описание услуги",
  sp.country as "Страна",
  sp.region as "Регион",
  sp.city as "Город",
  sp.language_detected as "Определённый язык",
  sp.languages as "Языки",
  sp.category_slug as "Категория",
  sp.subcategory_candidate as "Подкатегория",
  sp.phone as "Телефон",
  sp.email as "Email",
  sp.website as "Сайт",
  sp.instagram as "Instagram",
  sp.telegram as "Telegram",
  sp.facebook as "Facebook",
  sp.linkedin as "LinkedIn",
  sp.available_channels as "Доступные каналы",
  sp.preferred_contact_channel as "Рекомендуемый канал",
  sp.backup_contact_channel as "Резервный канал",
  sp.contact_channel_reason as "Причина выбора канала",
  case sp.contact_risk_level
    when 'low' then 'Низкий'
    when 'medium' then 'Средний'
    when 'high' then 'Высокий'
    else 'Не определён'
  end as "Риск контакта",
  sp.ai_summary as "AI-описание",
  sp.ai_score as "AI-оценка",
  sp.ai_confidence as "AI-уверенность",
  case sp.status
    when 'new' then 'Новый'
    when 'review_needed' then 'Нужна проверка'
    when 'approved' then 'Одобрен'
    when 'contacted' then 'Связались'
    when 'replied' then 'Ответил'
    when 'interested' then 'Заинтересован'
    when 'registered' then 'Зарегистрировался'
    when 'not_relevant' then 'Не подходит'
    when 'duplicate' then 'Дубликат'
    when 'do_not_contact' then 'Не контактировать'
    else sp.status
  end as "Статус",
  case sp.outreach_status
    when 'not_contacted' then 'Не контактировали'
    when 'message_prepared' then 'Сообщение подготовлено'
    when 'message_sent' then 'Сообщение отправлено'
    when 'replied' then 'Ответил'
    when 'no_response' then 'Нет ответа'
    when 'do_not_contact' then 'Не контактировать'
    else sp.outreach_status
  end as "Статус контакта",
  sp.duplicate_key as "Ключ дубля",
  sp.duplicate_of as "Дубликат записи",
  sp.crm_external_id as "CRM ID",
  sp.notes as "Заметки",
  sp.created_at as "Создано",
  sp.updated_at as "Обновлено"
from public.scout_prospects sp;

create or replace view public.growth_market_signals_view as
select
  ms.id,
  case ms.signal_type
    when 'supply' then 'Предложение'
    when 'demand' then 'Спрос'
    else ms.signal_type
  end as "Тип сигнала",
  ms.country as "Страна",
  ms.region as "Регион",
  ms.city as "Город",
  ms.language_detected as "Язык",
  ms.category_slug as "Категория",
  ms.subcategory_candidate as "Подкатегория",
  ms.source_platform as "Платформа источника",
  ms.source_url as "Ссылка на источник",
  ms.signal_text as "Текст сигнала",
  ms.has_instagram as "Есть Instagram",
  ms.has_telegram as "Есть Telegram",
  ms.has_facebook as "Есть Facebook",
  ms.has_website as "Есть сайт",
  ms.has_email as "Есть email",
  ms.has_phone as "Есть телефон",
  ms.is_self_employed_signal as "Самозанятый / специалист",
  ms.is_business_offer as "Бизнес-предложение",
  ms.confidence as "AI-уверенность",
  ms.notes as "Заметки",
  ms.created_at as "Создано",
  ms.updated_at as "Обновлено"
from public.market_signals ms;

create or replace view public.growth_crm_sync_log_view as
select
  csl.id,
  case csl.entity_type
    when 'specialist' then 'Специалист'
    when 'subscription' then 'Подписка'
    when 'lead' then 'Заявка'
    when 'market_signal' then 'Рыночный сигнал'
    when 'category_opportunity' then 'Категория / возможность'
    when 'scout_prospect' then 'Потенциальный специалист'
    when 'content_task' then 'Контентная задача'
    when 'other' then 'Другое'
    else csl.entity_type
  end as "Тип сущности",
  csl.entity_id as "ID сущности",
  csl.crm_name as "CRM",
  csl.crm_table_name as "Таблица CRM",
  csl.crm_external_id as "CRM ID",
  case csl.sync_direction
    when 'supabase_to_crm' then 'Supabase → CRM'
    when 'crm_to_supabase' then 'CRM → Supabase'
    else csl.sync_direction
  end as "Направление",
  case csl.sync_status
    when 'success' then 'Успешно'
    when 'failed' then 'Ошибка'
    when 'skipped' then 'Пропущено'
    else csl.sync_status
  end as "Статус",
  csl.error_message as "Ошибка",
  csl.payload as "Payload",
  csl.synced_at as "Синхронизировано"
from public.crm_sync_log csl;
