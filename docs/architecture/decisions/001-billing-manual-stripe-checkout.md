# ADR-001: Manual Stripe Checkout is the canonical billing model

Status: Accepted
Date: 2026-08-07

## Context

Freuly previously contained transitional and pre-Stripe billing UI,
including placeholders indicating that online payments were unavailable or
would be introduced later.

Real Stripe Checkout is now live in production.

## Decision

The canonical billing model is:

- Stripe Checkout is the production payment mechanism.
- Payments are manual one-time purchases, not automatic recurring
  subscriptions.
- Freuly Professional is represented internally by plan code `basic`.
- Freuly Growth is represented internally by plan code `premium`.
- A plan code identifies the commercial plan but does not by itself prove
  that paid access is currently active.
- Checkout availability is determined by the canonical billing readiness /
  feature-flag infrastructure.
- Technical payment-provider fallbacks may remain where required for
  infrastructure or tests, but they must not restore obsolete
  customer-facing "payments coming later" behavior.

## Superseded behavior

The following behavior is obsolete and must not be reintroduced without an
explicit new product decision:

- customer-facing pre-Stripe payment placeholders;
- "online payments coming later" UI;
- "payments are not accepted" production messaging when Stripe is ready;
- UI that treats `plan_code` alone as proof that a paid plan is current;
- duplicate billing-state helpers implementing competing interpretations.

Git history preserves these previous implementations if rollback or forensic
inspection is required.

## Consequences

Billing UI must derive current paid state from the canonical subscription /
lifecycle model.

When a temporary billing implementation is replaced by an accepted
production implementation, the temporary runtime code and unused locale keys
should be removed from main.
