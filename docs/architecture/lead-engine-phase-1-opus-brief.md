# Opus 4.6 engineering brief — Freuly Lead Engine Phase 1

Related issue: #40
Source audit: `docs/architecture/lead-engine-phase-1-audit.md`

## Task

Review the current Freuly lead/request/billing architecture and produce a concrete additive implementation design for Phase 1 of the Lead Engine.

Do **not** implement large production changes yet.

## Business invariants

1. Free profile/listing is allowed.
2. Free client contacts do not exist.
3. Client contact access requires either:
   - subscription entitlement, or
   - payment for that specific request/lead.
4. Two commercial models must coexist and be measurable:
   - subscription;
   - pay-per-lead.
5. Direct client selection gives the selected specialist first right to the opportunity, not free access.
6. If a selected specialist declines, does not pay, or does not respond, the opportunity may be redistributed.
7. Open/no-match requests may be offered to multiple suitable specialists under scarcity rules.
8. B2B is a first-class pricing segment from the start, with materially higher subscription and lead economics.
9. Freuly sells access to qualified demand; it does not need to verify the final service contract amount or take commission from the finished transaction.

## Current architecture facts to preserve

### Direct leads

- `leads` is the direct-to-selected-specialist object.
- PII is stored server-side but redacted until `contact_unlocked_at` exists.
- Contact unlock currently checks `specialist_plan.plan_status` only.
- Existing masking/redaction logic must remain the privacy boundary.

### Open/promoted service requests

- `service_requests` is the request object without a required selected specialist.
- `service_request_promotions` is an anonymized promotion layer.
- `promoted_request_payments` + Stripe handle pay-per-lead checkout.
- `promoted_request_access_grants` gives persistent payment/subscription access.
- webhook-confirmed payment is authoritative; success redirects are not.
- refund/dispute can revoke payment-sourced access.
- current price is hardcoded to EUR 10 in runtime and DB CHECK.
- current subscription acquisition credit is also coupled to EUR 10.

## Required target architecture

Design an additive `request_offers` (or justify a better name) layer representing one commercial offer of one request to one specialist.

It must support at minimum:

- request origin (`direct_lead` / `service_request`);
- specialist;
- offer reason (`direct_selection` / `matched` / `redistributed` / `manual`);
- pricing segment (`consumer` / `professional` / `business`);
- billing model (`subscription` / `pay_per_lead`);
- server-authoritative price snapshot;
- optional pricing rule reference;
- estimated service/project value range;
- lifecycle timestamps/events: offered, viewed, accepted, paid, declined, expired, contacted, outcome;
- future `max_buyers` scarcity enforcement;
- idempotent creation/retries.

Do not replace `leads` or `service_requests`. Do not create `leads_v2`.

## Canonical entitlement objective

Design one server-authoritative resolver around this invariant:

`can_view_client_contact = subscription_entitlement OR paid_request_entitlement`

For direct leads, preserve `contact_unlocked_at` as the persisted privacy boundary.

For promoted requests, preserve current grants initially rather than rebuilding Stripe/grants.

Explain exactly how the two paths converge without introducing duplicate sources of truth.

## Dynamic pricing requirement

Propose a safe migration from fixed EUR 10 to server-controlled dynamic pricing.

Pricing must support:

- minimum lead price;
- category/service pricing;
- B2C vs B2B segment;
- estimated service/contract value;
- declining percentage bands for higher-value contracts;
- min/max caps;
- future qualification/intent multipliers;
- future scarcity/max-buyers;
- persisted price snapshot per offer.

Browser/client must never supply an authoritative price.

Do not simply edit `PROMOTED_ACCESS_AMOUNT_CENTS` or remove the DB CHECK without a complete runtime/webhook migration plan.

Explicitly address the existing EUR 10 subscription-credit coupling.

## B2B requirement

B2B must use the same Lead Engine, not a separate request engine.

The architecture must allow:

- business pricing segment;
- higher subscription plans;
- high-value pay-per-lead prices;
- estimated project value input;
- declining percentage-based pricing bands;
- no dependency on final closed-deal amount.

## Concurrency/security requirements

- PII must never appear in locked DTOs.
- RLS/service-role boundaries must remain strict.
- Stripe webhook remains payment proof.
- refunds/disputes must remain auditable.
- `max_buyers` must be enforced transactionally/atomically, not with a naive read-count-write race.
- duplicate request/offers/payment retries must remain idempotent.
- production Supabase schema may differ from manual migrations; destructive assumptions are prohibited.

## Deliverable

Produce a reviewable architecture package with:

1. AS-IS diagram for direct leads.
2. AS-IS diagram for promoted/open requests.
3. TO-BE Lead Engine flow.
4. Exact SQL schema proposal for `request_offers` and pricing-rule storage, including CHECKs, unique indexes and indexes.
5. Exact integration points in current TypeScript runtime.
6. Canonical entitlement resolver API/type design.
7. Safe dynamic-pricing migration sequence.
8. Safe plan for pay-per-lead access to direct leads.
9. `max_buyers` transactional strategy.
10. B2B pricing-segment design.
11. Event/funnel model for offered → viewed → paid/subscription unlock → contacted → outcome.
12. Regression/test matrix.
13. Smallest additive implementation sequence, broken into independently reviewable commits/PRs.

Call out any assumption that must be verified against production Supabase before implementation.
