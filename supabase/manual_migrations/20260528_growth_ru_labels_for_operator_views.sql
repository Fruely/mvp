-- Freuly Growth System: Russian labels for operator views
-- Purpose: make Baserow operator tables friendly for non-technical users.

create or replace function public.growth_category_label_ru(slug text)
returns text
language sql
immutable
as $$
  select case slug
    when 'beauty' then 'Красота'
    when 'repair' then 'Ремонт'
    when 'tutoring' then 'Обучение'
    when 'business-services' then 'Бизнес-услуги'
    when 'documents-relocation' then 'Документы и переезд'
    when 'legal-services' then 'Юридические услуги'
    when 'health-psychology' then 'Здоровье и психология'
    when 'psychology' then 'Психология'
    when 'home-services' then 'Домашние услуги'
    when 'family-services' then 'Семейные услуги'
    when 'auto-services' then 'Автоуслуги'
    when 'photo-video' then 'Фото и видео'
    else coalesce(slug, '')
  end
$$;

create or replace function public.growth_subcategory_label_ru(slug text)
returns text
language sql
immutable
as $$
  select case slug
    when 'manicure' then 'Маникюр'
    when 'electrician' then 'Электрик'
    when 'german_tutor' then 'Репетитор немецкого'
    when 'accountant' then 'Бухгалтер'
    when 'renovation' then 'Ремонт квартиры'
    when 'documents_help' then 'Помощь с документами'
    when 'lawyer' then 'Юрист'
    when 'massage' then 'Массаж'
    when 'brows_lashes' then 'Брови и ресницы'
    when 'cosmetologist' then 'Косметолог'
    when 'plumber' then 'Сантехник'
    when 'psychologist' then 'Психолог'
    when 'photographer' then 'Фотограф'
    when 'translator' then 'Переводчик'
    when 'cleaning' then 'Уборка'
    when 'babysitter' then 'Няня'
    when 'car_repair' then 'Автомеханик'
    when 'repair' then 'Ремонт'
    else coalesce(slug, '')
  end
$$;

create or replace view public.growth_category_opportunities_operator_view as
select
  co.id,

  co.country as "Страна",
  co.region as "Регион",
  co.city as "Город",

  public.growth_category_label_ru(co.category_slug) as "Категория",
  public.growth_subcategory_label_ru(co.subcategory_candidate) as "Подкатегория",

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
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug)),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' спрос выше предложения. Это потенциальная зона для лидогенерации.'
      )
    when co.supply_count > co.demand_count then
      concat(
        'В сегменте ',
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug)),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' предложение выше спроса. Нужно усиливать привлечение заявок.'
      )
    when co.supply_count > 0 and co.demand_count > 0 then
      concat(
        'В сегменте ',
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug)),
        ' / ',
        coalesce(co.city, co.region, co.country, 'Germany'),
        ' есть и спрос, и предложение. Можно тестировать контент и заявки.'
      )
    else
      concat(
        'По сегменту ',
        coalesce(public.growth_subcategory_label_ru(co.subcategory_candidate), public.growth_category_label_ru(co.category_slug)),
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
