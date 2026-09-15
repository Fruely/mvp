# Freuly Lead Engine — Phase 1 next steps

Related issue: #40

## Current decision

Do not implement dynamic pricing, new payment flows, or schema-destructive changes yet.

The next architecture review should use:

- `docs/architecture/lead-engine-phase-1-audit.md`
- `docs/architecture/lead-engine-phase-1-opus-brief.md`

## Immediate sequence

1. Architecture review of `request_offers`, entitlement convergence, pricing rules, and max-buyers concurrency.
2. Verify any assumption that depends on production Supabase schema.
3. Approve the smallest additive migration.
4. Implement only the additive `request_offers` data foundation first.
5. Add runtime writes behind existing lead/request creation paths without changing current contact-unlock or EUR 10 billing behaviour.
6. Add tests proving no regression to PII redaction, subscription unlock, promoted-request payment grants, refunds/disputes, and idempotency.

## Explicitly deferred

- changing the live EUR 10 promoted-request price;
- direct-lead pay-per-lead checkout;
- B2B subscription prices;
- max-buyers enforcement;
- large specialist-dashboard redesign;
- client wizard redesign;
- automated matching/ranking.

These depend on the approved Phase 1 architecture.
