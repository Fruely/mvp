# Freuly Partner Program — Technical Audit and Implementation Plan

**Document type:** architecture audit + recommended implementation plan  
**Repo HEAD at audit:** `8abd433` (`main`, post PWA install promotion)  
**Phase 1 status (2026-07-18):** foundation implemented in code — see `docs/PARTNER_PROGRAM_PHASE_1.md`.  
Manual migration file added; apply on staging before using admin APIs against a live DB.

**Phase 2 status (2026-07-18):** onboarding + mini dashboard + public apply implemented in code — see `docs/PARTNER_PROGRAM_PHASE_2.md`.  
Stage A DB smoke **blocked** (no safe local/staging apply in agent env). Phase 2 SQL not applied. No production DB changes.

### Phase 1 completion checklist

| Item | Status |
|------|--------|
| DB model + RLS migration (manual SQL) | Done (apply separately) |
| `/r/[code]` + signed cookie first-touch | Done |
| Register attribution bind | Done |
| Commission ledger + admin-confirm | Done |
| Minimal admin APIs + `/admin/partners` | Done |
| Unit tests (codes/cookie/path/commission rules) | Done |
| Partner dashboard / public `/partners` / push / auto payouts | Phase 2 (dashboard+public); push/payouts still deferred |

### Phase 2 completion checklist

| Item | Status |
|------|--------|
| Applications / invitations / notifications SQL | Done (apply separately) |
| Auth bind + claim flow | Done (code) |
| Partner dashboard API + UI | Done (code) |
| Public `/partners` + apply | Done (code) |
| In-app accrual notifications | Done (code) |
| Monthly aggregation helper | Done (code; no auto send) |
| Stage A DB smoke | **Blocked** |
| Stripe / push / auto payouts | Deferred |

---

## 1. Executive Summary

Freuly is a **Next.js 14 App Router** marketplace on **Supabase Postgres + Auth**, deployed on **Vercel**, with specialists as the primary authenticated actors and a **token-based admin** panel. There is **no existing referral/affiliate/partner commission stack**. Homepage “partners” (`homepage_social_insight*`) are content backlinks, not a payout program.

**Partner Program can be added as an isolated module** that reuses:

- Supabase Auth for partner login (same auth users as specialists; **separate `partners` table**, not a second auth system);
- specialist registration at `POST /api/specialists/register` for hard attribution bind;
- admin shell at `/admin/*` + `ADMIN_API_TOKEN` for ops;
- Resend email + Telegram notify patterns for MVP alerts;
- Upstash rate limiting for `/r/[code]` and applications;
- i18n via `locales/{ua,ru,de}.json` and `app/[lang]/…`;
- planned Stripe webhook layer (`docs/stripe-implementation-roadmap.md`) as the **only** source of financially significant commission events.

**Critical dependency:** real card payments are **not live**. Checkout uses `StubPaymentProvider` (`lib/billing/paymentProvider.ts`); `PAYMENTS_ENABLED` defaults off (`lib/billing/featureFlags.ts`); webhook route and `billing_*` tables are **planned but not implemented**. Therefore:

- Phase 1–3 (schema, click capture, registration attribution) can proceed independently;
- **idempotent commission creation** must be designed now, but **production commission payouts for “first successful payment” require either** (a) Stripe webhook go-live per roadmap, **or** (b) an interim admin-confirmed “first paid activation” path that still writes a server-side ledger with unique keys.

**Recommended approach:** additive tables + server-side first-touch attribution cookie → bind at specialist register → commission on verified first paid invoice (Stripe) with unique constraints; partner dashboard under Supabase Auth; admin Partners section under existing admin token; email/Telegram in MVP; **no Web Push / no SW changes** in MVP.

**Project readiness for Phase 1 (DB model + migrations design/apply in staging):** **Yes**, after product answers in §20. Readiness for **end-to-end paid commissions in production:** **No**, until Stripe webhook path exists or an explicit interim admin payment-confirmation policy is approved.

---

## 2. Current Architecture Relevant to Partner Program

