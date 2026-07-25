# Partner flow v1.0 (public self-serve)

## Public acquisition (standard)

1. `/{lang}/partners`
2. CTA → login/register → `/{lang}/partners/onboarding`
3. No partner row → `/{lang}/partners/agreement`
4. Explicit electronic acceptance (checkboxes) → partner created + **active**
5. Personal referral code/link immediately available
6. Partner dashboard

Admin approval is **not** required for normal join. Admin remains for suspension, blocking, abuse, and exceptional ops.

Optional publisher channel form on `/partners` (`#apply`) is **not** the standard join path.

## Invite acquisition (legacy / direct)

1. Admin creates invite → one-time token
2. `/{lang}/partners/invite/{token}`
3. Auth → bind `partners.user_id`
4. Same agreement onboarding (same Partner Agreement v1.0)
5. Same personal referral mechanism (no separate partner type)

## Shared onboarding

```
auth
  → agreement (v1.0 + accepted_at + audit locale/hash)
  → (optional) payout onboarding when PARTNER_PAYOUTS_ENABLED=true
  → partner dashboard
```

Agreement source: `content/partners/agreementContent.ts` (DE canonical).  
Hash: `lib/partners/agreementHash.ts` (SHA-256 of DE plain text).

## Referral ownership

- Reward belongs to `partner_id` that owns the referral code
- Copying/distributing another partner’s link does **not** transfer ownership
- Invitation link ≠ referral link

## Attribution

- Cookie TTL: **90 days** from first valid touch (`PARTNER_REF_MAX_AGE_SEC`)
- **First-touch wins** inside the window (`/r/[code]` does not overwrite valid cookie)
- Registration locks attribution (`tryCreateAttributionFromCookie` never overwrites)

## Commission rules

- First **monthly** paid subscription only: `gross − VAT − provider fee`
- Created `pending` with `earned_at = paidAt`
- Auto-approve after 14 calendar days via cron `/api/cron/partner-commissions-approve`
- One commission per specialist; renewals/annual full amount rejected
- Self-referral blocked by `user_id` / email identity
- Household abuse: agreement + attestation checkbox (no IP/device hard reject)

## Cash vs Freuly credit

After `approved`:

- **Cash** — UI available; live Stripe payout only if `PARTNER_PAYOUTS_ENABLED=true`
- **Subscription credit** — `POST /api/partner/credits/apply` (integer cents ledger)

Ledger columns (phase4 migration): `credited_cents`, `paid_out_cents`, `partner_credit_applications`.

## Payout-disabled mode

`PARTNER_PAYOUTS_ENABLED=false` (default):

- join / agreement / referral / attribution / pending → approved work
- cash CTA shows “payouts not yet connected”; balance preserved
- subscription credit independent of Stripe payout
