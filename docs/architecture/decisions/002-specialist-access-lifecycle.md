# ADR-002: Unified specialist access lifecycle

Status: Accepted
Date: 2026-08-07

## Context

Paid plan identity, payment state, public profile visibility and contact-access
entitlement must not be represented as one overloaded subscription status.

The current product model separates three concerns:
- public base-profile publication, which does not require a paid tariff;
- tariff entitlement (Professional / Growth), which can grant contact access
  during the paid coverage period;
- one-off paid request entitlement (pay-per-lead), which grants access only to
  the specific request offer.

Expiry, non-renewal and refund therefore affect paid entitlement, not the basic
right of an otherwise eligible profile to remain publicly listed.

## Decision

The canonical specialist access lifecycle is:

- `active` — valid paid coverage exists.
- `grace` — valid paid coverage does not exist, but temporary access remains
  until `grace_until`.
- `inactive` — grace has ended without valid paid coverage; no new
  subscription-based contact unlock is available. Public listing is not
  blocked merely because the tariff is inactive.

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
- Initial publication does not require paid coverage and therefore does not
  create a subscription grace period.

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

Subscription lifecycle must not set `billing_visibility_blocked` merely
because paid coverage ends. Search, sitemap, and direct-lead targeting still
honor the flag if it is explicitly true for a separate moderation or
operational reason.

## Addendum 2026-09-15: listing/entitlement split

Public listing eligibility is no longer derived from subscription lifecycle.

- `inactive` means no covering subscription entitlement. It does not prevent
  a valid pay-per-lead purchase for a specific request offer.
- `inactive` does not set `billing_visibility_blocked`.
- `billing_visibility_blocked` is retained as an explicit block flag, not as
  "no active Professional/Growth subscription".
- PPL-only published specialists keep a `specialist_plan` row with
  `plan_status = inactive` so missing-plan / `early_access` fallback cannot
  grant contact access.

The specialist account and profile data are not automatically deleted.
The dashboard remains available so the specialist can pay and reactivate.

## Contact unlock

New reveal of locked lead contacts is a billing-gated mutation, not a UI decision.

Canonical helper: `lib/billing/contactUnlockEntitlement.ts`
(`canUnlockLeadContacts` / `resolveBillingAccessState`).

- `active`: subscription entitlement may unlock contacts covered by the tariff.
- `grace` (`grace` / `grace_period`): subscription entitlement may remain valid
  according to the current grace policy.
- `inactive` / `expired` / `cancelled`: no new subscription-based unlock.
  A specific request may still be unlocked through a valid paid request
  entitlement when pay-per-lead is available.
- `early_access`, `trialing` and missing-plan fallbacks are legacy/transition
  concerns and must not silently grant current free users paid contact access.

Previously unlocked contacts (`contact_unlocked_at` set) stay readable after
billing becomes inactive. Lead status changes (`accepted` / `contacted` /
`closed`) must not reveal contacts.

Blocked specialist accounts remain forbidden by existing session auth.

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

- tying public base-profile visibility to paid subscription coverage;
- using a refunded monthly `expires_at` as continued paid access;
- treating `basic` as a free Starter plan;
- independent UI lifecycle interpretations;
- billing directly forcing general `is_visible` state;
- keeping obsolete lifecycle/UI branches solely for rollback.

Git history is the rollback/archive mechanism.
