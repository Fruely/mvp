# Deterministic request matching

Confirmed `service_requests` are matched to published specialists without a model call.
The result is stored in `service_request_matches` and shown in the specialist dashboard
at `/{lang}/specialist/dashboard/requests/matched`. Native reads the same rows through
`GET /api/specialist/matches` and `GET /api/specialist/matches/{matchId}`. Those reads
return demand fields only and do not change match status. Taking an offer is a
separate `POST /api/specialist/matches/{matchId}/claim`. It does not change who
was matched.

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
3. `supabase/manual_migrations/2026-09-26_client_selection.sql`
4. `supabase/manual_migrations/2026-09-26_native_push_notifications.sql`
5. `supabase/manual_migrations/2026-09-28_native_installations.sql`

The second file refuses to run until `service_request_matches` exists. It adds the response
timestamps, Freuly Inbox, the delivery outbox and specialist `notification_locale`.
The third file refuses to run until both earlier tables exist. It adds client return tokens,
selection timestamps, conversation rows and allows an inbox item to belong to a request
when the client has no account.

The fourth file refuses to run until Inbox, the outbox and conversations exist. It stores
authenticated device endpoints and service-notification preferences. Anonymous requests stay
on email. Push is an Expo transport over the existing outbox. `EXPO_PUSH_ACCESS_TOKEN` is
optional and is required only when Expo Enhanced Push Security is enabled. FCM V1
credentials are a separate Android delivery configuration in Expo/EAS. A missing access
token does not by itself skip push. Without a registered device the push row is skipped
and Telegram or email still run.

A new match writes one inbox item. Opening the match and interested/declined are the product
events. The first response wins and stops reminders.

## Live-market participation

A published profile is not enough to receive a new live match. `matchConfirmedServiceRequest`
keeps the existing category, language, work-format and location rules, and also requires
an active `native_installations` row for `specialists.user_id`.

One `installation_id` has one current `user_id`. Signing in on that installation reassigns
the same row. Logout sets `active=false` on that installation only. Another active
installation for the same account is enough. Push permission, push preference, email and
Telegram do not decide participation. `push_endpoints` remains delivery data. Invalidating
an Expo token does not deactivate the installation.

`last_seen_at` is refreshed by the authenticated app. This MVP does not expire a row by
age. Uninstall without logout can leave `active=true` until a later policy. Existing
`service_request_matches` rows are not rewritten or deleted when this rule is applied.
The public catalog and specialist search do not read `native_installations`.

## Activation

`SERVICE_REQUEST_MATCHING_ENABLED` is a server-only flag. It defaults to off when the
variable is absent or any value other than `true`. It is not `NEXT_PUBLIC_*` and it is
not `SERVICE_INTENT_EXTRACTION_ENABLED`. Either flag can be on while the other is off.

The flag is read only in `matchAfterServiceRequestCreated`. The public create route and
the agent create route both call that function after a new row exists. Conversational
intake does not write `service_requests`; it submits through the same create route.
There is no separate admin insert. An idempotent replay returns before the flag and
does not match again. Turning the flag on does not scan older requests.

While the flag is off, request creation still succeeds. Matching is a normal skip,
logged as `matching_skipped` with `reason=feature_disabled` and the internal request id.
No match row, Inbox `match_available` item or matching outbox row is written.

`/api/cron/match-delivery` does not read the flag. It schedules reminders only for matches
that already exist and delivers the outbox that already exists, including client selection
and conversation mail. It does not invent matches. Push stays on notification preferences
and registered endpoints. `EXPO_PUSH_ACCESS_TOKEN` is optional and is not required unless
Expo Enhanced Push Security is enabled. FCM V1 credentials remain an Expo/EAS Android
setting, separate from that token.

Before the first production rollout, compare the live catalog with
`supabase/manual_migrations/2026-09-26_matching_inbox_push.preflight.sql`.
After the four migrations, run
`supabase/manual_migrations/2026-09-26_matching_inbox_push.verify.sql`.
Neither file changes the database.

### Staged rollout

Stage A, database. `SERVICE_REQUEST_MATCHING_ENABLED` stays false.

1. Take a backup or checkpoint.
2. Run the preflight SQL.
3. Compare it with the four migration assumptions.
4. Apply migration 1 and review it.
5. Apply migration 2 and review it.
6. Apply migration 3 and review it.
7. Apply migration 4.
8. Run the full post-migration SQL.

Stage B, application.

9. Deploy this release candidate.
10. Smoke the existing Freuly flows.
11. Create one ordinary controlled request.
12. Confirm the request exists and no automatic match was written.

Stage C, matching canary.

13. Set `SERVICE_REQUEST_MATCHING_ENABLED=true` and reload the environment.
14. Create one controlled request.
15. Confirm only the expected match rows, Inbox items and outbox rows.
16. Confirm logs contain no contact details.
17. Confirm cron delivers that existing outbox and does not invent extra matches.
18. Confirm the specialist response, the client selection and the conversation.

Stage D, push.

19. Leave `EXPO_PUSH_ACCESS_TOKEN` unset unless Expo Enhanced Push Security is enabled.
    FCM V1 credentials for Android stay in Expo/EAS and are not this token. A missing
    access token does not turn push off.
20. Use a physical development or EAS build.
21. Register one authenticated specialist device.
22. Create one controlled request and confirm provider acceptance, the device
    notification, tap, badge, response, selection and conversation.
23. Log out and confirm the endpoint is disabled.

### Emergency stop

Stop new matching by setting `SERVICE_REQUEST_MATCHING_ENABLED=false` and reloading the
environment. Requests continue to be created. Matches already stored are left in place.
Removing `EXPO_PUSH_ACCESS_TOKEN` does not stop push. The token is optional, and delivery
continues without it unless Expo Enhanced Push Security is enabled. FCM V1 credentials
stay in Expo/EAS. Do not delete tables, historical matches or outbox rows.
