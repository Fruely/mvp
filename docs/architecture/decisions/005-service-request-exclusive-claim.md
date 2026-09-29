# ADR-005: Service-request exclusive claim reservation

Status: Accepted  
Date: 2026-09-29

## Context

Assisted demand currently finalizes on TAKE. `claimOwnMatch` sets `service_requests.selected_specialist_id`, marks the winning match `selected`, closes the other matches, and opens the conversation.

Paid service-request access needs a step before that final connection:

`match → commercial offer → exclusive claim reservation → payment authorization → client confirms → capture → access grant → selected specialist → conversation`

Phase 1 is the reservation. Phase 2 adds the matched commercial offer and manual-capture authorization, then stops. Client confirmation, capture, the access grant, and chat stay later. Direct-lead Checkout stays on its own path.

## Decision

`service_request_claims` owns the exclusive reservation for one service request. It is not a payment table and it stores no client identity.

| Responsibility | Owner |
| --- | --- |
| Eligibility for a specialist | `service_request_matches` |
| Commercial offer | `request_offers` |
| Exclusivity | `service_request_claims` |
| Authorization and capture | `request_offer_payments` |
| Delivered paid entitlement | `request_offer_access_grants` |
| Finalized connection | `service_requests.selected_specialist_id` and `conversations` |

An authorized PaymentIntent (`requires_capture`) is not captured money, not a delivered access grant, and not a conversation. The claim stays `reserved` while the payment row holds `authorized`.

At most one `reserved` or `completed` claim may exist for a request, and for a match. `released`, `expired`, and `failed` are history and may be followed by a later claim. `completed` permanently keeps the request.

`reserve_service_request_claim(uuid, uuid, uuid)` is the only reservation writer. It is service-role only, locks the match, request, and offer, and does not select a specialist or create a conversation. The server resolves the current matched offer and the function checks it again. A missing or unusable offer returns `offer_unavailable`.

`POST /api/specialist/matches/[matchId]/reserve` calls that function. It stays off unless `SERVICE_REQUEST_PAID_CLAIM_ENABLED=true`.

When `SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED=true`, matching writes one idempotent `request_offers` row per persisted eligible service-request match: `request_kind=service_request`, `offer_reason=matched`, `billing_model=pay_per_lead`, `price_cents` null. The flag defaults off. No live price is chosen here.

`POST /api/specialist/claims/[claimId]/payment-intent` creates a direct card PaymentIntent with `capture_method=manual`. It stays off unless both `SERVICE_REQUEST_PAID_CLAIM_ENABLED` and `SERVICE_REQUEST_PAYMENT_AUTH_ENABLED` are true. Amount and currency come only from the persisted offer. `price_cents` null returns `price_unavailable`. The specialist client receives `client_secret` only to confirm; the server does not store or log it. The existing Stripe webhook marks the payment `authorized` when the intent is `requires_capture`. That handler does not capture, grant access, or open chat.

`POST /api/specialist/matches/[matchId]/claim` remains the current TAKE contract. It still finalizes immediately through `finalizeServiceRequestConnection` and does not write `service_request_claims` or payments. That legacy path stays until a later cutover. Paid finalization will call the same function only after capture.

## Non-goals of Phase 2

No client confirmation, no capture, no reservation TTL, no access grant, no claim completion, no conversation, no live pricing rule, and no Native change.
