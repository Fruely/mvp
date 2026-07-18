# Manual deployment: `search_specialists_local_radius` v2

**Do not apply until the owner chooses a legacy-radius rollout option (section Risk).**  
Agent must not execute these SQL files against Supabase.

## Checkpoint commits

| Item | Hash |
|------|------|
| Geo app code | `abc62090fbd6d10310de34334b5d2be32984e007` |
| RPC production-contract package | `13c0df1ec0d8c5e78e178a51c439e11520cc07d0` |
| Projection correction (`s.is_pro` / `s.rating`) | `e2a9f27ec1f2dbfbcbbd656ce731104c6c481360` |

## Files

| Role | Path |
|------|------|
| Migration (apply once) | `supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql` |
| Rollback | `supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql` |
| Pre-apply (read-only) | `supabase/manual-checks/2026-07-18_search_specialists_local_radius_v2_preapply.sql` |
| Post-apply (read-only) | `supabase/manual-checks/2026-07-18_search_specialists_local_radius_v2_postapply.sql` |
| Rollback verify (read-only) | `supabase/manual-checks/2026-07-18_search_specialists_local_radius_v2_rollback_verify.sql` |
| Old vs new | `docs/geo/RPC_V2_OLD_VS_NEW.md` |

## Execution order

### A. Pre-apply (read-only)

Run `…_preapply.sql` in Supabase SQL Editor.  
Save full result sets (especially `pg_get_functiondef`, grants, legacy ID list, control-point counts).

### B. Archive results

Store outputs outside the DB (ticket / secure note).  
Record `functiondef_md5` for RPC and `distance_km`.

### C. Apply migration (only if baseline matches)

Baseline blockers (do **not** apply if any fail):

1. Exactly one `public.search_specialists_local_radius` overload.
2. Identity args match production contract.
3. Definition projects `s.is_pro` and `s.rating` (not `is_featured` / `rating_avg`).
4. `public.distance_km` exists.
5. Columns exist: `specialists.is_pro`, `rating`, `service_radius_km`, `work_format`, `lat`, `lng`.
6. **Option 2 complete:** zero missing/invalid `service_radius_km` among affected
   active+visible offline/hybrid (or documented exclusions only) — **required**.

Then run the migration file once. **Not before.**

### D. Post-apply verification (immediate)

Run `…_postapply.sql`.  
Expect: SECURITY INVOKER, owner postgres, grants, `s.is_pro`/`s.rating`, no online in null/local mode, dual-radius holds, ranking stable, pagination pages disjoint.

### E. Application smoke

1. Local/PLZ search near Bonn / Berlin (app passes `p_mode: null`).
2. Confirm pure online specialists are absent from local radius results.
3. Confirm hybrid with allowlisted radius can still appear.
4. Confirm specialists with `service_radius_km` null do **not** appear (expected after v2).

### F. Critical failure → rollback

Run `supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql`.

### G. Verify rollback

Run `…_rollback_verify.sql`.  
Confirm old `p_mode` equality restored, no allowlist filter, no `s.id` tie-breaker, projection still `s.is_pro`/`s.rating`.

---

## p_mode semantics (v2, case-sensitive)

| `p_mode` | Result |
|----------|--------|
| `NULL` | offline + hybrid |
| `'local'` | offline + hybrid |
| `'offline'` | offline only |
| `'hybrid'` | hybrid only |
| `'online'` | empty set |
| unknown / mixed case (`'Online'`, `'LOCAL'`) | empty set |

No `lower()` normalization.

## Pagination (v2)

| Input | Behavior |
|-------|----------|
| `p_offset` NULL | 0 |
| `p_offset` negative | 0 |
| `p_limit` NULL | 20 |
| `p_limit` ≤ 0 | 0 rows |
| large `p_limit` | **no upper cap** |

Production used `OFFSET COALESCE(p_offset,0)` / `LIMIT COALESCE(p_limit,20)` without negative clamping.

## Coordinate / distance guards (v2)

- Specialist: NOT NULL; lat ∈ [-90,90]; lng ∈ [-180,180]; not `(0,0)`.
- Reference: same; invalid → empty set.
- `d.dist IS NOT NULL AND d.dist = d.dist` excludes NaN from `acos` drift.
- **`public.distance_km` is not modified** (no acos clamp in this migration).

## LATERAL note

`CROSS JOIN LATERAL (SELECT distance_km(...) AS dist)` exposes one column `d.dist` reused in SELECT/WHERE/ORDER BY, avoiding three written call sites.  
PostgreSQL may still **inline** the IMMUTABLE SQL body of `distance_km`; do not treat LATERAL as a hard guarantee of a single physical evaluation. No `MATERIALIZED` CTE was added.

## Main rollout risk — legacy radius

Audit snapshot (2026-07-18, PostgREST, published-like statuses):  
**`bad_or_missing_radius` offline/hybrid = 16**.

Pre-apply query #7 (active+visible, no status filter) may differ slightly — **use the live ID list from pre-apply as source of truth**.

After v2, those profiles **disappear from local radius search** until they have `service_radius_km ∈ {5,10,25,50,100}`.  
Migration does **not** backfill or alter specialist rows.  
Do **not** unpublish specialists as part of this remediation.

### Chosen legacy strategy: Option 2 → controlled one-shot backfill

```text
Chosen legacy strategy: Option 2.
RPC v2 must not be applied until every currently published offline/hybrid
specialist affected by missing or invalid service_radius_km has either:
1. selected and saved an allowed radius;
2. been manually confirmed by the owner/admin from reliable source data;
3. or been explicitly excluded from the rollout by a documented product decision.
No radius may be inferred or assigned automatically.
```

Owner follow-up (after remediation report): apply the **controlled one-shot**
file that backfills only the 16 reported IDs, then installs RPC v2 in the same
transaction:

- Apply (manual, one Run):  
  `supabase/manual_migrations/2026-07-18_geo_legacy_backfill_and_rpc_v2.sql`
- RPC-only rollback (does **not** undo backfill data):  
  `supabase/manual-rollbacks/2026-07-18_geo_legacy_backfill_and_rpc_v2.sql`

- **No** compatibility fallback for null/invalid radius.  
- **No** wide automatic radius assignment outside the locked 16-ID mapping.  
- Do not unpublish specialists as part of remediation.

### Other options (not chosen)

1. Apply v2 and temporarily lose legacy profiles in local search.  
3. Temporary compatibility fallback for null radius (separate migration — not this package).  
4. Limited manual backfill from confirmed data (separate, owner-approved).

## Acceptable legacy counts

- Non-zero missing/invalid radius is expected **today** while Option 2 remediation runs.  
- **Apply blocker:** pre-apply query #7 must show `missing_radius = 0` and `radius_outside_allowlist = 0` for active+visible offline/hybrid (or every remaining ID has a documented product exclusion).  
- Unknown `work_format` values (outside online/offline/hybrid) should be investigated if count > 0.  
- Multiple overloads of the RPC name = hard blocker.

## Application note

App already post-filters dual-radius / online in `lib/search/specialistSearch.ts`.  
Applying v2 moves enforcement into the DB; app hydration of `service_radius_km` remains needed for UI, not for RPC output (RPC still does not return `service_radius_km`).