| Area | Finding | Evidence |
|------|---------|----------|
| Framework | Next.js App Router **14.2.x** (declared `^14.0.0`), React 18 | `package.json`, lockfile |
| Frontend/backend | Single Next app: `app/` routes + `app/api/**` Route Handlers; shared `lib/`, `components/` | `app/`, `lib/`, `components/` |
| Database | Supabase Postgres | `@supabase/supabase-js`, `lib/supabase/*` |
| Migrations | **Manual SQL** under `supabase/manual_migrations/` (+ root `supabase-*.sql`); no `supabase/migrations` CLI tree | `supabase/manual_migrations/` |
| ORM | None — Supabase JS client | `lib/supabase/server.ts`, `lib/supabase/auth-server.ts`, `lib/supabaseClient.ts` |
| Deploy | Vercel | `vercel.json`, `DEPLOYMENT.md`, `.vercel/` |
| Auth | Supabase Auth for specialists; admin = shared `ADMIN_API_TOKEN` cookie/header; client cookie stub incomplete | `app/login/page.tsx`, `lib/adminApiAuth.ts`, `app/client/(protected)/layout.tsx` |
| Billing canon | Product subscription state in **`specialist_plan`**; payments gated by flags | `docs/payment-architecture.md`, `lib/specialists/subscription.ts`, `app/api/admin/specialists/[id]/subscription/route.ts` |
| Payments runtime | Stub only; no Stripe SDK | `lib/billing/paymentProvider.ts`, `app/api/billing/checkout/route.ts` |
| Notifications | Telegram ops (`lib/notifications/notify.ts`); email via Resend (`lib/email.ts`); **no in-app notification store**; **no Web Push** | cited files |
| PWA | Serwist SW `app/sw.ts`, install UX `components/pwa/InstallFreuly.tsx`, `/app`, `/app/install` | do not couple partner MVP to SW |
| Analytics | GA4 + Consent Mode only; no Meta Pixel / PostHog | `components/consent/ConsentScripts.tsx` |
| Logging | `console.*` + Telegram `SYSTEM_ERROR`; no Sentry | various API routes |

**Env var names (no values):**  
Auth/Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`, `ADMIN_API_TOKEN`, `DEV_ACCESS_KEY`.  
Billing (planned/current flags): `PAYMENTS_ENABLED`, `SUBSCRIPTION_ENFORCEMENT_ENABLED`, `SUBSCRIPTION_PUBLIC_PAID_COPY_ENABLED`, `MANUAL_INVOICES_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`.  
Email/Telegram: `RESEND_API_KEY`, `MAIL_FROM`, `RESEND_FROM_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_IDS`, `TELEGRAM_WEBHOOK_SECRET`.  
Rate limit / cron / analytics / URLs: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_SITE_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`.

---

## 3. Existing Components That Can Be Reused

| Capability | Reuse target | Path / artifact |
|------------|--------------|-----------------|
| Specialist Auth session | Partner login after invite/approve | `lib/supabase/auth-server.ts`, `app/login/page.tsx`, `app/auth/callback/route.ts` |
| Protected layout pattern | Partner dashboard guard | `app/[lang]/specialist/(protected)/layout.tsx` + `lib/specialists/server.ts` (mirror, do not overload) |
| Specialist create (attribution bind) | Hard-bind referral on new specialist | `app/api/specialists/register/route.ts`, `components/SpecialistQuickRegisterForm.tsx` |
| Rate limiting | `/r/[code]`, partner apply, dashboard APIs | `lib/rate-limit/shared.ts` |
| Admin shell + nav | `/admin/partners` | `app/admin/(protected)/layout.tsx` |
| Admin API auth | Partner admin APIs | `lib/adminApiAuth.ts` (`x-admin-token`) |
| Admin list/filter/action UX | Partners queue UI patterns | `app/admin/(protected)/specialists/page.tsx`, `…/leads/page.tsx` |
| Narrow audit table UI | Commission / admin action log UI | `app/admin/(protected)/specialists/audit/page.tsx` |
| Email | Partner invite, accrual notice, monthly report | `lib/email.ts` |
| Telegram owner alerts | Ops: new partner application, disputed commission | `lib/notifications/notify.ts`, `lib/telegram/sendMessage.ts` |
| Manual subscription update | Interim “first paid” confirmation (if product allows) | `app/api/admin/specialists/[id]/subscription/route.ts` |
| Feature flags pattern | Partner module kill-switch | `lib/billing/featureFlags.ts`, `lib/featureFlags.ts` |
| i18n | `/partners`, partner dashboard copy | `lib/i18n.ts`, `locales/{ua,ru,de}.json` |
| Cookie + UTM helpers | Referral cookie + campaign params | `lib/pwa/installLogic.ts` (`preserveUtmParams` pattern — **marketing only**; financial attribution must be DB) |
| Closed-mode / middleware whitelist | Allow `/r/*`, `/partners`, `/partner/*` | `middleware.ts` |
| Planned Stripe webhook + billing tables | Commission trigger + idempotency | `docs/stripe-implementation-roadmap.md` (`billing_events.provider_event_id`) |
| Lead soft attribution pattern | Inspiration only (not financial) | `app/api/leads/create/route.ts`, `leads.source` / `source_path` / `referrer` |
| Telemetry write-via-service-role | Partner click events | `search_events` / `profile_view_events` + RLS revoke pattern in `20260707_fix_security_advisor_rls_and_views.sql` |
| PWA shell (optional later) | Deep-link partner dashboard into `/app` | `app/app/page.tsx` — **not required for MVP** |

