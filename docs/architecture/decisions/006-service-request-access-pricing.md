# ADR-006: Service-request access pricing v1

Status: Accepted  
Date: 2026-09-29

## Context

Exclusive service-request access is a Freuly product. It is not a commission on the specialist's later job, not a client bid, and not an auction. The specialist must see one exact access price before taking the request. The final service transaction stays outside this formula.

`request_offers.price_cents` is the immutable commercial snapshot. ADR-004 owns the offer table. ADR-005 owns claim exclusivity. This decision owns only the v1 price.

## Decision

Currency is EUR. The price is computed once per service request from the explicit client budget and copied onto every initial matched offer. The default basis is `service_requests.client_budget_text`. If the client has explicitly accepted a budget-reconciliation ceiling, that accepted amount is the basis for offers created after the acceptance. Specialist identity does not change the price. The supply floor itself is not a pricing input. A previously persisted positive `price_cents` is not rewritten when the ceiling changes.

Let B be the explicit client budget in EUR. If no reliable explicit EUR budget exists, or B is at most EUR 250, the raw price is EUR 25. Above EUR 250 and through EUR 1,000, the raw price is EUR 25 plus 5% of the amount above EUR 250. Above EUR 1,000, the raw price is EUR 62.50 plus 2% of the amount above EUR 1,000. The result is capped at EUR 250.

Commercial rounding is to the nearest EUR 5. An amount exactly halfway between two steps rounds up. Persisted values are integer cents.

The budget normalizer accepts one explicit EUR amount, an "up to" ceiling, a "from" floor, or one range. A range uses its upper bound as B. A single amount is snapshotted as both minimum and maximum. "From X" leaves the maximum null. "Up to X" leaves the minimum null. Non-EUR currency, several unrelated amounts, and malformed text produce no numeric basis, and the access price is then the EUR 25 floor. There is no FX conversion.

The offer stores that price in `price_cents`, the normalized bounds in `estimated_service_value_min_cents` and `estimated_service_value_max_cents`, and `max_buyers_snapshot = 1`. `pricing_rule_id` stays null. `lead_pricing_rules` and shadow pricing are not inputs.

A positive `price_cents` is never rewritten. A canonical matched offer that still has a null price may be filled once with the current v1 snapshot, and only while `price_cents` is null.

## Non-goals

No recurrence, scarcity, category, geography, campaign, profile, or AI valuation. No per-specialist price. No final-service commission. No Native change and no capture.
