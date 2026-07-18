# Geo audit counts snapshot (read-only PostgREST, 2026-07-18)

Source: production via service-role REST (no writes).  
Filter: `is_active` + `is_visible` + status ∈ published_unverified | featured_verified | approved | paused.

| Metric | Count |
|--------|------:|
| total_published_like | 44 |
| missing_country | 0 |
| missing_plz | 17 |
| missing_city (`specialist_profiles.city`) | 22 |
| missing_coords | 18 |
| zero_coords (0,0) | 0 |
| bad_or_missing_radius offline/hybrid | 16 |
| plz_without_city | 6 |
| DE coords outside loose bbox | 0 |
| online_with_coords | 8 |
| offline_hybrid_complete (full new invariant) | 3 |

## Bonn control (PLZ 53115) — before code deploy / before backfill

Anonymous offline published-like profile with:

| Field | Value |
|-------|-------|
| postal_code | `53115` |
| specialist_profiles.city | `null` |
| lat/lng | present |
| service_radius_km | `null` |
| work_format | `offline` |

Legacy rows were **not** hidden, unpublished, deleted, or auto-filled.
