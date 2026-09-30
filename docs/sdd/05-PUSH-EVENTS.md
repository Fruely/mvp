# Freuly Push and Notification Events

**Status:** Canonical

Push accelerates the marketplace. It is not the source of truth for marketplace state.

## 1. Rules

Every push event must have:
- a stable semantic event type;
- an authoritative server-side entity;
- an idempotent/deduplicated notification path where applicable;
- a safe deep link;
- no secret or private contact payload.

The recipient must be derived from authenticated/server-owned relationships, not arbitrary client ids.

## 2. Current event families

Current implementation includes event semantics around:

- match availability/reminders;
- specialist interest/client reminders;
- connection ready;
- legacy client selection notice;
- conversation messages.

Exact current payload contracts remain owned by the implemented inbox/push modules and tests.

## 3. Push is not state

A push saying "new request" does not create the match.

A push saying "connected" does not create the conversation.

A push saying "payment" does not prove settlement.

On tap/open, the app reloads authoritative server state.

## 4. Privacy

Do not include:
- payment client secrets;
- access tokens;
- email/phone/Telegram;
- private message text unless a separately approved privacy policy allows it;
- service credentials.

Lock-screen copy should remain safe if seen by another person.

## 5. Deep links

Deep links are part of the mobile compatibility contract.

A backend deploy must not emit a new mandatory deep-link shape before supported mobile versions can route it.

When a new event is needed, add it; do not silently reuse an older event whose meaning is materially different.

Example: a future paid-flow "client confirmation required" event must not masquerade as legacy `client_selected_you`.

## 6. Additive compatibility

New optional payload fields are allowed only when they have a real current semantic owner and old clients safely ignore them.

Do not reserve speculative fields such as `spokenSummary` merely because a future voice experience might use them.

When voice/hands-free delivery becomes a real feature, define its semantics then.

## 7. Delivery behavior

Provider acceptance is not proof the user saw the notification.

Notification retry/dedupe must not create duplicate domain actions.

The app must remain usable when push is disabled, delayed or unavailable; authoritative inbox/state reads are the recovery path.

## 8. Shared transport, separate semantics

Vercel, Supabase, `notification_outbox`, Expo push, Telegram, email, retry, and dedupe may be shared.

A new event does not inherit match-reminder timers, selection preferences, email escalation, Telegram fan-out, quiet hours, or high-priority push unless its own policy says so.

The paid service-request flow must not emit `client_selected_you`. Reservation is not client selection. Capture and fulfillment do not depend on that event. `connection_ready` means the connection is ready. `specialist_interested`, `client_reminder`, and `client_selected_you` remain compatibility behavior for the legacy paths only.

A live exclusive claim (`reserved` or `completed`) suppresses later match-available reminders for that match. Delivery re-reads that claim before sending an already queued `match_available` or `match_reminder` and cancels the outbox row when the claim is live. The inbox row stays. `released`, `expired`, and `failed` do not count as live and must not be revived by the reminder job. An ordinary active match with no live claim still receives reminders. `connection_confirmation_required`, `connection_ready`, and `conversation_message` are not availability notices and are not cancelled by this guard. `connection_confirmation_required` has its own delivery check: if that claim is missing, no longer `reserved`, or already has `client_confirmed_at`, the outbox row is cancelled as `stale_confirmation_state`. The inbox row stays. `connection_ready` and `conversation_message` are outside that check.

Budget reconciliation does not add a push event. The client learns the unresolved floor from the create response and from the authenticated request detail.

## 9. Future Native `payment_required`

This event is specified and not implemented.

After the owning client confirms a reserved claim on the Native store rail, the specialist needs one semantic event: `payment_required`.

It means: the client confirmed, and the specialist must complete paid access to continue.

It does not mean payment succeeded, an access grant exists, or the connection is ready.

Do not reuse `client_selected_you`, `connection_ready`, `match_available`, `match_reminder`, or `connection_confirmation_required`. `connection_confirmation_required` means the owning client must confirm the reserved connection. Stripe sends it after authorization. Store preparation sends it before the client confirms. It is not the specialist `payment_required` event.

The authoritative entity is the reserved claim with `client_confirmed_at` set and no active access grant. Send it once per claim. The deep link reloads server state. The payload must not include client contact details, a payment client secret, or a receipt. Opening the notification is not proof of purchase.

Do not emit `payment_required` for the Stripe rail. On that rail the specialist has already authorized, and confirmation starts capture.
