# Freuly Domain State Machines

**Status:** Canonical

Freuly does not have one mega state machine. Request, match, offer, claim, payment, entitlement and conversation are separate entities with separate ownership.

## 1. Product journey

```text
REQUEST
  ↓
MATCH
  ↓
OFFER
  ↓
CLAIM (exclusive)
  ↓
PAYMENT
  ↓
ACCESS GRANT
  ↓
FINAL CONNECTION
  ↓
CONVERSATION
```

A later stage must not be inferred from an earlier stage. For example, an authorized payment is not an entitlement, and a claim is not a conversation.

## 2. service_request

Current persisted statuses:

```text
new
reviewing
searching
matched
closed
cancelled
spam
```

These describe the lifecycle of the demand record. They do **not** encode payment, reservation or chat state.

Selected ownership is represented separately by `selected_specialist_id` / `selected_at`.

Do not introduce `RESERVED`, `PAYMENT_PENDING` or `CONNECTED` into `service_request.status` merely to mirror UI steps.

## 3. service_request_match

Current statuses:

```text
active
interested
declined
expired
selected
not_selected
```

The match represents specialist eligibility/opportunity for one request.

A match may be selected only through authoritative connection finalization.

## 4. request_offer

Current statuses:

```text
offered
viewed
accepted
paid
declined
expired
fulfilled
```

For the new service-request access model, the canonical initial offer identity is:

```text
request_kind = service_request
offer_reason = matched
pricing_segment = consumer
billing_model = pay_per_lead
currency = eur
```

`price_cents` is the immutable commercial snapshot once positive.

## 5. service_request_claim

Current statuses:

```text
reserved
completed
released
expired
failed
```

`reserved` is the exclusive mutex-like ownership before final connection.

Invariant:

```text
one service_request → max one live reserved/completed claim owner
one match           → max one live reserved/completed claim owner
```

Claim does not itself create a conversation and does not prove payment.

`client_confirmed_at` belongs to the claim. It is provider-neutral. It records that the owning client confirmed the connection. It does not grant access and it does not choose a payment provider.

## 6. request_offer_payment

Current persisted statuses include:

```text
pending
authorized
paid
failed
expired
refunded
disputed
released
```

These are current storage semantics shared with legacy direct-lead billing and the service-request authorization foundation.

Important: the provider-neutral product contract must not require every rail to expose an `authorized` state. Stripe manual-capture may use it; StoreKit/Google rails may settle differently.

Therefore mobile/UI business state must not be a direct mirror of raw provider status.

## 7. request_offer_access_grant

An active, non-revoked `request_offer_access_grants` row is the persistent proof that paid access was granted for a concrete offer/specialist/payment relationship.

Payment row alone is not enough.

The target paid service-request connection must require valid entitlement before final connection/chat.

## 8. conversation

Current persisted conversation status:

```text
open
```

One `service_request` has at most one conversation.

Conversation creation is an effect of final connection. The mobile client does not create one directly.

## 9. Provider-neutral semantic view

UI and cross-platform product logic should reason about stable semantic phases, not provider-specific states:

```text
available
reserved
payment_required / payment_in_progress
awaiting_required_confirmation
settled
entitled
connected
released / unavailable
```

These semantic phases are not necessarily persisted as one enum. They may be derived from the authoritative entities above.

Do not add a new persisted mega-enum unless a concrete requirement proves it necessary.

Waiting for specialist payment on the Native store rail is derived, not a new claim or request status:

```text
claim.status = reserved
AND client_confirmed_at IS NOT NULL
AND no active request_offer_access_grants row for that offer and specialist
```

On the Stripe rail, confirmation starts capture of an already authorized PaymentIntent. That is not the same derived state, because the specialist is not asked to start a new purchase.

## 10. Transition authority

Server/database logic owns transitions that affect exclusivity, money, entitlement or connection.

Native/Web may request actions such as TAKE, decline, confirm or send message. A client action is never proof that the corresponding authoritative transition succeeded.

## 11. Current vs planned

**Implemented, flags off:** request/match/offer/claim states above, Stripe manual-capture authorization, client confirmation, capture, webhook fulfillment, grant, connection finalizer, conversation.

**Specified, persistence only:** nullable provider columns on `request_offer_payments`. Stripe writers tag new rows. The migration is not applied, and the columns are not entitlement.

**Specified, not implemented:** the Native store rail, store verification, the `payment_required` notice, and reservation/payment timeout release.

Until the store rail exists and rollout is approved, paid-flow feature flags remain off. `docs/sdd/03-PAYMENT-AND-ENTITLEMENT.md` owns the rail contract.
