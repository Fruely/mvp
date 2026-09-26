# Deterministic request matching

Confirmed `service_requests` are matched to published specialists without a model call.
The result is stored in `service_request_matches` and shown in the specialist dashboard
at `/{lang}/specialist/dashboard/requests/matched`.

This is separate from the public demand drum and from the existing paid promotion inbox
at `/requests/for-you`. Those projections are unchanged.

## Three language fields

- `locale` is the interface language.
- The text's source language stays on the intent extraction and is not a match filter.
- `service_languages` is the explicit requirement. An empty array matches any specialist language.

`ua` and `uk` canonicalize to `uk`. Other well-formed language codes compare as themselves,
so adding a language is data, not a matcher change.

## Geography limit

Offline and on-site hybrid requests match by the same city or the same postal code.
Requests do not store coordinates, so a kilometre radius is not calculated.

## Apply before deploy

Migrations are manual and are not applied by the app.

1. `supabase/manual_migrations/2026-09-26_service_request_matches.sql`
2. `supabase/manual_migrations/2026-09-26_freuly_inbox_delivery.sql`

The second file refuses to run until `service_request_matches` exists. It adds the response
timestamps, Freuly Inbox, the delivery outbox and specialist `notification_locale`.

A new match writes one inbox item. Telegram and email only signal that item. Native push is
a contract and is skipped until a device transport exists. Opening the match and
interested/declined are the product events. The first response wins and stops reminders.
