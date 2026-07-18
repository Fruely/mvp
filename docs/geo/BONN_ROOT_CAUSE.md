# Bonn case (PLZ 53115) — corrected root cause

Anonymous production control profile (offline, published-like) with:

| Field | Value |
|-------|--------|
| `specialists.postal_code` | `53115` |
| `specialists.lat/lng` | present (Nominatim-class Bonn coords) |
| `specialist_profiles.city` | **null** |
| `specialists.service_radius_km` | null |

## Preview flow (what could show “Bonn”)

### A) Historical client autofill (removed before mid-2026)

Commit `0f2a1c1` (2026-03-05) auto-filled `form.city` from **Zippopotam** (`api.zippopotam.us/de/{plz}` → `places[0]["place name"]` = Bonn).  
Removed in `4690cd2` (2026-03-19). Later published profiles did **not** use that autofill.

### B) Likely “preview” after Zippopotam removal

Commit `5f31844` adds **OpenStreetMap map preview** on the public specialist page when coords exist. After PLZ save, Nominatim wrote **only lat/lng**; map tiles around those coordinates visually label **Bonn**, without reading `specialist_profiles.city`.

Dashboard editor at that time:

- showed free-text `form.city` (manual);
- **no** PLZ→city client resolver;
- save payload included `city` only if the field was non-empty.

Onboarding basic form sends PLZ **without** `city`.

### C) Server geocode at save (pre-fix)

`geocodePlz()` called Nominatim **without** `addressdetails` and persisted **only** `lat`/`lng`. City was never derived server-side.

## Public card flow

| Surface | Location source |
|---------|-----------------|
| Category / home cards | `specialist_profiles.city` via list/recommended APIs |
| `/specialists` search cards | mostly `postal_code` (shows PLZ, not city name) |
| Public profile text | `specialist_profiles.city` |

No PLZ→city mapping on the card. Empty persisted city ⇒ no “Bonn” text.

## Classification

| Layer | Bug? |
|-------|------|
| Persistence | **Yes** — city never written to `specialist_profiles.city` on PLZ geocode |
| API select/join for cards | No — city is selected; value is null |
| DTO mapping | No |
| Component rendering | No — correctly hides empty city |
| Preview vs card payloads | **Different** — map preview uses coords; cards use persisted city |

## Corrected root cause (precise)

```text
PLZ 53115 успешно геокодировался на сервере в lat/lng (Nominatim без city).
Название «Bonn» могло быть видно в OSM map preview (по координатам) и/или
в устаревшем Zippopotam-autofill form.city (до 2026-03-19), но каноническое
поле specialist_profiles.city не заполнялось. Публичные карточки читают
только persisted city → Bonn на карточке отсутствовал.
```

Not: «город никогда не вычислялся».  
Yes: «город не персистился в каноническое поле, от которого зависят карточки и city search».

## Fix direction

- Single resolver: `resolveGermanPostalLocation` (postal_codes + Nominatim addressdetails + cities canonicalize).
- Dashboard preview: `GET /api/specialist/resolve-postal` (same resolver).
- Save writes `specialist_profiles.city` and returns `geography` for form reload.
- Cards: `getPublicSpecialistLocation` from persisted city.
