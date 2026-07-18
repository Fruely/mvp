# Partner Program — Phase 1

Implemented foundation for Freuly Partner Program (no partner dashboard, no public `/partners` landing, no push, no auto payouts).

### Stage A note (2026-07-18)

**DB smoke blocked** in the development environment used for Phase 2: no local Docker/Supabase CLI; `.env.local` targets a production-like project and must not receive migrations. Phase 1 SQL file remains apply-on-staging. See `docs/PARTNER_PROGRAM_PHASE_2.md` Stage A blocker. Phase 2 code landed without applying SQL.

## 1. What was implemented

- Manual SQL migration for partner tables + RLS deny-by-default
- Signed first-party referral cookie (`freuly_partner_ref`, 90 days)
- Referral route `GET /r/[code]`
- Hard-bind attribution on `POST /api/specialists/register` (best-effort)
- Commission ledger with interim `admin_confirmed_first_payment`
- Admin APIs + minimal `/admin/partners` UI
- Unit tests for codes, target paths, cookie, commission rules
- Stripe commission helper stubbed for future webhook (`stripe_invoice_payment_succeeded`)

## 2. Tables

Migration: `supabase/manual_migrations/2026-07-18_partner_program_phase1.sql`

- `partners`
- `partner_links`
- `partner_clicks`
- `partner_attributions`
- `partner_commissions`
- `partner_payouts` (foundation)
- `partner_audit_log`

**Email not unique** on `partners`: one operator may run multiple partner entities; uniqueness is on referral/link codes.

**Default link model:** creating a partner also creates a `partner_links` row with the same `referral_code` and target `/ua/become-specialist`.

## 3. Referral flow

1. `GET /r/{code}` (whitelisted in `middleware.ts`, no i18n rewrite)
2. Resolve active `partner_links` + `partners.status = active`
3. Invalid/disabled → redirect to `/{lang}` without leaking reason
4. Best-effort click insert (no raw IP; hashed visitor seed)
5. Set signed cookie only if no valid first-touch cookie exists
6. Internal redirect to sanitized `target_path`

## 4. Registration attribution

In `app/api/specialists/register/route.ts` after specialist insert:

- Read `freuly_partner_ref`
- Verify signature + partner/link
- Block self-referral when `partners.user_id` equals new user id
- Insert `partner_attributions` (unique on `user_id` / `specialist_id`)
- Failures are logged; registration still succeeds

Cookie is left until expiry (supports multi-tab UX); first-touch uniqueness is enforced in DB.

## 5. Admin-confirm flow

`POST /api/admin/partners/confirm-first-payment`

Body:

```json
{
  "specialistId": "uuid",
  "externalPaymentReference": "bank-or-manual-ref-unique",
  "paidAt": "optional ISO"
}
```

- Requires `x-admin-token`
- **Does not** read `specialist_plan`
- Rejects client-supplied amounts
- Creates commission `status=approved`, amount snapshotted from partner rate
- Idempotent on same `(source_type, source_event_id)`
- Second reference for same specialist → `commission_already_exists`

**Disabled partner rule:** existing attributions can still earn commissions unless partner is `rejected`.

## 6. Idempotency guarantees

| Key | Enforcement |
|-----|-------------|
| `(source_type, source_event_id)` | UNIQUE index |
| `specialist_id` on commissions | UNIQUE index (one earning row; reverse via status) |
| `user_id` / `specialist_id` attributions | UNIQUE indexes |
| Admin confirm retry | Returns existing commission `created: false` |

## 7. Interim payment confirmation limits

- Not proof of Stripe payment
- Operator must have verified payment out-of-band
- Plan grants via `/api/admin/specialists/[id]/subscription` **never** create commissions
- Replace with Stripe webhook when live

## 8. Future Stripe webhook hook

Call `createCommissionFromStripeInvoice` from planned `POST /api/billing/webhook` on first paid `invoice.payment_succeeded`, using `invoice.id` as `source_event_id`. Same ledger; no schema change required.

## 9. Environment variables

| Name | Purpose |
|------|---------|
| `ADMIN_API_TOKEN` | Admin API auth (existing) |
| `PARTNER_REF_SECRET` | HMAC for referral cookie (recommended) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes (existing) |
| Upstash vars | Rate limit `/r/[code]` (fail-open) |

## 10. Local testing

```bash
# Apply migration on local/staging Supabase (not production casually)
# Then:
export PARTNER_REF_SECRET=dev-secret
export ADMIN_API_TOKEN=...

node --experimental-strip-types --test lib/partners/*.test.mjs lib/partners/*.logic.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

API smoke (staging):

```bash
# Create partner
curl -X POST localhost:3000/api/admin/partners \
  -H "x-admin-token: $ADMIN_API_TOKEN" -H "content-type: application/json" \
  -d '{"name":"Anna","email":"anna@example.com","referral_code":"anna-germany","status":"active"}'

# Open /r/anna-germany → cookie + redirect
# Register specialist with cookie
# Confirm payment
curl -X POST localhost:3000/api/admin/partners/confirm-first-payment \
  -H "x-admin-token: $ADMIN_API_TOKEN" -H "content-type: application/json" \
  -d '{"specialistId":"...","externalPaymentReference":"manual-pay-1"}'
```

## 11. Migration command

Project uses **manual SQL** (no CLI migrate). Apply via Supabase SQL editor / `psql` against the target project:

`supabase/manual_migrations/2026-07-18_partner_program_phase1.sql`

## 12. Known risks

- Shared `ADMIN_API_TOKEN` is not identity-based (document for Phase 2+)
- Without `PARTNER_REF_SECRET`, cookie signing falls back to derived admin token
- Attribution depends on cookie survival (ITP / cross-device loss)
- Migration not auto-applied; staging must run SQL before APIs work
- Self-referral only when `partners.user_id` is set

## 13. Deferred scope

Partner dashboard, `/partners` landing, push, Stripe Connect, auto payouts, recurring %, fraud scoring, partner-facing specialist PII.
