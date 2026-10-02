# ADR-006: Service-request access pricing v1

Status: Accepted  
Date: 2026-09-29

## Context

Exclusive service-request access is a Freuly product. It is not a commission on the specialist's later job, not a client bid, and not an auction. The specialist must see one exact access price before taking the request. The final service transaction stays outside this formula.

`request_offers.price_cents` is the immutable commercial snapshot. ADR-004 owns the offer table. ADR-005 owns claim exclusivity. This decision owns only the v1 price.

## Decision

Currency is EUR. The canonical matched service-request connection fee is exactly **2500 cents**. That is the MP1-S4 rollout price for every specialist. It is not a permanent pricing strategy and it is not the client's service price.

The fee is server-authoritative. Browser, Native, and other client input cannot choose it. Specialist identity, category, and the supply floor are not inputs. `lead_pricing_rules` and shadow pricing are not inputs. `pricing_rule_id` stays null.

Explicit client budget remains request and matching information. The budget normalizer accepts one explicit EUR amount, an "up to" ceiling, a "from" floor, or one range. A range uses its upper bound. A single amount is snapshotted as both minimum and maximum. "From X" leaves the maximum null. "Up to X" leaves the minimum null. Non-EUR currency, several unrelated amounts, and malformed text produce no numeric basis. There is no FX conversion.

Those bounds are stored on the offer as `estimated_service_value_min_cents` and `estimated_service_value_max_cents`. If the client has accepted a budget-reconciliation ceiling, offers created after that acceptance snapshot that accepted amount as both bounds. Neither the original budget text nor the accepted ceiling changes `price_cents`.

`price_cents` is 2500 and `currency` is `eur` on every newly created canonical matched offer. `max_buyers_snapshot` stays 1. A canonical matched offer that still has a null price may be filled once with 2500, and only while `price_cents` is null.

A previously persisted positive `price_cents` is not rewritten, including when it is not 2500 and including when a budget ceiling later changes. Paid, accepted, and otherwise settled commercial rows stay as stored. Still-open rows are also left unchanged: this decision does not run a migration over historical offers.

A new Stripe authorization, webhook authorization, or client confirmation/capture for a canonical matched service-request offer succeeds only when the persisted offer price and the payment amount are exactly 2500 cents EUR. Any other live amount fails closed and is not rewritten, canceled, or captured by this rule.

## Non-goals

No recurrence, scarcity, category, geography, campaign, profile, or AI valuation. No per-specialist price. No final-service commission. No Native change and no capture.
