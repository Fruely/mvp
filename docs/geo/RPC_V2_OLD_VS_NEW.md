# `search_specialists_local_radius` — old vs new (v2)

| Aspect | Production (old) | v2 (new, not applied) |
|--------|------------------|------------------------|
| signature | `p_ref_lat, p_ref_lng, p_radius_km, p_lang, p_category_id, p_mode, p_offset, p_limit` | **same** |
| defaults | lang/category/mode null; offset 0; limit 20 | **same** |
| return columns (order) | id, name, postal_code, lat, lng, work_format, category_id, languages, is_pro, rating, distance | **same** (no new columns) |
| language | plpgsql | **same** |
| security | SECURITY INVOKER | **same** |
| owner | postgres | **same** |
| grants EXECUTE | PUBLIC, anon, authenticated, service_role | **same** |
| volatility | VOLATILE | **same** |
| proconfig / search_path | null | **same** (not set) |
| active/visible | `is_active` + `is_visible` | **same** |
| coords | lat/lng NOT NULL | NOT NULL **and** NOT (0,0) |
| work_format | any (when `p_mode` null) | offline + hybrid only for null/`local` |
| p_mode null | all formats (incl. online) | offline + hybrid |
| p_mode offline | equality (probe was empty) | offline only |
| p_mode hybrid | equality (probe was empty) | hybrid only |
| p_mode local | empty in probe | offline + hybrid |
| p_mode online | online rows | **empty set** (no exception) |
| p_mode unknown | (legacy) | **empty set** (no exception) |
| user radius | `distance_km <= p_radius_km` | **same** |
| specialist radius | none | `distance_km <= service_radius_km` |
| radius allowlist | none | `service_radius_km IN (5,10,25,50,100)` |
| null/invalid radius | included if in geo radius | **excluded** |
| category | optional `category_id` | **same** |
| languages | optional `@>` array contains | **same** |
| status / published_at | none | **none** (not added) |
| ranking | distance ASC, is_pro DESC, rating DESC NULLS LAST | **same** + `s.id ASC` tie-breaker |
| pagination | offset/limit | **same** defaults; normalize neg offset→0, null limit→20, limit≤0→0 rows; **no upper cap** |
| distance_km | production helper | **same helper, unchanged**; computed once via LATERAL |
| output `service_radius_km` | not present | **not present** |
