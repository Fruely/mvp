# Stripe Implementation Roadmap

## 1. Purpose

Этот документ — **технический план** будущей интеграции **Stripe** (или согласованного с ним потока) в Freuly. Он **не** описывает текущую реализацию: на момент написания реальные платежи, checkout и платёжные webhooks **не подключены**.

Цель — дать пошаговую опору команде, чтобы позже включать оплату **контролируемо**, с флагами и без смешивания биллинга с публичной выдачей.

Согласованная продуктово-юридическая база — в `docs/payment-architecture.md`, `docs/paid-launch-checklist-germany.md`, `docs/subscription-enforcement-policy.md`.

---

## 2. Preconditions

Перед началом **реализации в коде** должны быть закрыты или явно в работе:

- **Gewerbe** / правовая готовность ведения коммерческой деятельности в DE/EU.
- **Бизнес-счёт** или чётко описанная бизнес-учётность для платежей Freuly.
- Решение по **налогам**: Kleinunternehmerregelung vs USt / VAT и отражение на счетах.
- Актуальные **Terms / Impressum / Datenschutz** под платные тарифы и подписку.
- Пройден или согласован **`docs/paid-launch-checklist-germany.md`**.
- **`PAYMENTS_ENABLED`** в проде остаётся **`false`** до финального тестирования и осознанного go-live.

---

## 3. Architectural principles

- **Stripe не является** прямым источником **публичной видимости** специалиста в каталоге.
- События Stripe обрабатываются в **billing-слое** и нормализуются в обновления **`specialist_plan`** (и при необходимости в таблицах биллинга).
- **`specialist_plan`** остаётся **продуктовым каноном** статуса подписки для кабинета, notices и согласованного enforcement.
- **`SUBSCRIPTION_ENFORCEMENT_ENABLED`** включается **отдельно** и обычно **позже** стабилизации оплаты.
- Любые действия «оплатить / оформить / портал» — только при **`PAYMENTS_ENABLED=true`** и авторизованном специалисте.
- **Ручной админский override** `specialist_plan` сохраняется; конфликты Stripe vs админ решаются продуктово.
- **Не** использовать удаление профиля как стандартную меру при отмене подписки.

---

## 4. Planned environment variables

Планируемые переменные (имена ориентировочные, финализировать при внедрении):

| Переменная | Назначение |
|------------|------------|
| `STRIPE_SECRET_KEY` | Секретный ключ API (server-only). |
| `STRIPE_WEBHOOK_SECRET` | Секрет для проверки подписи webhook. |
| `STRIPE_PRICE_BASIC_MONTHLY` | Price ID базового месячного тарифа в Stripe. |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Price ID премиум-тарифа, если понадобится позже. |
| `STRIPE_CUSTOMER_PORTAL_RETURN_URL` | При необходимости явный return URL для Customer Portal. |
| `NEXT_PUBLIC_SITE_URL` (или уже принятый в проекте base URL) | Success/cancel URLs, ссылки в письмах и т.д. |

Правила:

- **Live-ключи** не использовать в разработке и тестах; **test** и **live** строго разделить.
- Секреты **не коммитить**; хранить в секрет-хранилище окружения (Vercel, Supabase secrets и т.д.).
- **`/.env.example`** можно обновить позже **только placeholder-ами** и комментариями, без реальных значений.

---

## 5. Proposed database migrations

Миграции выполнять **только когда** начинается реальная интеграция Stripe и согласована схема с бэкендом.

Ниже — **предлагаемый минимум** (черновик; перед `migrate` сверить с юристом/данными и нагрузкой).

### `billing_customers`

| Поле | Тип / заметки |
|------|----------------|
| `id` | `uuid`, PK |
| `specialist_id` | `uuid`, FK → `specialists(id)` |
| `provider` | `text`, default `'stripe'` |
| `provider_customer_id` | `text` (Stripe Customer id) |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |
| Уникальность | `unique(provider, provider_customer_id)`; `unique(specialist_id, provider)` |

### `billing_subscriptions`

| Поле | Тип / заметки |
|------|----------------|
| `id` | `uuid`, PK |
| `specialist_id` | `uuid` |
| `provider` | `text`, default `'stripe'` |
| `provider_subscription_id` | `text` |
| `provider_customer_id` | `text` |
| `plan_code` | `text` (продуктовый код: basic/premium/…) |
| `provider_status` | `text` (сырой/нормализованный статус Stripe) |
| `current_period_start` | `timestamptz` |
| `current_period_end` | `timestamptz` |
| `cancel_at_period_end` | `boolean` |
| `cancelled_at` | `timestamptz` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |
| Уникальность | `unique(provider, provider_subscription_id)` |

### `billing_events`

| Поле | Тип / заметки |
|------|----------------|
| `id` | `uuid`, PK |
| `provider` | `text` |
| `provider_event_id` | `text` |
| `event_type` | `text` |
| `payload` | `jsonb` (осторожно с PII; можно хранить урезанный снимок) |
| `processed_at` | `timestamptz` |
| `created_at` | `timestamptz` |
| `processing_error` | `text`, nullable |
| Уникальность | `unique(provider, provider_event_id)` для идемпотентности |

