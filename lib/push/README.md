# Push transport

Freuly Inbox remains the record of an event. Push only opens that event.

The deployed site is a PWA without Web Push. The Expo app lives in a separate repository. This adapter speaks the Expo push HTTP API and sends when the recipient has an enabled device. `EXPO_PUSH_ACCESS_TOKEN` is optional. When it is set, the request includes `Authorization: Bearer` with the trimmed token. Expo requires that token only when Enhanced Push Security is enabled. Android delivery uses FCM V1 credentials configured in Expo/EAS; those credentials are separate from this access token. A missing, empty, or whitespace access token does not by itself turn push off and does not add an `Authorization` header. Without a registered device the push row is skipped and email or Telegram continue.

Anonymous requests are not push recipients. They keep email.

The Expo data payload carries the event, entity, HTTPS path, locale, Inbox item id and conversation id when one exists. It does not carry the push token, message text, or contact details. `GET /api/inbox/unread` returns the authoritative unread count for the signed-in user. `connection_ready` opens the client conversation path. A user `conversation_message` notifies only the other participant through Inbox and push. The client path is `/{locale}/requests/{publicId}/conversation`. The specialist path is `/{locale}/specialist/dashboard/conversations/{conversationId}`. Email and Telegram are not used for that event.

## Defaults

Service notifications start enabled for push, email and Telegram. Quiet hours use the saved IANA time zone, then a device zone, then `Europe/Berlin`. Marketing consent is not collected and cannot be stored as true. Turning a transport off does not remove the Inbox item.

At the first delivery, push plus one external fallback are scheduled. A later reminder can use the held channel. Match and reminder delivery still waits for quiet hours. A `conversation_message` push does not: it is attempted immediately, and the phone's own Focus or Do Not Disturb decides whether it is shown. Text, audio, and a one-time location share that same event. The push does not include the message text, the audio, a transcript, or the coordinates. Audio files live in the private `conversation-media` bucket and are played through a short-lived signed URL. There is no transcription and no realtime location.
