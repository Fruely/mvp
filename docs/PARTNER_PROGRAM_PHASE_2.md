# Partner Program — Phase 2

Partner onboarding, mini dashboard, public apply page, and in-app accrual notifications.

## Stage A blocker (honest)

**Phase 1 database smoke was not run in this environment.**

| Check | Result |
|-------|--------|
| Local Docker / Supabase CLI | Not available |
| Safe staging DB URL | Not configured for agent use |
| `.env.local` | Points at a production-like Supabase project — **not used** for migrations or smoke |
| Phase 1 SQL applied here | **No** |
| Phase 2 SQL applied here | **No** |
| Production DB mutated | **No** |
| Production secrets loaded into logs | **No** |

Phase 2 delivers **code + unit tests + manual SQL file** only. Apply migrations on staging before live API use.

## 1. What was implemented

- Manual SQL: `partner_applications`, `partner_invitations`, `partner_notifications`
- Supabase Auth bind via hashed one-time invitations
- Partner session helpers (`requirePartnerSession` / `requirePartnerApiSession`)
- Dashboard API (session-scoped, no client `partnerId`)
- Public `/{lang}/partners` + apply API (rate limited)
- Claim UI `/{lang}/partner/claim`
- Mini dashboard `/{lang}/partner/dashboard`
- Admin: applications approve/reject, invite token (raw once)
- Commission → in-app notification (idempotent by `commission_id`)
- Monthly period report helper (Europe/Berlin bounds → UTC)
- Locales `partner.*` (ua / ru / de)
- Unit tests for pure logic

**Not in Phase 2:** Stripe webhook, web push / SW changes, auto payouts, email-per-accrual, PDF reports.

## 2. Migration

File: `supabase/manual_migrations/2026-07-18_partner_program_phase2.sql`

Requires Phase 1 tables. RLS: enable + revoke anon/authenticated + grant service_role (same pattern as Phase 1). APIs authorize then use service role.

## 3. Onboarding architecture

```text
Public apply → partner_applications (pending)
Admin approve → creates partners (+ default link) → optional invitation
Admin invite → partner_invitations.token_hash (raw token shown once)
Partner opens /{lang}/partner/claim?token=…
Signs in / signs up (existing Supabase Auth)
POST /api/partner/claim → bind partners.user_id, mark invite used
Redirect → /{lang}/partner/dashboard
```

## 4. Invitation rules

- Random token, SHA-256 hash at rest
- TTL default 7 days, one-time `used_at`
- Soft email match vs session user (same generic `invite_invalid` on all failures — no enumeration)
- One auth user ↔ one partner (`partners.user_id` unique from Phase 1)

## 5. Access model

| Partner status | Access |
|----------------|--------|
| `active` | full |
| `paused` | read-only dashboard |
| `disabled` | history-only (balances/history) |
| `pending` / `rejected` | dashboard denied |

Specialist + partner multi-role: same `auth.users` may hold both profiles; guards are separate.

## 6. Dashboard data

`GET /api/partner/dashboard?period=month|all`

- Aggregates in **integer cents** server-side
- Month bounds: Europe/Berlin calendar month → UTC `[start, end)`
- Commission list uses public ref `FR-P-XXXX` (no specialist UUID / PII)
- Omits payment references and specialist contact fields

## 7. Notifications

On **new** commission create (admin-confirm or future Stripe helper), `createCommissionNotification`:

- Unique on `commission_id` (idempotent replay safe)
- Skips (logs) if `partners.user_id` is null
- No web push / SW changes

## 8. Public page & apply

- `/{lang}/partners` + `/partners` → `/ua/partners` (cookie lang)
- `POST /api/partners/apply` rate limited (IP + email hash)
- Validates HTTPS/HTTP channel URLs; no auto-approval; no referral code until approve

## 9. Admin workflow

1. Review pending applications in `/admin/partners`
2. Approve (+ optional invite token) or reject with internal reason
3. Invite unbound partners via **Invite**
4. Confirm first payments as in Phase 1

## 10. Environment variables

Same as Phase 1 (`ADMIN_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `PARTNER_REF_SECRET`, Upstash). No new required secrets for Phase 2.

## 11. Testing (this iteration)

```bash
node --experimental-strip-types --test lib/partners/*.test.mjs lib/partners/*.logic.test.mjs
npx tsc --noEmit
```

DB-backed E2E remains blocked until staging migration + smoke.

## 12. Deferred (Phase 3+)

- Stripe webhook commissions
- Email accrual / monthly report send
- Manual payout marking UX polish
- Web push
- Fraud scoring

## 13. Known limitations

- Stage A DB smoke incomplete (see blocker)
- Invite delivery is admin copy-paste (no Resend template yet)
- Login `/login` still specialist-oriented; claim page has its own sign-in/up
- Notification locale defaults to RU copy server-side unless extended later
