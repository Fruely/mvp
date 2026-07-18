# `search_specialists_local_radius` — old vs new (v2)

| Aspect | Production (old) | v2 (new, not applied) |
|--------|------------------|------------------------|
| signature | `p_ref_lat, p_ref_lng, p_radius_km, p_lang, p_category_id, p_mode, p_offset, p_limit` | **same** |
| defaults | lang/category/mode null; offset 0; limit 20 | **same** |
| return columns (order) | id, name, postal_code, lat, lng, work_format, category_id, languages, is_pro, rating, distance | **same** (no new columns) |
| projection `is_pro` | `s.is_pro` | **same** (`s.is_pro`) |
| projection `rating` | `s.rating` | **same** (`s.rating`) |
| rating joins | none | **none** |
| language | plpgsql | **same** |
| security | SECURITY INVOKER | **same** |
| owner | postgres | **same** |
| grants EXECUTE | PUBLIC, anon, authenticated, service_role | **same** |
| volatility | VOLATILE | **same** |
| proconfig / search_path | null | **same** (not set) |
| active/visible | `is_active` + `is_visible` | **same** |
| coords | lat/lng NOT NULL | NOT NULL; ∈[-90,90]/[-180,180]; NOT (0,0); invalid ref → empty; NaN dist excluded |
| work_format | any (when `p_mode` null) | offline + hybrid only for null/`local` |
| p_mode null | all formats (incl. online) | offline + hybrid |
| p_mode offline | equality | offline only |
| p_mode hybrid | equality | hybrid only |
| p_mode local | (legacy) | offline + hybrid |
| p_mode online | online rows | **empty set** (no exception) |
| p_mode unknown | (legacy) | **empty set** (no exception) |
| user radius | `distance_km <= p_radius_km` | **same** |
| specialist radius | none | `distance_km <= service_radius_km` |
| radius allowlist | none | `service_radius_km IN (5,10,25,50,100)` |
| null/invalid radius | included if in geo radius | **excluded** |
| category | optional `category_id` | **same** |
| languages | optional `@>` array contains | **same** |
| status / published_at | none | **none** (not added) |
| ranking | distance ASC, `s.is_pro` DESC, `s.rating` DESC NULLS LAST | **same** + `s.id ASC` tie-breaker |
| pagination | `OFFSET COALESCE(offset,0)` / `LIMIT COALESCE(limit,20)` (neg OFFSET errors) | defaults same; v2 clamps neg offset→0; null limit→20; limit≤0→0 rows; **no upper cap** |
| distance_km | production helper | **same helper, unchanged**; LATERAL column `d.dist` (planner may still inline IMMUTABLE body) |
| output `service_radius_km` | not present | **not present** |

## Note on app UI fields

Public cards / home / recommended often use `specialists.is_featured` and `specialist_rating_stats.rating_avg`. Those are **separate** from this RPC. v2 must not remap RPC projection to those fields.
