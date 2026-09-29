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
