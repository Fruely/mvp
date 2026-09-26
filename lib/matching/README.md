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

`supabase/manual_migrations/2026-09-26_service_request_matches.sql` is manual.
The create path writes `service_languages` and the matcher writes `service_request_matches`.
Apply that migration before this code runs against a database.