**Do not reuse / overload:**

- Admin shared token as partner identity.
- `homepage_social_insights` / `partner_name` for commissions.
- GA4 / install analytics as payout source (`lib/pwa/installAnalytics.ts`, `ConsentScripts.tsx`).
- Client success URL `?checkout=success` as commission proof (`lib/billing/createCheckoutSession.ts` success URL pattern; roadmap forbids trusting it).

---

## 4. Gaps and Risks

| Severity | Gap / risk | Why it matters |
|----------|------------|----------------|
| **Critical** | Stripe checkout/webhook not implemented (`StubPaymentProvider`) | Cannot create production commissions from real card payments yet |
| **Critical** | No financial attribution / commission ledger | Greenfield; must be designed for idempotency from day one |
| **High** | No multi-role RBAC table; roles are implicit | Partner must be a **new table**, not a string on `specialists` |
| **High** | Admin = single shared token; weak multi-operator accountability | Payout marking needs an **admin action log** with actor identity (even if actor = token operator id / email field) |
| **High** | Manual `specialist_plan` changes can look like “first payment” | Risk of false commissions if admin grants `active` without payment — needs product rule |
| **High** | Self-referral / duplicate specialist accounts | Same person can register new emails; need fraud rules |
| **Medium** | No in-app notification inbox | MVP should use email (+ optional Telegram); in-app feed is new UI |
| **Medium** | No Web Push; SW is NetworkOnly + no push handlers | Push must be deferred to avoid PWA regression |
| **Medium** | `specialist_moderation_log` appears read-mostly from app | Need dedicated `partner_admin_actions` (or general audit) for partner ops |
| **Medium** | Client login path incomplete (`/client/login` missing) | Irrelevant to partner specialists; ignore for this module |
| **Medium** | Cookie consent is localStorage (`freuly_cookie_consent_v1`) | Referral cookie needs Datenschutz alignment (first-party, purpose, TTL) |
| **Low** | Schema drift: production may have SQL not in git | Confirm remote schema before applying partner migrations |
| **Low** | Name collision: two `createSupabaseServerClient` helpers | Partner code must import the correct module (`auth-server` vs `server`) |

---

## 5. Recommended Partner Data Model

Additive tables (names indicative; finalize in migration):

### Core

1. **`partners`**
   - `id` uuid PK  
   - `user_id` uuid null unique → `auth.users` (set when account created/claimed)  
   - `display_name`, `contact_email`, `status` (`applied` \| `approved` \| `rejected` \| `disabled`)  
   - `default_commission_cents` int (default **2900** = 29.00 EUR; **per-partner override**)  
   - `currency` text default `EUR`  
   - `payout_notes` text (manual bank details / internal notes — minimize PII in UI)  
   - `approved_at`, `disabled_at`, `created_at`, `updated_at`

2. **`partner_referral_codes`**
   - `id`, `partner_id`  
   - `code` text unique (e.g. `anna-germany`)  
   - `is_active` bool  
   - `created_at`

3. **`partner_applications`** (optional separate from `partners`, or start as `partners.status=applied`)
   - Application fields, source channel, FAQ consent, timestamps

### Attribution & traffic

4. **`partner_referral_clicks`**
   - `id`, `partner_id`, `referral_code_id`  
   - `campaign` text null  
   - UTM fields: `utm_source/medium/campaign/content/term`  
   - `visitor_key` text (opaque hashed cookie id — **not raw IP as primary key**)  
   - `landed_path`, `redirect_path`  
   - `created_at`  
   - Optional: `ip_hash` (HMAC with server secret) if fraud needs it — **not plaintext IP**

5. **`partner_attributions`** (first-touch financial bind)
   - `id`  
   - `partner_id`, `referral_code_id`  
   - `auth_user_id` uuid unique (one attribution per new user)  
   - `specialist_id` uuid unique null → set when specialist row exists  
   - `campaign`, UTMs snapshot  
   - `attributed_at`  
   - `source` (`cookie_register` \| `admin_manual`)  
   - **Immutable** after insert (no overwrite)

