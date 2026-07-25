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
  → agreement (version + accepted_at)
  → payout onboarding (Stripe Connect boundary)
  → partner dashboard
```

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
- legal/tax final approval of Partner Agreement text (`TODO LEGAL REVIEW`)

## Manual DB

Apply when ready:

- `supabase/manual_migrations/2026-07-18_partner_program_phase1.sql`
- `supabase/manual_migrations/2026-07-18_partner_program_phase2.sql`
- `supabase/manual_migrations/2026-07-25_partner_program_phase3_onboarding.sql`
