# Change Impact Checklist

## Rule

A new required domain field must **not** be introduced only in a validator or API.

Ship together:

1. **Input UI** — user can enter/confirm the value in the relevant flow
2. **Persistence** — save path writes the field (and clears stale derived values when inputs change)
3. **Review representation** — checklist / review shows the real requirement
4. **Client validation** — same rules as server readiness
5. **Server validation** — publish / save enforce the same codes
6. **Existing data** — migration, backfill, or graceful remount for legacy rows
7. **Critical-path test** — at least one automated test covering the user path

## Before changing geography, publication, categories, services, auth, or payments

Check impact on:

| Area | Questions |
|------|-----------|
| Registration | Can a new specialist complete signup? |
| Onboarding | Are all required fields collectible before publish? |
| Publication | Client readiness ≡ server publish? Structured errors? |
| Dashboard access | Gate still correct for unpublished / published? |
| Editing | Full editor can fix geo / plan / category? |
| Search | Location metadata vs distance eligibility still correct? |
| Existing profiles | Defaults, nulls, legacy radii / categories? |
| API | Authz, payloads, error codes stable? |
| DB constraints | CHECK / NOT NULL / RPC allowlists updated? |
| Localisation | ua / ru / de strings for new fields and errors? |
| Analytics / notify | Publish / geo blocks still accurate? |
| Mobile / PWA | Forms usable; no desktop-only assumptions? |
| E2E / unit tests | Updated for new required fields? |

## Geo / publication (current product model)

- **Location** (all work formats): `country_code`, `postal_code`, `city`, `lat`, `lng`
- **Service area** (`offline` / `hybrid` only): `service_radius_km`
- UI radii: `10 / 30 / 50 / 100` km (`PUBLIC_SERVICE_RADII_KM`); legacy `5 / 25` remain allowed
- Gallery is **recommendation only** — never a publish blocker
- Country scope today: **Germany (DE)** only; do not offer countries the resolver cannot resolve
- Local search RPC allowlist must include any new public radius (see
  `supabase/manual_migrations/2026-07-20_search_specialists_local_radius_v2_1_radius30.sql`)
- Do not conflate **location metadata** (all formats) with **distance eligibility** (offline/hybrid only)

## Review sign-off

When opening a PR that adds a required field, paste a short table:

| Item | Done |
|------|------|
| UI | ☐ |
| Save | ☐ |
| Review | ☐ |
| Client validator | ☐ |
| Server validator | ☐ |
| Legacy data plan | ☐ |
| Tests | ☐ |
