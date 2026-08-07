# ADR-002: Unified specialist access lifecycle

Status: Accepted
Date: 2026-08-07

## Context

Paid plan identity, payment state, public visibility and grace-period access
must not be represented as one overloaded subscription status.

Different events can remove valid paid coverage:
- natural paid-period expiry;
- non-renewal;
- full refund;
- first publication before the first payment.

They must resolve through one consistent access lifecycle.

## Decision

The canonical specialist access lifecycle is:

- `active` — valid paid coverage exists.
- `grace` — valid paid coverage does not exist, but temporary access remains
  until `grace_until`.
- `inactive` — grace has ended without valid paid coverage; billing blocks
  public visibility.

The commercial plan and lifecycle are separate concepts.
`plan_code` may retain the relevant or most recent commercial plan
(`basic` / `premium`) while lifecycle state determines whether that plan is
currently paid and active.

## Grace rules

Standard grace duration is 7 days.

- Natural expiry:
  grace begins at the paid `period_end_at`.
- Full refund:
  when no other valid paid coverage remains, grace begins at `refunded_at`.
  A refunded user does not retain the remainder of the refunded monthly
  paid period.
- Initial publication after lifecycle enrollment:
  one initial grace period may be granted before first payment.
  Republishing must not reset it.

Partial refunds do not alter lifecycle access.

If newer valid paid coverage exists, refunding an older payment must not
remove the newer entitlement.

## Public visibility

Billing must not overwrite moderation or administrator visibility state.

Billing owns the dedicated marker:
`specialists.billing_visibility_blocked`

Public specialist surfaces require the normal publication/activity/visibility
conditions AND:
`billing_visibility_blocked = false`

During `active` and valid `grace`, billing visibility is not blocked.
After transition to `inactive`, billing visibility is blocked.

The specialist account and profile data are not automatically deleted.
The dashboard remains available so the specialist can pay and reactivate.

## Canonical implementation

Lifecycle interpretation must have one canonical source of truth.

UI surfaces must not independently infer paid access merely from
`plan_code`, old subscription statuses, or legacy Starter/free-plan logic.

The central reconciliation mechanism is responsible for deriving lifecycle
from valid payment coverage and lifecycle enrollment.

Scheduled reconciliation handles time-based transitions that do not have a
webhook at the exact expiry moment.

## Legacy safety

Existing published specialists must not be unexpectedly hidden merely
because the lifecycle schema is introduced.

Legacy migration/enrollment behavior must be explicit and rollout-safe.

## Superseded behavior

The following must not be reintroduced without an explicit product decision:

- permanent public Starter/free fallback after grace;
- using a refunded monthly `expires_at` as continued paid access;
- treating `basic` as a free Starter plan;
- independent UI lifecycle interpretations;
- billing directly forcing general `is_visible` state;
- keeping obsolete lifecycle/UI branches solely for rollback.

Git history is the rollback/archive mechanism.