**Важно:** не смешивать **Stripe IDs** в произвольных полях таблицы **`specialists`**; централизовать в billing-таблицах.

---

## 6. Checkout flow

Будущий поток (high-level):

1. Специалист открывает **`/[lang]/specialist/dashboard/billing`**.
2. Если **`PAYMENTS_ENABLED=false`** — остаётся **disabled** / информационный режим (как сейчас по смыслу).
3. Если **`true`** — UI показывает действие вроде «Подключить базовый тариф» (копирайт согласовать).
4. Клиент вызывает **`POST /api/billing/checkout`** (или эквивалент).
5. API проверяет **сессию** / залогиненного специалиста.
6. API находит или создаёт **Stripe Customer**, связь сохраняет в `billing_customers`.
7. API создаёт **Checkout Session** на выбранный **Price** (например basic monthly).
8. `success_url` — возврат на что-то вроде `/[lang]/specialist/dashboard/subscription?checkout=success` (уточнить единый паттерн).
9. `cancel_url` — возврат на **billing**.
10. После успешной оплаты **`checkout.session.completed`** (и связанные события) обрабатываются **webhook** → обновление **`specialist_plan`** по согласованному маппингу.

Клиентский «успех» в URL **не** считается единственным доказательством оплаты.

---

## 7. Billing portal flow

- Эндпоинт **`POST /api/billing/portal`** (рабочее имя).
- Доступен только **залогиненному** специалисту с существующим **Stripe Customer** в `billing_customers`.
- Используется для **смены карты**, **отмены в конце периода**, управления подпиской — по возможностям Stripe Customer Portal.
- Обязательно за **`PAYMENTS_ENABLED`**.
- Return URL — **subscription** и/или **billing** в кабинете.

---

## 8. Webhook flow

- Маршрут **`POST /api/billing/webhook`** (только Stripe, проверка подписи).
- **Обязательна** проверка **`Stripe-Signature`** с `STRIPE_WEBHOOK_SECRET`.
- **Идемпотентность:** запись/проверка `provider_event_id` в **`billing_events`**; повтор события не должен дублировать побочные эффекты.
- Не доверять только редиректу «success» в браузере.
- Webhook — основной канал для перевода оплаты в **`plan_status`** вроде **`active`** / обновления дат.
- Ошибки обработки — **лог** + `processing_error`; алерты для команды.

---

## 9. Stripe events to handle

| Событие | Что сохранять | Обновлять `specialist_plan`? | Целевой `plan_status` (черновик) |
|---------|---------------|--------------------------------|-----------------------------------|
| `checkout.session.completed` | session id, customer, subscription id (если есть), amount/currency при необходимости | Да | `active` или `trialing` по режиму |
| `customer.subscription.created` | subscription id, статус, период | Да | `trialing` / `active` |
| `customer.subscription.updated` | статус, период, cancel_at_period_end | Да | `active`, `grace_period`, `cancelled` и т.д. по маппингу |
| `customer.subscription.deleted` | дата окончания | Да | `expired` или `cancelled` по политике |
| `invoice.payment_succeeded` | invoice id, period | Да (продление `expires_at`) | `active` |
| `invoice.payment_failed` | invoice id | Да | `grace_period` или будущий `past_due` |

Детали полей — в момент реализации, в соответствии с выбранной моделью (subscription vs one-time).

---

## 10. Status mapping draft

Черновик (требует **продуктового sign-off** до включения enforcement):

- Успешная оплата / активная подписка → **`active`**.
- Пробный период у Stripe → **`trialing`**.
- `past_due` / `invoice.payment_failed` → **`grace_period`** или отдельный статус в будущем; **`grace_until`** по политике.
- Отмена **в конце периода** → **`cancelled`**, доступ может сохраняться до **`expires_at` / `current_period_end`** (как в Stripe).
- Удаление подписки после периода → **`expired`** или **`cancelled`** — по `docs/subscription-enforcement-policy.md` и продукту.

**Финальная карта** должна быть утверждена **до** массового включения webhook в prod и **до** **`SUBSCRIPTION_ENFORCEMENT_ENABLED`**.

---

## 11. Feature flag behavior

- **`PAYMENTS_ENABLED=false`:** нет checkout, нет portal, нет платёжных CTA; billing — информационно / disabled.
- **`PAYMENTS_ENABLED=true`:** доступны checkout и portal (при прочих проверках).
- **`SUBSCRIPTION_PUBLIC_PAID_COPY_ENABLED=true`:** публичный **pricing** и связанные тексты могут перейти от «планируется позже» к **активной** платной коммуникации — только после юридической проверки.
- **`SUBSCRIPTION_ENFORCEMENT_ENABLED=true`:** автоматические последствия для видимости/лидов — **только позже**, после запуска оплаты и уведомлений (если иначе не решено).
- **`MANUAL_INVOICES_ENABLED=true`:** поток **запроса счёта** / ручной Rechnung — **отдельно** от Stripe, см. `docs/payment-architecture.md`.

