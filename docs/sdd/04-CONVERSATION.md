# Freuly Conversation and Access Contract

**Status:** Canonical

## 1. Purpose

Conversation exists to let the connected client and specialist agree quickly and continue the service relationship.

Freuly chat is not intended to replace every external business tool.

## 2. Gate

Target paid-access invariant:

```text
no valid entitlement
→ no finalized paid connection
→ no paid-flow conversation
```

Conversation is created by authoritative connection finalization, not by a mobile write to the conversation table.

Legacy paths may have different historical gates; do not silently weaken or broaden them while building the new paid service-request path.

## 3. Ownership

One service request has at most one active conversation.

Participants are:
- the request client;
- the selected specialist.

Authorization is server/RLS-owned. The client must not be able to read another request's transcript by knowing an id.

## 4. Current message capabilities

Implemented core message kinds/capabilities include:

- text;
- audio/voice;
- one-time location;
- image;
- server system messages.

Private media remains behind signed/private access rather than public storage exposure.

## 5. Privacy

Do not automatically expose client email, phone, Telegram or other private contacts merely because a match exists.

Participants may voluntarily send contact details, links or external meeting/payment information in chat.

Push notifications must not contain private transcript content by default.

## 6. Product simplicity

Freuly should support the minimum communication primitives required to move from connection to real work.

Examples:
- send a photo;
- send a voice message;
- send a location;
- send a Zoom/Meet link;
- agree on time;
- exchange an invoice or payment instruction if the parties choose.

Do not add a Freuly-native calendar, video stack, final-service checkout, route planner or CRM without a separate approved product requirement.

## 7. Push and transcript

Push is a delivery signal and deep link.

The conversation database is the record.

Missing/delayed push must not lose a persisted message. Duplicate push must not duplicate a message.

## 8. Compatibility

Message DTO evolution is additive by default.

Do not change the meaning of an existing `kind` for older Native binaries. A new message type requires:
- backend support;
- safe old-client behavior;
- Native mapping;
- push/deep-link impact review;
- contract tests.
