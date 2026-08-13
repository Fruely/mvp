# Shared header

## Approved / competing nodes

| Node | Frame | Size | Language |
|---|---|---|---|
| `102:1624` | inside dashboard-restyled | 1440×80 | A white |
| `102:10` | inside homepage | 1440×80 | A dark `#1E1E1E` |
| `102:2313` | inside wizard | 1440×80 | A white, reduced nav |
| `102:6267` | DS public-header | 1200×80 | B, px 40, r 12 |
| `102:6351` | DS mobile-header | 390 | B |

**NEEDS_REVIEW:** which header is site-wide canonical.

## Geometry — EXACT_MCP_DATA

### `102:1624` (used in prior snapshot)

h 80, white, border-b `#E6E4DF`, px 64. Logo 32 `#107B80` r 6 + 20 Bold `#1E1E1E`. Nav 15 Medium `#6B6B6B`, active SemiBold `#107B80`, gap 24. CTA `#107B80` r 6 px 16 py 10 14 SemiBold white. Items: Pricing, Partners, Specialist cabinet, Join Freuly.

### `102:10` homepage

Same height/padding; **bg `#1E1E1E`**; white type; nav Home / Find a Specialist / How it Works / For Specialists; EN chip; Sign In; Get Started.

### `102:6267` DS

h 80, white, px 40, r 12, w 1200, shadow `0 4px 6px rgba(0,0,0,0.03)`. Mark `#0D9488` r 8. Wordmark FREULY ExtraBold 20 tracking -0.5. Nav 13 SemiBold. Lang UA/RU/DE in `#FAF9F6` chip. CTA px 20 py 10 r 8.

### `102:6351` mobile

px 20 py 16 r 12. Mark 28 r 6. Wordmark 16 Bold. DE chip + 18 hamburger.

## Route / code

`components/Header.tsx` via `app/[lang]/layout.tsx`. Also used on legal/marketing pages.

## Preserve

Real nav targets; i18n keys; mobile collapse already in Header; langs ua/ru/de (not EN as a route).

## Mock-only

“How it Works” / “Careers”; EN as a supported locale.

## Risk

**HIGH** until one variant is chosen. Blast radius: every `[lang]` page.
