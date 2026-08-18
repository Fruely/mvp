# Change Impact Checklist

## Cross-client producer contracts

When a Web API/backend change is required by **Freuly Native** (or another Freuly client):

- record the producer commit and branch in the change PR/description;
- note affected endpoint and expected contract behaviour;
- do not treat the change as production-complete for Native until deployed to Native’s target environment.

Canonical consumer-side tracking lives in `Fruely/freuly-native` → `RELEASE_STRATEGY.md` (*Current unresolved release dependencies*).

**Open producer contract (2026-08-18):** branch `feat/billing-gated-contact-unlock` — specialist lead contact unlock is billing-gated (`active`/`grace` allowed, `inactive` rejected with `403 CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN`). Capabilities DTO adds `plan_status`, `billing_access_state`, `grace_until`, `can_unlock_contacts`. Native must consume these after producer merge/deploy; do not infer entitlement from Stripe or plan labels.

**Open producer contract (2026-08):** commit `57e76d3` on branch `fix/filters-child-categories-only` — `GET /api/filters` must return child specialization categories only (`parent_id` set), excluding slug `other`. Required by Native Search until integrated and smoke-tested.

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
