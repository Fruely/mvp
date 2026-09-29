# ADR-005: Service-request exclusive claim reservation

Status: Accepted for Phase 1 foundation  
Date: 2026-09-29

## Context

Assisted demand currently finalizes on TAKE. `claimOwnMatch` sets `service_requests.selected_specialist_id`, marks the winning match `selected`, closes the other matches, and opens the conversation.

Paid service-request access needs a step before that final connection:

`match → commercial offer → exclusive claim reservation → payment authorization → client confirms → capture → access grant → selected specialist → conversation`

Payment, offer creation, and client confirmation are not part of this phase. Direct-lead pay-per-lead stays on its own path.

## Decision

`service_request_claims` owns the exclusive reservation for one service request. It is not a payment table and it stores no client identity.

| Responsibility | Owner |
| --- | --- |
| Eligibility for a specialist | `service_request_matches` |
| Commercial offer | `request_offers` |
| Money | `request_offer_payments` |
| Paid entitlement | `request_offer_access_grants` |
| Exclusive reservation | `service_request_claims` |
| Finalized connection | `service_requests.selected_specialist_id` and `conversations` |

At most one `reserved` or `completed` claim may exist for a request, and for a match. `released`, `expired`, and `failed` are history and may be followed by a later claim. `completed` permanently keeps the request.

`reserve_service_request_claim` is the only reservation writer. It is service-role only, locks the match and request, and does not select a specialist or create a conversation.

`POST /api/specialist/matches/[matchId]/reserve` calls that function. It stays off unless `SERVICE_REQUEST_PAID_CLAIM_ENABLED=true`.

`POST /api/specialist/matches/[matchId]/claim` remains the current TAKE contract. It still finalizes immediately through `finalizeServiceRequestConnection` and does not write `service_request_claims`. That legacy path stays until a later cutover. Paid finalization will call the same function only after capture.

## Non-goals of this phase

No Stripe authorization or capture, no reservation TTL, no client confirmation API, and no Native change.
