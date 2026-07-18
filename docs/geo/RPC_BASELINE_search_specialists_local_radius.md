# Baseline: `public.search_specialists_local_radius`

Captured 2026-07-18 from production via PostgREST OpenAPI + live RPC probes.

**Full `pg_get_functiondef` was NOT available** (no direct Postgres URL in agent env).  
Use `supabase/manual_checks/2026-07-18_geo_rpc_baseline_diagnostics.sql` to dump the definition before applying v2.

## Observed signature (OpenAPI)

Required args:

- `p_ref_lat` double precision
- `p_ref_lng` double precision
- `p_radius_km` double precision

Optional args:

- `p_lang` text
- `p_category_id` uuid
- `p_mode` text
- `p_offset` integer
- `p_limit` integer

## Observed return columns (live call)

| column | sample |
|--------|--------|
| `id` | uuid |
| `name` | text |
| `category_id` | uuid |
| `languages` | text[] |
| `work_format` | text |
| `postal_code` | text |
| `lat` | float |
| `lng` | float |
| `distance` | float (km) |
| `rating` | null/number |
| `is_pro` | boolean |

## Observed `p_mode` behaviour (Bonn ref, radius 25 km)

| `p_mode` | result |
|----------|--------|
| `null` | offline **and** online rows (online pollutes local) |
| `'online'` | online only |
| `'offline'` | empty (unexpected given offline rows exist at `null`) |
| `'hybrid'` | empty |
| `'local'` | empty |

App currently always passes `p_mode: null` (`lib/search/specialistSearch.ts`).

## Progressive radius

Progressive `10 → 30 → 50 → 100` is **application-side**, not inside the RPC.

## Notes for v2

- Must exclude pure `online` from local results.
- Must enforce `distance <= p_radius_km` **and** `distance <= specialist.service_radius_km` for offline/hybrid.
- Must keep return shape compatible (`distance` + specialist fields used by search).
- Apply only after dumping baseline with diagnostics SQL.

## Migration status (2026-07-18)

- **Blocked for apply:** full `pg_get_functiondef` was not retrieved.
- Prepared (not applied): `supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql`
- Diagnostics (not applied): `supabase/manual_checks/2026-07-18_geo_rpc_baseline_diagnostics.sql`
- App-side dual-radius + online exclusion is already enforced in `lib/search/specialistSearch.ts` without applying the DB migration.
