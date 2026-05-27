# Market Radar Pipeline Runbook

## 1. Что это

Market Radar Pipeline — рабочий контур Freuly для обработки рыночных сигналов.

Цепочка:

data/market-signals-input.json
→ process-market-signals.mjs --write
→ market_signals
→ scout_prospects
→ content_tasks
→ recalculate-category-opportunities.mjs
→ category_opportunities
→ sync-baserow-growth-all.mjs
→ Baserow CRM

Главная команда:

node scripts/run-market-radar-pipeline.mjs

## 2. Куда добавлять сигналы

Рабочий локальный файл:

data/market-signals-input.json

Этот файл не коммитится в Git.

Пример сигнала:

{
  "source_platform": "telegram",
  "source_type": "group_post",
  "source_url": "",
  "source_text": "Ищу мастера маникюра в Бонне, желательно на русском или украинском.",
  "country": "Germany",
  "region": "NRW"
}

## 3. Типы сигналов

supply — специалист предлагает услугу.

Пример:

Электрик в Кёльне. Помогаю с розетками, светом, подключением техники.

demand — человек ищет услугу.

Пример:

Ищу русскоязычного электрика в Дюссельдорфе.

## 4. Проверка без записи

node scripts/process-market-signals.mjs

Это dry run. Он ничего не пишет в Supabase.

## 5. Запись новых сигналов

node scripts/process-market-signals.mjs --write

Скрипт:

1. классифицирует сигналы
2. создаёт signal_hash
3. пропускает дубли
4. пишет новые market_signals
5. для supply создаёт scout_prospects
6. для demand/supply создаёт content_tasks

Если сигнал уже был обработан, нормальный вывод:

Duplicate market signals skipped: N
Inserted market signals: 0
Inserted scout prospects: 0
Inserted content tasks: 0

## 6. Пересчёт Category Opportunities

node scripts/recalculate-category-opportunities.mjs

Скрипт пересчитывает:

supply_count
demand_count
unique_source_count
market_density
supply_demand_balance
opportunity_score
recommended_action
ai_summary

## 7. Синхронизация Baserow

node scripts/sync-baserow-growth-all.mjs

Синхронизирует:

Content Tasks
Category Opportunities
Scout Prospects
Market Signals

## 8. Полный запуск

node scripts/run-market-radar-pipeline.mjs

Это основная команда полного цикла.

## 9. Где смотреть результат

Baserow база:

Freuly CRM

Основные таблицы:

Content Tasks — готовые темы и черновики
Category Opportunities — перспективные категории
Scout Prospects — потенциальные специалисты
Market Signals — сырые рыночные сигналы

## 10. Что не коммитить

Не коммитить:

.env.local
data/market-signals-input.json
токены
API-ключи
реальные рабочие выгрузки

Коммитить можно:

data/market-signals-input.example.json
scripts/*.mjs
docs/*.md
supabase/manual_migrations/*.sql

## 11. Принцип агрегации

Важно: Market Radar не должен гасить реальные рыночные сигналы.

Правило:

market_signals — накапливаем все разные реальные сигналы.

category_opportunities — считает массу рынка:
- сколько supply-сигналов
- сколько demand-сигналов
- какие каналы дают сигналы
- где спрос выше предложения
- где предложение выше спроса

content_tasks — не плодим одинаковые задачи, а агрегируем по рыночному сегменту.

Сегмент content task:

content_goal + channel + country + region + city + category_slug + subcategory_candidate

Если новый сигнал попадает в уже существующий сегмент:
- новая content_task не создаётся
- существующая задача усиливается
- priority повышается
- source_insight дополняется новым сигналом

scout_prospects — защищены от дублей через duplicate_key.

Итоговая логика:

много сигналов = ценность для аналитики
много одинаковых задач = мусор для оператора

---

## 12. Текущий статус MVP

Реализовано:

- input-файл сигналов
- dry run классификация
- запись market_signals
- signal_hash и защита от дублей
- scout_prospects из supply
- content_tasks из demand/supply
- пересчёт category_opportunities
- sync в Baserow
- общий pipeline runner

## 13. Следующие улучшения

1. расширить словарь городов
2. расширить словарь категорий
3. добавить dedupe для scout_prospects
4. добавить dedupe для content_tasks
5. добавить AI-классификацию
6. добавить crawler adapters