### Money

6. **`partner_commissions`**
   - `id`  
   - `partner_id`, `attribution_id`, `specialist_id`  
   - `amount_cents`, `currency` (snapshot of rate at earn time)  
   - `status`: `pending` \| `approved` \| `rejected` \| `paid` \| `reversed`  
   - `provider` (`stripe` \| `manual_admin`)  
   - `provider_payment_id` text (Stripe `invoice.id` or admin reference)  
   - `provider_event_id` text null  
   - `earned_at`, `approved_at`, `paid_at`, `rejected_at`, `reversed_at`  
   - `reject_reason`, `notes`  
   - **Uniques:**  
     - `unique(specialist_id)` where commission is not `reversed`/`rejected` **or** simpler: `unique(specialist_id)` for any earned commission row + use `reversed` as status on same row  
     - `unique(provider, provider_payment_id)` for idempotency

7. **`partner_payouts`** (monthly/manual bank transfer batches)
   - `id`, `partner_id`, `period_start`, `period_end`  
   - `amount_cents`, `currency`, `status` (`draft` \| `marked_paid`)  
   - `paid_at`, `admin_note`, `created_at`

8. **`partner_admin_actions`**
   - `id`, `actor` text (operator label), `action`, `entity_type`, `entity_id`, `payload` jsonb, `created_at`

9. **`partner_monthly_reports`** (generated snapshots)
   - period metrics + PDF/CSV storage path or generated-on-download

**Default rate:** system default 2900 cents, stored on partner row and **copied onto commission** at creation time so later rate changes do not rewrite history.

---

## 6. Recommended Referral Attribution Flow

```
Visitor → GET /r/[code]?campaign=…&utm_*…
  → validate partner+code active
  → insert partner_referral_clicks (service role)
  → Set-Cookie freuly_partner_ref (HttpOnly, Secure, SameSite=Lax, Max-Age=90d)
     payload: { code, partner_id, campaign, first_touch_at, visitor_key }
  → 302 to allowlisted path only (default: /{lang}/become-specialist)
```

**Hard bind (financial):** inside `POST /api/specialists/register` **after** successful `auth.admin.createUser` + `specialists` insert (`app/api/specialists/register/route.ts` lines ~114–170):

1. Read referral cookie (server).  
2. If user/email already existed → **no attribution** (already blocked for specialist email; also check `auth.users`).  
3. Insert `partner_attributions` once (`auth_user_id` unique).  
4. Do **not** overwrite if already attributed.  
5. Clear or mark cookie as consumed (optional).

**First-touch 90 days:** if cookie older than 90d or missing → no bind.  
**Existing users:** login/claim paths (`app/api/specialist/claim-init/route.ts`) must **not** create partner attributions for already-existing specialists.

**Open redirect protection:** allowlist only Freuly-internal paths (`/{ua|ru|de}/become-specialist`, optionally `/`, `/app`, pricing). Reject absolute external URLs.

**Possible problems with the proposed model:**

| Issue | Mitigation |
|-------|------------|
| Cookie blocked / ITP | Still record click server-side; conversion may drop — acceptable; never rely on GA |
| Specialist registers on another device | Attribution lost — document; optional email-captured ref later (out of MVP) |
| User browses then registers after 90d | No commission — intentional |
| Claim/magic-link for admin-seeded specialists | Exclude from partner program unless product says otherwise |
| Multiple codes before register | First-touch wins; ignore later codes |
| Partner shares link that lands on category pages | Allowed if redirect allowlist expanded carefully |

---

## 7. Recommended Payment and Commission Flow

### Current payment reality

- Checkout API: `app/api/billing/checkout/route.ts` → `createCheckoutSessionForSpecialist` → **`StubPaymentProvider`** always `provider_not_configured` even if `STRIPE_SECRET_KEY` set (`lib/billing/paymentProvider.ts`).
- Product status: admin PATCH `specialist_plan` via `app/api/admin/specialists/[id]/subscription/route.ts`.
- Target architecture: `docs/payment-architecture.md`, `docs/stripe-implementation-roadmap.md` — webhook updates `specialist_plan`; planned `billing_events` unique on `provider_event_id`.

### Commission trigger (authoritative)

**Primary (target):** Stripe webhook `invoice.payment_succeeded` for the **first paid subscription invoice** for that `specialist_id` (e.g. `billing_reason` in `subscription_create` / amount_paid > 0), after:

