# Partner flow (production-ready acquisition)

## Public acquisition

1. Header → `/{lang}/partners`
2. CTA **Become a partner** → `/{lang}/partners/onboarding`
3. If not authenticated / no partner row → apply form (`#apply`)
4. Admin reviews `partner_applications` → creates `partners` + invite

## Invite acquisition

1. Admin creates invite → one-time token
2. URL: `/{lang}/partners/invite/{token}` (legacy: `/{lang}/partner/claim?token=…`)
3. Auth (same Freuly account) → bind `partners.user_id`
4. Continue shared onboarding

## Shared onboarding

```
auth / claim
  → agreement (Partnerprogramm-Bedingungen v1.0 + accepted_at)
  → payout onboarding (Stripe Connect boundary)
  → partner dashboard
```

Agreement source: `content/partners/agreementContent.ts` (DE authoritative).  
Versioning: `content/partners/agreementMeta.ts`. Internal legal note: `docs/partners/AGREEMENT_LEGAL_NOTE.md`.

Logical steps (mapped to existing `partners` fields):

| Logical step | Condition |
|---|---|
| invited | partner exists, `user_id` null |
| agreement_pending | user bound, `contract_signed_at` null |
| payout_onboarding_pending | agreement accepted; Connect not ready |
| active | `status=active` + agreement accepted |
| suspended | `status=paused` |
| closed | `status=disabled` / `rejected` |

## Referral attribution

- Link format unchanged: `/r/{code}`
- Cookie first-touch attribution unchanged
- Referral link is available after agreement acceptance
- Missing Stripe payout onboarding does **not** block attribution
- Commissions may accrue as pending while live payouts are disabled

## Commission rules (Agreement v1.0)

- Reward = first **monthly** paid subscription: `gross − applicable VAT − actual provider fee`
- Created as `pending` with `earned_at = first successful payment timestamp`
- Eligible for `approved` only after **14 calendar days** (`earned_at + 14`), via `approveCommissionIfEligible` / cron `/api/cron/partner-commissions-approve`
- `partners.commission_amount_cents` is **not** the reward source (legacy/admin hint only)
- **Annual** billing interval is rejected (`annual_plan_not_eligible`) — no full-year commission
- One commission per specialist (DB unique); renewals do not create another
- Refund/cancel/dispute/reverse before approval → `reversed` (admin `/api/admin/partners/commissions/reverse`)

## Stripe Connect boundary

- Freuly stores only Connect identifiers / status mirrors
- Freuly does **not** store IBAN, bank details, or KYC documents
- Adapter: `lib/partners/stripeConnect.ts`
- Flag: `PARTNER_PAYOUTS_ENABLED=false` by default

## Payout-disabled mode

When `PARTNER_PAYOUTS_ENABLED` is not `true`:

- registration / invite / agreement / referral / dashboard / attribution work
- commissions can remain pending
- payout UI shows a clear non-error status
- no live payout execution

## Requires account activation later

External blockers only:

- production Stripe Connect activation
- production webhook secrets
- Freuly platform bank account
- `PARTNER_PAYOUTS_ENABLED=true`
- legal/tax review of Partnerprogramm-Bedingungen v1.0 before scale-up / live payouts (see `AGREEMENT_LEGAL_NOTE.md`)

## Manual DB

Apply when ready:

- `supabase/manual_migrations/2026-07-18_partner_program_phase1.sql`
- `supabase/manual_migrations/2026-07-18_partner_program_phase2.sql`
- `supabase/manual_migrations/2026-07-25_partner_program_phase3_onboarding.sql`
