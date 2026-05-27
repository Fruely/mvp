-- Freuly Growth System: operator guidance view for Category Opportunities
-- Purpose: make Baserow understandable for non-technical operators.
-- Supabase remains the source of truth; this view is a human-readable operator layer.

create or replace view public.growth_category_opportunities_operator_view as
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
  co.market_density as "Плотность рынка",
  co.supply_demand_balance as "Баланс спроса и предложения",
  co.opportunity_score as "Оценка перспективности",

  case
    when co.opportunity_score >= 80 then 'Высокий приоритет'
    when co.opportunity_score >= 60 then 'Средний приоритет'
    when co.opportunity_score >= 40 then 'Низкий приоритет'
    else 'Наблюдать'
  end as "Операторский приоритет",

  case
    when co.demand_count > co.supply_count then
      concat(
        'В сегменте ',
        coalesce(co.subcategory_candidate, co.category_slug),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' спрос выше предложения. Это потенциальная зона для лидогенерации.'
      )
    when co.supply_count > co.demand_count then
      concat(
        'В сегменте ',
        coalesce(co.subcategory_candidate, co.category_slug),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' предложение выше спроса. Нужно усиливать привлечение заявок.'
      )
    when co.supply_count > 0 and co.demand_count > 0 then
      concat(
        'В сегменте ',
        coalesce(co.subcategory_candidate, co.category_slug),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' есть и спрос, и предложение. Можно тестировать контент и заявки.'
      )
    else
      concat(
        'По сегменту ',
        coalesce(co.subcategory_candidate, co.category_slug),
        ' пока мало данных. Нужно продолжать сбор сигналов.'
      )
  end as "Краткий вывод",

  case
    when co.demand_count > co.supply_count then
      'Запустить клиентский контент и параллельно найти дополнительных специалистов, которые смогут принимать заявки.'
    when co.supply_count > co.demand_count then
      'Подготовить клиентский контент, SEO-тему или тестовую публикацию, чтобы привести заявки к уже найденным специалистам.'
    when co.supply_count > 0 and co.demand_count > 0 then
      'Проверить готовые content tasks, опубликовать лучший материал и наблюдать за реакцией.'
    else
      'Добавить больше сигналов из Telegram/Facebook/Instagram/Threads и пересчитать Market Radar.'
  end as "Что сделать",

  case
    when co.demand_count > co.supply_count then
      'Если спрос уже виден, но специалистов мало, Freuly сначала нужно закрыть предложение: найти специалистов и подготовить их к получению заявок.'
    when co.supply_count > co.demand_count then
      'Если специалисты уже есть, но спроса мало, главный рычаг — контент, SEO и публикации, которые приводят клиентов к форме заявки.'
    when co.supply_count > 0 and co.demand_count > 0 then
      'Баланс спроса и предложения позволяет тестировать полный цикл: контент → заявка → специалист.'
    else
      'Недостаточно данных для уверенного действия. Сегмент пока не должен получать рекламный бюджет.'
  end as "Почему важно",

  case
    when co.demand_count > co.supply_count then
      'Найти специалистов + подготовить клиентский контент для заявки.'
    when co.supply_count > co.demand_count then
      'Привести клиентов к заявке через контент или тестовую рекламу.'
    when co.supply_count > 0 and co.demand_count > 0 then
      'Запустить тестовую публикацию и вести людей на заявку Freuly.'
    else
      'Собирать больше сигналов.'
  end as "Действие для лидогенерации",

  case
    when co.main_channels::text ilike '%instagram%' then 'Instagram / Threads'
    when co.main_channels::text ilike '%telegram%' then 'Telegram / Threads'
    when co.main_channels::text ilike '%facebook%' then 'Facebook groups / Threads'
    else 'Threads / SEO / ручная проверка'
  end as "Рекомендуемый канал действия",

  co.recommended_action as "Рекомендованное действие",
  co.ai_summary as "AI-вывод",

  co.last_calculated_at as "Последний расчёт",
  co.created_at as "Создано",
  co.updated_at as "Обновлено"

from public.category_opportunities co;
