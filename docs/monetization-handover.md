# Monetization Handover

Документ для передачи контекста по **монетизационному слою** Freuly: что уже сделано, где лежит код, чего нет, и как безопасно продолжать. Актуальность — на момент последнего обновления файла; при расхождениях с репозиторием приоритет у фактического кода.

---

## 1. Current status

Монетизация реализована как **pre-payment контур**: продуктовая и UX-подготовка без приёма платежей и без автоматического коммерческого enforcement.

- **Тарифная витрина** — публичная страница `/[lang]/pricing` (информационная).
- **Подписка в кабинете** — страница `subscription`: статус и план из канонического источника, тексты про отсутствие оплаты на платформе.
- **Billing** — страница `billing`: заглушка, оплата недоступна, счета не выставляются.
- **Feature flags** — `lib/billing/featureFlags.ts` + переменные в `.env.example` (по умолчанию всё выключено).
- **Админка** — ручное управление строкой `specialist_plan` у специалиста (PATCH + отображение в списке).
- **Display-state / notices** — helper для панелей и баннеров в кабинете (подписка, лиды) без включения оплаты.
- **Платежи** — не подключены (нет Stripe/PayPal, checkout, billing API, webhook’ов).
- **Публичная видимость** — не зависит от факта оплаты; не включён отдельный продуктовый «enforcement по подписке» для каталога.
- **Лиды** — узкое правило: контакты в списке заявок скрываются при **`plan_status = expired`** (`isContactsLocked`); остальное не расширялось под автоматический enforcement.

---

## 2. Key commits

Ниже — **опорные коммиты** по истории монетизационного слоя (для `git show <hash>` / blame). Порядок не строго хронологический; при необходимости уточните цепочку через `git log --oneline --grep=…` или по затронутым путям.

| Хеш | Сообщение (кратко) |
|-----|---------------------|
| `13df0e0` | feat: add admin subscription management |
| `f37a37f` | feat: add public pricing page |
| `57ad2a7` | refactor: centralize specialist plan status source |
| `b087f6a` | docs: annotate subscription grace period field |
| `dc7e5f5` | feat: improve specialist subscription page |
| `ac54df6` | feat: add subscription display state notices |
| `e66c61c` | docs: add subscription enforcement policy |
| `c888974` | docs: add manual invoice payment flow |
| `583c42d` | feat: add billing disabled page |
| `a385d54` | chore: tighten pre-payment billing copy |

---

## 3. Main files

### Public

- `app/[lang]/pricing/page.tsx`
- `lib/seo/siteMetadata.ts`
- `app/sitemap.ts`
- `components/Header.tsx`

### Dashboard

- `app/[lang]/specialist/(protected)/dashboard/subscription/page.tsx`
- `app/[lang]/specialist/(protected)/dashboard/billing/page.tsx`
- `app/[lang]/specialist/(protected)/dashboard/page.tsx`
- `app/[lang]/specialist/(protected)/dashboard/leads/page.tsx`
- `components/dashboard/Sidebar.tsx`

### Subscription logic

- `lib/specialists/subscription.ts`
- `lib/specialists/subscriptionDisplay.ts`
- `lib/dashboard/isContactsLocked.ts`

### Admin

- `app/admin/(protected)/specialists/page.tsx`
- `app/api/admin/specialists/[id]/subscription/route.ts`
- `app/api/admin/specialists/pending/route.ts`
- `app/api/admin/stats/route.ts`

### Config

- `lib/billing/featureFlags.ts`
- `.env.example`

### Docs

- `docs/payment-architecture.md`
- `docs/subscription-enforcement-policy.md`
- `docs/monetization-handover.md` (этот файл)

### Locales

- `locales/ru.json`
- `locales/ua.json`
- `locales/de.json`

---

## 4. Data model

**Канонический источник подписки** — таблица **`specialist_plan`** (одна строка на специалиста, upsert по `specialist_id`).

Ориентировочный набор полей:

- `specialist_id`
- `plan_code`
- `plan_status`
- `started_at`
- `expires_at`
- `grace_until`
- `created_at`
- `updated_at`

**Статусы**, с которыми уже работают админка и UI (allowlist в админском API и отображение):

- `early_access`
- `trialing`
- `active`
- `grace`
- `grace_period`
- `expired`
- `cancelled`

**Legacy:** поля вроде `specialists.subscription_status` / `specialists.plan_name` не должны становиться новым источником правды; продуктовое состояние подписки читается из **`specialist_plan`** (с fallback в коде, если строки нет).

---

## 5. Feature flags

В `.env.example` (и по смыслу в окружении):

| Переменная | Значение по умолчанию |
|------------|------------------------|
| `PAYMENTS_ENABLED` | `false` |
| `SUBSCRIPTION_ENFORCEMENT_ENABLED` | `false` |
| `SUBSCRIPTION_PUBLIC_PAID_COPY_ENABLED` | `false` |
| `MANUAL_INVOICES_ENABLED` | `false` |

