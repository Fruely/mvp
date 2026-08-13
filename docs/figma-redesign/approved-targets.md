# Approved redesign targets

Canonical series: **`102:*`**. All values below are **EXACT_MCP_DATA** unless marked INFERENCE.

## PUBLIC / MARKETPLACE

| Family | Desktop | Mobile | Size (desktop) | Route |
|---|---|---|---|---|
| Homepage | `102:9` homepage | **none** | 1440×2549 | `/[lang]` |
| Search wizard | `102:2312` service, `102:2348` language, `102:2390` format, `102:2431` location, `102:2467` radius | `102:2507` / `102:2548` / `102:2595` / `102:2641` / `102:2682` | 1440×800 / 390×844 | `/[lang]/service-search` |
| Search results | `102:2729` online, `102:2881` nearby, `102:2989` empty, `102:3035` category-grid | `102:3258` / `102:3355` / `102:3429` (no mobile for category-grid) | 1440×1400 / 390×985 | `/specialists` (not `/[lang]/search` — that redirects) |
| Specialist profile | `102:3483` local, `102:3697` online | `102:3987` / `102:4166` | 1440×3200 / 390×3267 | `/[lang]/specialist/[id]` |
| Request service | `102:3883` desktop-request-states | `102:4300` mobile-success-state | 1440×1285 / 390×844 | `/[lang]/request-service` + profile `LeadForm` |

## SPECIALIST ACQUISITION

| Family | Desktop | Mobile | Size | Route |
|---|---|---|---|---|
| Registration | `102:2199` registration-restyled (Variant B) | **none** | 1440×1800 | `/[lang]/become-specialist` |
| Onboarding Basic | `102:1817` | **none** | 1440×1417 | `/[lang]/specialist/dashboard/onboarding` |
| Onboarding Services | `102:1921` | **none** | 1440×1024 | same, services step |
| Onboarding Review | `102:1986` | **none** | 1440×1277 | same, review step |
| Onboarding recommendations | `102:2088` | **none** | 1440×1300 | checklist on review (not a new route) |
| Onboarding publish states | `102:2165` | **none** | 1440×1200 | publish gate |

Optional About / Photo / Gallery: **not standalone onboarding frames**. Those sections appear on **dashboard profile** (`102:4333`), which matches the real editor, not extra onboarding routes.

## SPECIALIST DASHBOARD

| Family | Desktop | Mobile | Size | Route |
|---|---|---|---|---|
| Overview | `102:1623` dashboard-restyled | **none** | 1440×1900 | `/[lang]/specialist/dashboard` |
| Profile | `102:4333` (inside `102:4332` canvas) | `102:4650` | 1440×3587 / 390×2618 | `/[lang]/specialist/dashboard/profile` |
| Services | `102:4832` | `102:4966` | 1440×1024 / 390×942 | `…/services` |
| Requests / Leads | `102:5070` | `102:5187` | 1520×1080 / 470×924 | `…/leads` (not `/requests`) |
| Subscription | `102:5248` | `102:5513` | 1440×1342 / 390×1600 | `…/subscription` |
| Payment / Billing | `102:5410` | `102:5630` | 1440×1024 / 390×1800 | `…/billing` |
| Video guide | `102:5692` | `102:5804` | 1440×1417 / 390×1005 | `…/video-guide` |
| Settings | **no Figma frame** | — | — | `…/settings` exists in product |

Shared dashboard chrome:

| Node | Name | Notes |
|---|---|---|
| `102:1624` | global-header (warm) | Inside overview |
| `102:1637` | sidebar (warm) | Inside overview |
| `102:1780` | global-footer (warm) | Inside overview |
| `102:4361` / `102:6292` | crm-sidebar (slate) | Later dashboard pages + DS |

## SHARED / DESIGN SYSTEM

| Node | Name | Size | Role |
|---|---|---|---|
| `102:5864` | freuly-design-system-foundations | 1800×3773 | Color, type, spacing, buttons, forms, badges |
| `102:6251` | freuly-design-system-components | 1800×3395 | Nav, cards, alerts, specialist, dashboard patterns, responsive |
| `102:664` | component-library | 1440×3155 | Earlier library board |
| `102:6267` | public-header | 1200×80 | DS header template |
| `102:6351` | mobile-header | 390 | DS mobile header |
| `102:1624` / `102:1780` | page-embedded header/footer | 1440×80 / 1440×298 | Used on warm-language pages |

## Explicitly not approved

See `frame-manifest.json` for full lists.

- **REFERENCE_SCREENSHOT:** Variant A Current Dashboard (Real) `102:1618`, Variant A Current Registration `102:2195`, Wizard Reference `102:2306`, all `2026-08-12` timestamped captures.
- **DUPLICATE:** 68 non-102 copies at the same canvas position.
- **OBSOLETE:** `102:3` Catalog-Decktop, `102:1160` specialist-dashboard, `102:1379` specialist-dashboard-dense, `33:7` older dashboard-restyled.
- **NEEDS_REVIEW frames:** `102:280` earlier search-results, `102:507` earlier specialist-profile, `102:1078` Variant A hero, `102:1118` Variant B hero, `102:951` earlier registration.

## Mock-only / no real Freuly surface

Do **not** create implementation targets for:

| Figma element | Why |
|---|---|
| “FREULY CRM” sidebar title | Product is specialist cabinet, not a CRM product |
| Footer Careers / Success Stories / Trust & Safety | No matching routes |
| Star reviews / “Оставить отзыв” | No live reviews product |
| Client dashboard / chat / appointments | Stub or absent |
| Payment-method manager | Billing is Stripe checkout only |
| EN language as a live route | Live langs are `ua` / `ru` / `de` |
| Partners / admin / SEO landings | No redesign frames in this file |