---

## 12. UI changes needed later

- **Billing page:** от заглушки к активным опциям при **`PAYMENTS_ENABLED`**.
- **Subscription page:** кнопки «Управлять оплатой» / «Подключить базовый тариф» за флагом.
- **Pricing page:** переключение на paid-copy при **`SUBSCRIPTION_PUBLIC_PAID_COPY_ENABLED`** и готовности текстов.
- **Dashboard notices:** сценарии «оплата доступна», «ошибка оплаты», просрочка — без ложных обещаний.
- **Админка:** опционально отображение Stripe customer/subscription id и последних событий (без утечки секретов).
- Состояния **ошибок** и **поддержки** (retry, mailto).

---

## 13. API routes to implement later

| Маршрут | Auth | Флаг | Ожидание | Ответ / безопасность |
|---------|------|------|----------|----------------------|
| `POST /api/billing/checkout` | Залогиненный специалист | `PAYMENTS_ENABLED` | Тело: `plan` / `price_key` (серверно маппится на Stripe Price) | JSON с `url` редиректа на Stripe; секреты только на сервере |
| `POST /api/billing/portal` | Залогиненный специалист + есть customer | `PAYMENTS_ENABLED` | Минимальное тело или пусто | JSON с `url` портала; TTL сессии по документации Stripe |
| `POST /api/billing/webhook` | Подпись Stripe | Не привязан к user session | Сырое тело + заголовок подписи | `200` быстро при успехе; идемпотентность; не раскрывать внутренности при ошибке |

---

## 14. Testing plan

- Режим **Stripe Test**; отдельный **тестовый** специалист.
- Успешная оплата тестовой картой.
- Неуспешная оплата / `decline`.
- **SEPA** (если включат) — отдельные тесты и сроки.
- Отмена подписки, смена карты через portal.
- **Replay** webhook и **дубликат** `event.id`.
- Имитация **недоступности** Stripe / таймауты — деградация без порчи каталога.
- Поведение при **`PAYMENTS_ENABLED=false`** — отсутствие утечки URL checkout.
- Контроль: **публичная видимость** и лиды не меняются неожиданно, пока enforcement выключен.

---

## 15. Rollback plan

- Выставить **`PAYMENTS_ENABLED=false`** (и при необходимости отключить live keys на стороне Stripe Dashboard).
- Кабинет **подписки** остаётся читаемым; **`specialist_plan`** не удалять из-за отката.
- Записи **`billing_*`** не удалять без правового/учётного решения — минимум «заморозить» новые списания.
- При необходимости — **ручная корректировка** `specialist_plan` в админке по `docs/admin-subscription-operations.md`.
- Коммуникация со специалистами при инциденте.
- Webhook endpoint оставить **безопасным** (подпись, идемпотентность), даже если UI выключен.

---

## 16. Security checklist

- Проверка **подписи** webhook.
- **Никаких** секретов Stripe в клиентском бундле; при необходимости только **publishable** key для Elements — отдельное решение.
- Не отдавать **лишние** provider id в публичных API без необходимости.
- **Идемпотентность** обработки событий.
- **Аудит** админских изменений подписки (желательно до live).
- **Rate limiting** на checkout/portal при риске злоупотреблений.
- **Логи** без PAN/CVC и без избыточной PII.
- **GDPR / privacy** — обновить при появлении новых потоков данных.

---

## 17. Implementation order

1. Добавить **согласованные** миграции `billing_*`.
2. Подключить **Stripe SDK** только на сервере; конфиг из env.
3. Сервис **billing customer** (find/create, связь с `specialist_id`).
4. **`POST /api/billing/checkout`** за **`PAYMENTS_ENABLED`**.
5. **`POST /api/billing/webhook`** с подписью и записью в **`billing_events`**.
6. **Маппинг событий → `specialist_plan`** + тесты.
7. **`POST /api/billing/portal`**.
8. Обновить **billing** UI за флагом.
9. Обновить **subscription** CTA за флагом.
10. Полный прогон в **Stripe test mode**.
11. **Админка:** видимость биллинга (опционально).
12. Подготовить **live keys** и мониторинг.
13. **Ограниченный** live rollout.
14. Позже — **`SUBSCRIPTION_ENFORCEMENT_ENABLED`** по отдельному плану.

---

## 18. Explicit non-goals for first Stripe phase

- Автоматическое **удаление** профилей.
- Автоматическое **скрытие** из каталога только фактом подключения Stripe.
- **Premium**-алгоритмы поднятия в выдаче «в первой фазе».
- Сложные **купоны** / промо — только если явно нужно.
- **Marketplace payouts** и **split payments** между несколькими получателями.
- **Multi-vendor** разделение платежа.
- Полная **автоматизация manual invoice** в той же первой фазе, что и Stripe — вынести отдельным этапом.

---

*Связанные документы: `docs/payment-architecture.md`, `docs/monetization-handover.md`, `docs/paid-launch-checklist-germany.md`, `docs/admin-subscription-operations.md`.*