**Сейчас:** флаги **подготовлены** в коде и документации; активирующая бизнес-логика оплаты/enforcement/paid-copy/manual-invoice **не включена** массово (чтение флагов строго `=== "true"`). Публичная «платная» копирайт-модель отдельным флагом **не раскручена**. Детали целевой архитектуры — в `docs/payment-architecture.md`.

---

## 6. Current user flows

### Специалист

- В кабинете видит обзор тарифа/статуса (в т.ч. с главной дашборда, если предусмотрено UI).
- Открывает **Подписку** — план и статус из `specialist_plan` / helper, уведомления без оплаты.
- Открывает **Оплату (billing)** — только информационная заглушка: оплата недоступна, счета не выставляются.
- **Оплатить** на платформе нельзя.

### Админ

- В списке специалистов видит колонку подписки (план, статус, даты; fallback, если строки в БД нет).
- Может **вручную** обновить `specialist_plan` (plan_code, plan_status, expires_at, grace_until) через защищённый API.
- Это **не** включает платежи и **не** меняет публичную видимость профиля через отдельную автоматику (поля `is_visible` / `is_active` / `status` специалиста этим потоком не трогаются).

### Публичный посетитель

- Видит **pricing** — ориентиры по тарифам; Basic (например 29 €/мес) как **будущий** тариф с отключённым CTA оплаты; платежи не принимаются.

---

## 7. What is deliberately NOT active

- Stripe / PayPal и прочие провайдеры
- Checkout и клиентский платёжный journey
- Webhook’и оплаты
- `/api/billing/*`
- Реальные счета (Rechnung) и приём оплаты по ним
- Публичные банковские реквизиты и инструкции по переводу
- Автоматические переходы плана по cron/событиям провайдера
- Автоматическое скрытие из каталога **только** из-за подключения биллинга
- Автоматическая блокировка лидов сверх уже согласованного правила **`expired` → скрытие контактов**
- Удаление профилей как стандартная мера при окончании подписки

---

## 8. Known risks / open decisions

- **Публичный API** детальной карточки специалиста может отдавать **`plan_code` / `plan_status`** — продуктово решить, оставлять ли это поле публичным (отдельная задача; в этом handover не менялось).
- **Админ выставил `expired`** — контакты в лидах скрываются (`isContactsLocked`); операционный риск ошибки админа.
- **`cancelled` vs `expired`:** финальное поведение (в т.ч. до конца периода при отмене) должно быть зафиксировано до enforcement и оплаты; см. `docs/subscription-enforcement-policy.md`.
- **Feature flags** подготовлены, но не все сценарии UI «под флаг» уже реализованы — при `true` в проде проверять, что ожидание команды совпадает с кодом.
- **Локали:** при изменениях в `locales/*.json` в dev возможна «нестабильность» копирайта между языками; в продакшене правки делать осознанно и с вычиткой RU/UA/DE.

---

## 9. Recommended next steps

1. Принять продуктовое решение: **оставлять ли `plan_status` / `plan_code` в ответе `GET /api/specialists/[id]`**.
2. Оформить **короткий гайд для админов**: что делает ручное изменение плана, последствия `expired`.
3. Собрать **чеклист платного запуска для Германии** (юридический, налоговый, поддержка) — опереться на `docs/payment-architecture.md`.
4. Зафиксировать **roadmap внедрения Stripe** (флаги, checkout, webhook, маппинг → `specialist_plan`) по шагам из payment-architecture.
5. **Таблицы биллинга** (customer, события, счета) — только после юридической/банковской готовности, не «впереди» продукта.
6. **Stripe test mode** — за `PAYMENTS_ENABLED` и изолированным окружением, без одновременного включения enforcement.
7. **Запрос счёта / manual invoice** — за `MANUAL_INVOICES_ENABLED` и отдельным процессом, как в payment-architecture.
8. **Enforcement и уведомления** — отдельное решение и флаг `SUBSCRIPTION_ENFORCEMENT_ENABLED`, не смешивать с первым днём приёма платежей.

---

## 10. Safety rules for future work

- Не включать **реальные платежи** без юридической и налоговой готовности.
- Не включать **enforcement** одновременно с «первым» запуском оплаты без отдельного теста и коммуникации.
- **Не удалять профили автоматически** из-за подписки.
- **Не хранить** идентификаторы провайдера в «случайных» полях `specialists`; централизовать в billing-слое (когда появится).
- **Не делать Stripe прямым источником** публичной видимости в каталоге — нормализовать в `specialist_plan` и политику.
- Любые действия «оплатить / оформить» в UI — только под **`PAYMENTS_ENABLED`** (и согласованной конфигурацией).
- Сохранять **ручной админский override** `specialist_plan` и ясный процесс поддержки.

---

*Конец handover. При добавлении оплаты или enforcement обновляйте этот файл или ссылки на него в PR.*