1. Verify Stripe signature (`STRIPE_WEBHOOK_SECRET`).  
2. Idempotently store event in `billing_events` (per roadmap).  
3. Resolve `specialist_id` via billing customer mapping.  
4. Load `partner_attributions` by `specialist_id`.  
5. If none → stop.  
6. Insert `partner_commissions` with `unique(provider, provider_payment_id)` and `unique(specialist_id)` (one lifetime earning).  
7. Amount = partner’s `default_commission_cents` (or future campaign override) **snapshotted**.  
8. Status start: `pending` (or `approved` after auto-rules — product choice).

**Do not create commission from:**

- browser `?checkout=success`;  
- registration or publish;  
- GA/Meta events;  
- `customer.subscription.created` alone (may be unpaid/trial).

**Renewals:** ignore for partner commission.  
**Refunds/chargebacks:** set commission `reversed` (or create reversal adjustment) on `charge.refunded` / `invoice.payment_failed` after paid — product policy.  
**Manual invoices:** if admin marks first paid plan without Stripe, only create commission when admin action explicitly sets `provider=manual_admin` + unique `provider_payment_id` (e.g. `manual:{specialist_id}:{invoice_ref}`) — **gated by product decision**.

### Idempotency keys

- Stripe: `invoice.id` (preferred) + `event.id` processed ledger.  
- Specialist: at most one non-reversed commission.  
- Partner payout batch: unique `(partner_id, period_start, period_end)`.

---

## 8. Recommended Authentication and Role Model

**Do not create a second auth system.**  
**Do not put `partner` into `specialists.status`.**  
**Do not give partners `ADMIN_API_TOKEN`.**

| Actor | Identity | Guard |
|-------|----------|-------|
| Specialist | Supabase user + `specialists.user_id` | `app/[lang]/specialist/(protected)/layout.tsx` |
| Admin | Shared admin cookie/token | `app/admin/(protected)/layout.tsx`, `lib/adminApiAuth.ts` |
| Partner | Supabase user + `partners.user_id` | New `app/[lang]/partner/(protected)/layout.tsx` (mirror specialist) |

**Multi-role:** same `auth.users` row **may** be both specialist and partner (two FKs). Unique index on `specialists.user_id` remains; `partners.user_id` separate unique.

**Partner account creation (safe):**

1. Public application → `partners.status=applied` (no Auth user yet) **or** create Auth user only after approval.  
2. Admin approves → set rate + code → invite via Resend magic link / password setup (reuse claim patterns from `app/api/specialist/claim-init/route.ts` carefully, or password invite).  
3. On first login, ensure `partners.user_id` matches session.

**Self-referral rule:** if attributing specialist’s `user_id` equals partner’s `user_id`, or emails match, **reject attribution/commission**.

---

## 9. Recommended Partner Dashboard Architecture

**Route:** `/{lang}/partner/dashboard` (preferred over bare `/partner/dashboard` for i18n consistency with specialists). Alias redirect `/partner/dashboard` → default lang if desired.

**Stack:** Server Components + small client islands (copy button), same Tailwind patterns as specialist dashboard.

**MVP widgets (mobile-first):**

- Referral link `https://{site}/r/{code}` + copy  
- Counts: clicks / registrations (attributions) / first payments (commissions earned)  
- Balances: pending / approved / paid (from `partner_commissions` aggregation)  
- Commission history table with **anonymized** `ref` = short hash of `specialist_id` (never name/email/phone)  
- Notification strip: latest email-equivalent messages (or simple “last accrual” row)  
- Monthly report download (CSV first; PDF later)

**APIs:** partner-scoped Route Handlers using session user → `partners` row; **service role only inside server after authz check**; never expose other partners’ rows.

**PWA:** optional later link from `/app`; **do not** change SW for MVP.

---

## 10. Recommended Admin Architecture

**Route:** `/admin/partners` (+ nested: applications, partner detail, commissions, payouts).

**Nav:** add link in `app/admin/(protected)/layout.tsx` after Specialists.

**Capabilities:**

| Feature | Notes |
|---------|-------|
| Applications queue | Approve / reject + reason |
| Create/edit partner | Rate cents, codes, status |
| Enable/disable partner + codes | Soft disable; keep financial history |
| Stats | Aggregates from clicks/attributions/commissions |
| Commissions | Filter by status; approve/reject/reverse; reason required for reject/reverse |
| Mark bank payout | Creates/updates `partner_payouts`; marks commissions `paid` |
| Dispute tool | Link attribution ↔ specialist id (admin-only PII view) |
| Action log | `partner_admin_actions` |

