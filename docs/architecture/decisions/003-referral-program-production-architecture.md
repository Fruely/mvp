# ADR-003: Referral program production architecture

Status: Accepted  
Date: 2026-08-09

## Context

Freuly's partner referral program spans attribution, Stripe billing, commission
validation, partner balance consumption (Freuly credit or manual payout), and admin
operations. Earlier phases included transitional admin UI to confirm first payments
before Stripe webhooks were canonical, legacy partner rate fields, and deferred
Stripe Connect payout onboarding.

Production behavior is now defined across R1–R3. This ADR records the accepted
architecture so future work does not reintroduce duplicate commission engines or
misleading operator flows.

## Decision

### 1. Attribution

- Referral entry: `/r/{code}` sets a signed, httpOnly first-touch cookie (90 days).
- A valid existing cookie is never overwritten by a later partner click.
- Specialist registration binds `partner_attributions` once; attribution is immutable.
- Self-referral is rejected. Signup succeeds even when attribution fails.
- One user / one specialist → at most one attribution row.

### 2. Canonical commission source

Partner commission is created automatically from the **first eligible paid monthly
Stripe subscription invoice** via:

`processStripeBillingWebhook` → `processStripeWebhookEventForPartners` →
`handleStripeInvoicePaidForPartnerCommission` → `createCommissionFromStripeInvoice`.

Commission is **not** created from:

- `subscription.created` / `subscription.updated`
- `checkout.session.completed` alone
- €10 promoted request payment
- promoted subscription credit consumption
- partner Freuly credit application
- 7-day publication or grace-period lifecycle events

Duplicate invoice events are idempotent (`source_type` + `source_event_id`).
Renewals do not create a second commission for the same specialist.

### 3. Reward economics

Reward uses **actual Stripe invoice facts**:

- `gross = invoice.amount_paid`
- `reward = gross − VAT/tax − provider fee`

Examples in production:

- Professional first invoice at list price (2900 cents) or with €10 promo credit
  (1900 cents net invoice) both use the **paid invoice amount**, not catalog list price.
- Growth first invoice at 5900 or 4900 cents net behaves the same way.

`partners.commission_amount_cents` is legacy admin metadata only; it does not
determine live commission amounts.

### 4. Validation and reversal

- New commissions start as **pending**.
- After **14 days** from first payment (`earned_at`), eligible pending commissions
  are approved by cron (`/api/cron/partner-commissions-approve`).
- Refund, dispute, or void before or after approval can **reverse** pending/approved
  commissions via Stripe webhook handlers or admin reverse API.
- Reversed commissions are not spendable for credit or payout.
- Fully **paid** commissions follow current MVP no-clawback policy (no negative partner balance).

### 5. Consumption (approved balance)

An approved commission balance may be consumed **once**, either:

1. **Freuly credit** — internal ledger via `POST /api/partner/credits/apply`
2. **Manual payout** — partner request → admin ready → external SEPA transfer → admin paid

Rules:

- `credited_cents + paid_out_cents ≤ amount_cents`
- Payout reservation blocks credit and second payout requests until cancel or paid
- Partner credit does not create Stripe revenue or new partner commissions

### 6. Payout operations

- Payout is **manual bank transfer** outside Freuly.
- Freuly records draft → ready → paid; it does not execute bank transfers.
- **Stripe Connect is intentionally deferred**; partner financial UI uses manual payout only.
- Backend Connect stub may remain for future evolution but is not surfaced in partner UX.

### 7. Legacy admin confirm-first-payment

`POST /api/admin/partners/confirm-first-payment` is retained as a **LEGACY /
emergency admin fallback** only (auth + idempotency preserved). It must not appear as
the normal operator path to create commissions. Canonical creation remains Stripe
`invoice.paid`.

## Consequences

- Admin partners UI shows payout queue and partner lifecycle; it does not expose
  confirm-first-payment as a primary workflow.
- Integration/regression tests guard attribution, Stripe eligibility, 14-day approval,
  reversal, credit/payout mutual exclusion, and dashboard reconciliation.
- Changes to commission percentage, payout business rules, or Stripe Connect require
  an explicit new ADR/product decision.

## References

- `lib/billing/stripePartnerCommission.ts`
- `lib/partners/commissions.ts`
- `lib/partners/attribution.ts`
- `lib/partners/credit.ts`, `lib/partners/payouts.ts`
- `lib/partners/referralIntegration.logic.test.mjs`
