# Search wizard

## Approved nodes

| Step | Desktop | Mobile | Size D / M |
|---|---|---|---|
| Service | `102:2312` | `102:2507` | 1440×800 / 390×844 |
| Language | `102:2348` | `102:2548` | 1440×800 / 390×844 |
| Format | `102:2390` | `102:2595` | 1440×800 / 390×844 |
| Location | `102:2431` | `102:2641` | 1440×800 / 390×844 |
| Radius | `102:2467` | `102:2682` | 1440×800 / 390×844 |

Duplicates: `51:*` series at same positions.

Screenshot: `search-wizard-desktop.png` (1440×800), `search-wizard-mobile.png` (390×844) — SUCCESS.

Reference screenshots `102:2306` are **not** targets.

## Layout — EXACT_MCP_DATA (`get_design_context` `102:2312`)

bg `#F8F7F5`, column.

- **Header `102:2313`:** h 80, white, border-b `#E6E4DF`, px 64. Logo 32 `#107B80` r 6 + dark wordmark 20. Right: lang chip + Sign In 15. No full marketing nav.
- **main-content `102:2324`:** flex-1, center, gap 20, pb 40.
- **wizard-card `102:2325`:** w 560, white, 1px `#E6E4DF`, r 16, p 40, gap 24, shadow `0 4px 12px rgba(0,0,0,0.05)`.
  - Step label 13 SemiBold `#6B6B6B` “Step 1 of 5”.
  - 5 dots 8×8, gap 8.
  - Title 28 Bold `#1E1E1E`.
  - Label 14 SemiBold. Input 1.5px `#E6E4DF` r 8 px 16 py 12, 16px icon, placeholder 15 `#9B9B9B`.
  - Primary full-width `#107B80` r 8 px 24 py 14, 16 SemiBold white.
- Footer extra 14 muted + teal SemiBold category links.

Mobile: same card stacked in 390 artboard (screenshot persisted). Exact mobile padding not separately queried — **INFERENCE:** follow DS model 3 (stacked inputs) + 390 header.

## Route / code

`/[lang]/service-search` → `ServiceSearchFlow.tsx`. Results go to `/specialists`, not a new route.

## Preserve

Five-step order; format/location/radius branching; existing redirects and analytics.

## Mock-only

English strings; “Popular categories” unless mapped to real slugs.

## Risk

**MEDIUM.** Desktop+mobile pairs exist. Language A geometry is complete for step 1; steps 2–5 have metadata + screenshots-not-all-persisted (re-fetch `get_screenshot` if implementing those steps visually).