**Reuse:** table/filter/action patterns from `app/admin/(protected)/specialists/page.tsx` and leads page; audit list pattern from `specialists/audit`.

**Permissions:** same admin token initially; log `actor` from a future admin identity field or free-text operator name stored at login (product open question).

---

## 11. Notifications and PWA Integration

| Channel | MVP? | How |
|---------|------|-----|
| Email (Resend) | **Yes** | Accrual “Новое начисление: +X €”, approval, monthly report |
| Telegram (owners) | **Yes** | New application, high-risk disputes (`lib/notifications/notify.ts` new event types) |
| In-app partner feed | Optional MVP-lite | Simple list from `partner_commissions` / messages table |
| Web Push / PWA push | **Defer** | No VAPID, no push handlers in `app/sw.ts`; changing SW risks install rollout |
| InstallFreuly | Unrelated | Do not mix with partner CTA |

**Safe MVP message UX:** email + dashboard balance card. Copy localized in `locales/*`.

---

## 12. Privacy, Security and Fraud Controls

| Control | Recommendation |
|---------|----------------|
| RLS | Enable RLS on all partner tables; **no anon policies** for money; partners select **own** rows via `auth.uid() = partners.user_id`; admin via service role only |
| Server authz | Every partner API: session → partner row → scope queries |
| Cross-partner isolation | Never return other partners’ data; specialist PII only in admin |
| PII minimization | Partner UI: anonymized specialist refs only |
| IP storage | Prefer **HMAC ip_hash** + optional short retention; avoid plaintext IP unless legal basis documented |
| Cookie consent | Document partner referral cookie in Datenschutz; first-party, 90d, purpose = attribution |
| Bot abuse on `/r/[code]` | Upstash rate limit by IP + code; fail-open aware (`lib/rate-limit/shared.ts`) |
| Duplicate accounts | Heuristics later (same phone/payment method); MVP: email uniqueness + self-referral block |
| Self-referral | Block same `user_id` / email |
| Forged client events | Clicks recorded server-side on `/r/[code]` only; commissions **never** from client |
| Webhook verification | Stripe signature required |
| Idempotency | Unique payment + specialist constraints |
| Audit | `partner_admin_actions` for all money status changes |
| Partner disable | Soft disable codes; retain commissions/payouts history |
| Open redirect | Strict allowlist |

---

## 13. Proposed Routes and APIs

### Public

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/partners` or `/{lang}/partners` | Marketing + application form |
| GET | `/r/[code]` | Click + cookie + redirect |
| POST | `/api/partners/apply` | Application submit (rate limited) |

### Partner (auth)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/{lang}/partner/dashboard` | UI |
| GET | `/api/partner/me` | Profile + code + balances |
| GET | `/api/partner/stats` | Aggregates |
| GET | `/api/partner/commissions` | History (anonymized) |
| GET | `/api/partner/reports/[yyyy-mm]` | CSV download |

### Admin

| Method | Route | Purpose |
|--------|-------|---------|
| UI | `/admin/partners`, `/admin/partners/[id]` | Ops |
| GET/PATCH | `/api/admin/partners`… | CRUD / approve / disable |
| GET/PATCH | `/api/admin/partner-commissions`… | Status transitions |
| POST | `/api/admin/partner-payouts` | Mark paid |

### Billing integration (when Stripe lands)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/billing/webhook` | Planned — extend handler to call `createPartnerCommissionIfEligible` |

**Middleware:** whitelist `/partners`, `/r`, `/partner`, `/api/partners`, `/api/partner` in `middleware.ts` closed-mode list.

---

## 14. Proposed Database Tables and Relationships

```
auth.users 1──0..1 partners
partners 1──* partner_referral_codes
partners 1──* partner_referral_clicks
partners 1──* partner_attributions
partners 1──* partner_commissions
partners 1──* partner_payouts
partners 1──* partner_monthly_reports

partner_referral_codes 1──* partner_referral_clicks
partner_referral_codes 1──* partner_attributions

auth.users 1──0..1 partner_attributions (unique)
specialists 1──0..1 partner_attributions (unique when set)
specialists 1──0..1 partner_commissions (lifetime)

partner_attributions 1──0..1 partner_commissions
partner_payouts 1──* partner_commissions (optional FK when paid)
```

Relationships to existing:

- `specialists.id` / `specialists.user_id` — attribution target (`uq_specialists_user_id` migration `2026-03-11_unique_specialist_user_id.sql`).  
- Future `billing_customers.specialist_id` — resolve Stripe → specialist for webhook.  
- `specialist_plan` — product status; **not** commission source of truth.

