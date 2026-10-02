# ADR-007: Service-request client confirmation and capture

Status: Accepted  
Date: 2026-09-29

## Context

ADR-005 reserves one specialist. ADR-006 prices access. Phase 2 authorizes that price on a manual-capture PaymentIntent and stops. The client has not yet agreed to the connection, so the authorization must not become a charge, an entitlement, or a conversation.

## Decision

The client explicitly confirms before Freuly captures. Confirmation is `service_request_claims.client_confirmed_at`. It stores no client identity. The paid reservation function now requires `service_requests.client_user_id`.

`POST /api/client/requests/service-request/[id]/confirm` resolves the owned request, the reserved claim, the authorized payment, and the stored PaymentIntent. The request body does not choose the specialist, claim, amount, currency, or PaymentIntent. After the timestamp is stored, the endpoint captures that same PaymentIntent in full, with the idempotency key `service-request-capture:{paymentId}`. The HTTP response does not grant access or open chat.

The billing webhook owns fulfillment after `payment_intent.succeeded`, and only when `client_confirmed_at` is present. The order is: mark the payment paid, write `request_offer_access_grants`, mark the offer paid, call `finalizeServiceRequestConnection`, then complete the claim. A retry continues from the steps already done. A missing confirmation fails closed.

`SERVICE_REQUEST_CAPTURE_ENABLED` defaults off. All three paid flags must be on before confirmation is available. A confirmation-required inbox notice is sent only when that flag is on, once per claim.

## Amendment 2026-10-02 — confirmation deadline

The client has a finite server-owned window to confirm after a valid €25 Stripe authorization exists. The duration is `SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS`. It is a positive integer number of seconds. There is no default. Native and Web do not calculate or send it.

`service_request_claims.confirmation_expires_at` stores the absolute deadline for that reserved claim. It is written once, from the server authorization time, when synchronous authorization or the authorization webhook first makes the payment `authorized`. A replay returns the stored timestamp and does not move it. Existing rows are not backfilled.

A new authorization does not create a PaymentIntent when that configuration is missing. A valid `payment_intent.amount_capturable_updated` event with that configuration missing leaves the payment pending and is a retryable webhook failure, so the billing event is not skipped. Client confirmation does not capture when the deadline is missing or already past. This amendment does not cancel the PaymentIntent on a timeout, release the payment on a timeout, mark the claim expired, or run an expiry worker.

## Amendment 2026-10-03 — client rejection

Client rejection is a different decision from a specialist `declined` match response. The owning client rejects the currently reserved specialist before connection. `service_request_claims.client_rejected_at` is written only while `client_confirmed_at` is null, and confirmation is written only while `client_rejected_at` is null. A check constraint keeps both timestamps from being set. The request body does not choose the specialist, claim, amount, currency, PaymentIntent, reason, or timestamp.

`POST /api/client/requests/service-request/[id]/reject` then cancels the uncaptured PaymentIntent with idempotency key `service-request-release:{paymentId}`. It does not capture or refund. Local release sets the payment to `released`, then that match to `not_selected`, and only then the claim to `released` with `release_reason = client_rejected`. The claim stays `reserved` until the match can no longer be reserved. `confirmation_expires_at` stays. The request stays unselected. No conversation, access grant, or automatic rematch is created. A repeated call returns the same released state.

If cancellation or a later local write fails, the rejection timestamp remains and confirmation cannot capture. The call is retryable and resumes from the stored decision. `payment_intent.canceled` uses that same local release when the rejection timestamp is present. A paid or completed connection is not rewritten as released. A missing confirmation window or a disabled capture flag does not keep an existing uncaptured authorization held. Expiry and redistribution remain a separate gap.

## Non-goals

No expiry worker, no automatic rematch, no Native confirm or reject control, no store-payment rejection, and no capture of the client's own money. The final service transaction stays outside Freuly. The permanent confirmation-window duration is not chosen here.
