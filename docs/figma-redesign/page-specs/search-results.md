# Search results

## Approved nodes

| State | Desktop | Mobile | Size D |
|---|---|---|---|
| Online | `102:2729` | `102:3258` | 1440×1400 |
| Nearby | `102:2881` | `102:3355` | 1440×1400 |
| Empty | `102:2989` | `102:3429` | 1440×800 |
| Category grid | `102:3035` | **none** | 1440×1902 |

Earlier generic `102:280` (1440×1280) is **NEEDS_REVIEW**.

Screenshot: `search-results-desktop.png` (1440×1400), `search-results-mobile.png` (390×985) — SUCCESS.

## Layout — EXACT_MCP_DATA (metadata + texts under `102:2752`)

`102:2729` children: header 80 + main 949 + footer 298.

Main copy evidence: “Back to search”, “Specialists”, “6 results for language "ru" (online).”, “Work online”, specialist cards with name, category, bio, PLZ, Online, lang pills, “Send request”, “View profile →”.

**INFERENCE from sibling frames:** nearby uses geo/radius; empty is a zero-results state; category-grid is closer to `/[lang]/category/[slug]` than `/specialists`.

Geometry not fully expanded via `get_design_context` on this node (timeout risk on 1400-tall frame). Use screenshot + metadata. Card/button tokens from Language A homepage/wizard unless implementing under Language B.

## Route / code

**Actual UI:** `/specialists` → `app/specialists/page.tsx`.  
`/[lang]/search` redirects. Category pages: `app/[lang]/category/[slug]/page.tsx`.

## Preserve

Search params; `lib/search/specialistSearch.ts`; zero-results events; online fallback; `ServiceRequestCtaBlock`; do not add client chat.

## Mock-only

Hardcoded “6 results”; static psychologist bios; English chrome.

## Risk

**HIGH.** Data-heavy. `102:280` vs later family needs human confirmation if any unique filter-header from `102:303` should survive.