---

## 15. Proposed RLS / Authorization Policies

| Table | anon | authenticated partner | service role |
|-------|------|----------------------|--------------|
| `partners` | none | SELECT/UPDATE own row (`user_id = auth.uid()`) | all |
| `partner_referral_codes` | none | SELECT own partner’s codes | all |
| `partner_referral_clicks` | none | SELECT aggregates/own (or deny detail; prefer RPC) | insert on `/r` |
| `partner_attributions` | none | SELECT count only (no specialist PII columns exposed) | all |
| `partner_commissions` | none | SELECT own (masked specialist) | all |
| `partner_payouts` | none | SELECT own | all |
| `partner_admin_actions` | none | none | all |
| `partner_applications` | none | none | all |

**Principle:** public `/r/[code]` uses **service role in Route Handler** after validation (same pattern as telemetry writers). Partners never get service role. Admin APIs use service role + `assertAdminApiAuth`.

---

## 16. MVP Scope

1. Manual SQL migrations for partner tables + RLS.  
2. `/r/[code]` capture + cookie + allowlisted redirect + click logging.  
3. Attribution bind in `POST /api/specialists/register`.  
4. Commission creation function with idempotency (callable from Stripe webhook **and** optional admin “confirm first payment”).  
5. `/admin/partners` basic queue + rates + codes + commission statuses + payout mark + action log.  
6. Partner Auth + `/{lang}/partner/dashboard` (link, stats, history, balances).  
7. Email on commission pending/approved.  
8. Public `/{lang}/partners` page + apply API.  
9. GA **marketing** events only (optional): `partner_landing_view`, `partner_apply_submit` — **not** for money.  
10. Feature flag e.g. `PARTNER_PROGRAM_ENABLED`.

---

## 17. Deferred Scope

- Web Push / SW push handlers  
- Stripe Connect / automatic payouts  
- Multi-tier commissions, recurring partner %  
- Advanced fraud (device fingerprinting, payment-method clustering)  
- PDF branded reports (CSV first)  
- Partner Telegram bot  
- Public leaderboard  
- Meta Pixel / PostHog  
- Automatic tax invoicing for partners  
- Overloading `/app` shell with partner mode  
- Changing specialist publish/search/lead algorithms

---

## 18. Implementation Phases

Recommended order (validated against this architecture):

| # | Phase | Depends on |
|---|-------|------------|
| 1 | Database model + manual migrations + RLS | Product defaults for rate/statuses |
| 2 | Server-side referral capture `/r/[code]` + cookie | Phase 1 |
| 3 | Registration attribution in `specialists/register` | Phase 2 |
| 4 | Commission creator + idempotency; wire to Stripe webhook **when available**; interim admin confirm path if approved | Phase 3 + billing readiness |
| 5 | Admin partner management UI/API | Phase 1 |
| 6 | Partner authentication + dashboard | Phase 1–3 |
| 7 | Internal/email notifications | Phase 4–6 |
| 8 | Monthly reports (CSV) + payout marking | Phase 4–5 |
| 9 | Public `/partners` page + apply form | Phase 5 |
| 10 | Push notifications | Stable PWA + separate decision |
| 11 | Analytics enhancements + fraud | After MVP traffic |

**Note:** Phases 5–6 can partially parallelize with 2–3. Phase 4’s Stripe path is blocked on `docs/stripe-implementation-roadmap.md` execution; do not fake commissions from client success pages.

---

## 19. Test Strategy

| Layer | What to test |
|-------|----------------|
| Unit | Cookie parse/TTL; first-touch rules; parseAudience-like helpers; commission eligibility; allowlist redirect; rate snapshotting |
| Integration (API) | `/r/[code]` sets cookie; inactive code 404; open redirect rejected; register binds once; second register no overwrite; self-referral blocked |
| Commission idempotency | Same `invoice.id` twice → one row; renewal invoice → zero new commission |
| Authz | Partner A cannot read Partner B; unauthenticated dashboard 401/redirect |
| Admin | Approve/reject; disable code stops new cookies; payout marks paid; action log written |
| Privacy | Partner API responses contain no specialist email/name/phone |
| E2E (later Playwright if added) | Apply → admin approve → open `/r/code` → register → mock webhook → dashboard shows pending |
| Regression | Existing specialist register/publish/login/admin/PWA install unaffected |

**No production data mutations** in tests; use staging Supabase + Stripe test mode.

---

## 20. Open Questions Requiring Product Decisions

