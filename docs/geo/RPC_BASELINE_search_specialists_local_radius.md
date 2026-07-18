# Baseline: `public.search_specialists_local_radius`

Captured **2026-07-18** from production (full contract + `public.distance_km`).

Baseline label: `2026-07-18_prod_search_local_radius+distance_km`  
Baseline hash (sha256 of canonical contract + `distance_km` body):  
`30084e7337e800663ebfeb53bdf748d45a366e5f7e9ded5caa9c2b357781268d`

## Production signature

```text
public.search_specialists_local_radius(
  p_ref_lat double precision,
  p_ref_lng double precision,
  p_radius_km double precision,
  p_lang text default null,
  p_category_id uuid default null,
  p_mode text default null,
  p_offset integer default 0,
  p_limit integer default 20
)
RETURNS TABLE(
  id uuid,
  name text,
  postal_code text,
  lat double precision,
  lng double precision,
  work_format text,
  category_id uuid,
  languages text[],
  is_pro boolean,
  rating numeric,
  distance double precision
)
```

Security: `LANGUAGE plpgsql`, `SECURITY INVOKER`, owner `postgres`, `VOLATILE`.  
EXECUTE: `PUBLIC`, `anon`, `authenticated`, `service_role`.  
`proconfig`: null (no forced `search_path`).

## Production SELECT projection (pg_get_functiondef)

```sql
SELECT
  s.id,
  s.name,
  s.postal_code,
  s.lat,
  s.lng,
  s.work_format,
  s.category_id,
  s.languages,
  s.is_pro,
  s.rating,
  distance_km(...) AS distance
FROM specialists s
```

`is_pro` and `rating` are **columns on `specialists`**. Not `is_featured`. Not `specialist_rating_stats.rating_avg`.

## Production logic (pre-v2)

- `is_active = true`, `is_visible = true`
- `lat` / `lng` NOT NULL
- `distance_km(ref, specialist) <= p_radius_km`
- optional language / category filters
- `p_mode` NULL → all `work_format` values
- `p_mode = 'online'` → `work_format = 'online'` only
- ORDER BY `distance ASC`, `s.is_pro DESC`, `s.rating DESC NULLS LAST`
- `OFFSET` / `LIMIT` (defaults 0 / 20)

## Dependency: `public.distance_km`

```sql
CREATE OR REPLACE FUNCTION public.distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $function$
  select 6371 * acos(
    cos(radians(lat1)) * cos(radians(lat2)) *
    cos(radians(lng2) - radians(lng1)) +
    sin(radians(lat1)) * sin(radians(lat2))
  );
$function$;
```

Owner `postgres`, SECURITY INVOKER, EXECUTE for PUBLIC / postgres / anon / authenticated / service_role.  
**Do not alter** `distance_km` in the v2 migration.  
Optional follow-up (separate change): clamp `acos` argument to `[-1, 1]` for floating-point edge cases.

Diagnostics (read-only): `supabase/manual-checks/2026-07-18_distance_km_baseline_diagnostics.sql`

## App callers

| File | `p_mode` | Result handling | Expects `service_radius_km` in RPC output? |
|------|----------|-----------------|---------------------------------------------|
| `lib/search/specialistSearch.ts` (`fetchByRadius`) | always `null` | maps rows; hydrates `service_radius_km` from `specialists` table; post-filters dual-radius / online | **No** — hydrates separately |

No other in-repo RPC call sites. Online search uses a separate table query, not this RPC.

## Observed historical `p_mode` probes (Bonn, 25 km)

| `p_mode` | result |
|----------|--------|
| `null` | offline **and** online (online polluted local) |
| `'online'` | online only |
| `'offline'` / `'hybrid'` / `'local'` | empty in probe (legacy quirk) |

## v2 migration (prepared, **not applied**)

- Migration: `supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql`
- Rollback: `supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql`
- Scenario SELECT: `supabase/manual-checks/2026-07-18_search_specialists_local_radius_v2_scenarios.sql`
- App semantics tests: `lib/search/localRadiusRpc.logic.test.mjs`

v2 keeps the production signature / return column order / SECURITY INVOKER / grants.  
Local rules: offline+hybrid (by `p_mode`), dual radius, allowlisted `service_radius_km`, reject `(0,0)`, ranking + `id` tie-breaker.  
`p_mode='online'` → empty set (compatible no-500; does not preserve old online-in-radius behaviour).

## Apply status

**Not applied.** App-side dual-radius + online exclusion already runs in `lib/search/specialistSearch.ts`.
