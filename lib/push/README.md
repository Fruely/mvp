# Push transport

Freuly Inbox remains the record of an event. Push only opens that event.

The deployed site is a PWA without Web Push. The Expo app lives in a separate repository and does not register tokens yet. This adapter speaks the Expo push HTTP API. It sends only when `EXPO_PUSH_ACCESS_TOKEN` is set and the recipient has an enabled device. Otherwise the outbox row is skipped and email or Telegram continue.

Anonymous requests are not push recipients. They keep email.

The Expo data payload carries the event, entity, HTTPS path, locale, Inbox item id and conversation id when one exists. It does not carry the push token. `GET /api/inbox/unread` returns the authoritative unread count for the signed-in user. `connection_ready` opens the client conversation path.

## Defaults

Service notifications start enabled for push, email and Telegram. Quiet hours use the saved IANA time zone, then a device zone, then `Europe/Berlin`. Marketing consent is not collected and cannot be stored as true. Turning a transport off does not remove the Inbox item.

At the first delivery, push plus one external fallback are scheduled. A later reminder can use the held channel. High priority does not skip quiet hours.