1. Does **admin-granted** `specialist_plan.active` (without Stripe) create a commission?  
2. Are **claim/magic-link** specialists eligible for partner attribution?  
3. Commission start status: auto-`approved` vs mandatory manual `pending` review?  
4. Holding period before payout (e.g. 14/30 days for refunds)?  
5. Exact legal text for referral cookie in Datenschutz / partner T&Cs.  
6. Public page language default and whether `/partners` is lang-prefixed.  
7. Who operates admin payouts (single shared token acceptable?).  
8. Minimum payout threshold.  
9. Can one partner have multiple codes/campaigns with different rates?  
10. Currency always EUR?  
11. Should partner dashboard exist only after Stripe go-live, or earlier with zero commissions?  
12. Interaction with `early_access` free period — commission only after first **paid** invoice?

---

## 21. Estimated Complexity for Each Phase

| Phase | Complexity | Effort (eng days, rough) | Notes |
|-------|------------|--------------------------|-------|
| 1. DB model + migrations | Medium | 2–3 | RLS + indexes critical |
| 2. Referral capture | Medium | 2–3 | Cookie, allowlist, rate limit |
| 3. Registration attribution | Low–Medium | 1–2 | Touch `register` carefully |
| 4. Payment webhook + commissions | **High** | 3–5 (+ Stripe project) | Blocked on Stripe; idempotency hard requirement |
| 5. Admin partners | Medium | 3–4 | Mirror specialists admin UX |
| 6. Partner auth + dashboard | Medium | 3–4 | New layout; no second auth |
| 7. Email/Telegram notifications | Low | 1–2 | Resend templates |
| 8. Monthly reports + payouts | Medium | 2–3 | CSV + admin mark paid |
| 9. Public `/partners` page | Low–Medium | 2–3 | i18n + form |
| 10. Push | High | 3–5 | Separate from PWA install; defer |
| 11. Analytics/fraud | Medium | 2–4 | After real volume |

---

## Recommended Implementation Order (confirmed)

1. Database model and migrations.  
2. Server-side referral capture.  
3. Registration attribution.  
4. Payment webhook and idempotent commission creation (**coordinate with Stripe implementation**).  
5. Admin partner management.  
6. Partner authentication and dashboard.  
7. Internal/email notifications.  
8. Monthly reports.  
9. Public `/partners` page.  
10. Push notifications (deferred).  
11. Analytics and fraud enhancements.

This order matches the real dependency graph: **attribution before money**, **admin before public scale**, **Stripe/webhook before trustworthy commissions**, **push last** to protect PWA.

---

## Quality Checklist (this audit)

- [x] Real payment flow studied (`StubPaymentProvider`, checkout route, payment-architecture + stripe roadmap).  
- [x] Exact registration flow traced (`become-specialist` → `SpecialistQuickRegisterForm` → `POST /api/specialists/register`).  
- [x] Plan does **not** create a second auth system.  
- [x] Financial accruals do **not** depend on client-side analytics.  
- [x] Idempotency prescribed (`provider_payment_id`, specialist uniqueness, billing_events).  
- [x] Existing production flows unchanged by this stage (docs only).  
- [x] No code/migrations/routes/UI beyond this Markdown file.

---

## Appendix A — Key file index

| Topic | Paths |
|-------|-------|
| Register | `app/api/specialists/register/route.ts`, `components/SpecialistQuickRegisterForm.tsx`, `app/[lang]/become-specialist/page.tsx` |
| Publish | `app/api/specialist/dashboard/publish/route.ts` |
| Billing stub | `app/api/billing/checkout/route.ts`, `lib/billing/createCheckoutSession.ts`, `lib/billing/paymentProvider.ts`, `lib/billing/featureFlags.ts` |
| Admin subscription | `app/api/admin/specialists/[id]/subscription/route.ts` |
| Admin UI | `app/admin/(protected)/layout.tsx`, `…/specialists/page.tsx` |
| Auth helpers | `lib/supabase/auth-server.ts`, `lib/supabase/server.ts`, `lib/specialists/server.ts` |
| Middleware | `middleware.ts` |
| Notify / email | `lib/notifications/notify.ts`, `lib/email.ts` |
| PWA | `app/sw.ts`, `components/pwa/ServiceWorkerRegister.tsx`, `components/pwa/InstallFreuly.tsx` |
| Analytics | `components/consent/ConsentScripts.tsx`, `lib/pwa/installAnalytics.ts` |
| Docs | `docs/payment-architecture.md`, `docs/stripe-implementation-roadmap.md`, `docs/admin-subscription-operations.md` |
