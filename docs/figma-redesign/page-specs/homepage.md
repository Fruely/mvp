# Homepage

## Approved nodes

| Role | Node | Name | Size | Viewport |
|---|---|---|---|---|
| Canonical desktop | `102:9` | homepage | 1440×2549 @ 1480,-988 | desktop |
| Duplicate overlay | `3:8` | homepage | same x,y | DUPLICATE |
| Header (in page) | `102:10` | global-header | 1440×80 | desktop |
| Footer (in page) | `102:245` | global-footer | 1440×298 | desktop |

**No mobile homepage frame.** Competing hero-only frames `102:1078` (Variant A) and `102:1118` (Variant B) are NEEDS_REVIEW.

Screenshot: `screenshots/homepage-desktop.png` — SUCCESS (904×1600 render of 1440×2549).

## Layout — EXACT_MCP_DATA (`get_design_context` `102:9`)

Column flex, bg `#F8F7F5`.

1. **global-header `102:10`** — h 80, bg `#1E1E1E`, px 64, space-between. Logo 32 `#107B80` r 6 + white wordmark 20 Bold. Nav gap 32, 15px (active SemiBold white). Right: lang chip border `#E6E4DF` r 6 px 12 py 8 + Sign In 15 + CTA `#107B80` r 6 px 16 py 10 14 SemiBold.
2. **hero-section `102:32`** — pt 56 pb 48 px 64, gap 24, center. Title 36 SemiBold 1.2 `#1E1E1E`. Subtitle 15 Regular 1.6 `#6B6B6B`. Search bar h 64, white, 1.5px `#E0DEDA`, r 12, shadow `0 4px 8px rgba(0,0,0,0.06)`, pl 24 pr 8, CTA h 48 px 32 r 10. Trust avatars 28 + 13 muted.
3. **categories-section `102:49`** — 1440×396. Header + 2×3 cards ~421×101, p 16, icon 18.
4. **featured-specialists-section `102:95`** — 1440×695. Cards 310×467, image 310×200.
5. **stories-banner `102:202`** — 1440×362.
6. **promotions-section `102:214`** — 1440×277.
7. **trust-strip `102:232`** — 1440×118.
8. **global-footer `102:245`** — 1440×298 (height conflicts with `102:1780`).

## Typography / colors

Language A. See `design-spec.md`. Header is the **dark** variant — conflicts with white headers elsewhere.

## Route / code

`/[lang]` → `app/[lang]/page.tsx` → `HomeClient.tsx`. Chrome: Header, Footer, LanguageBar, EarlyAccessPromoBanner.

## Preserve

Dynamic site-blocks, category APIs, recommended specialists, i18n, PWA install, map CTA if still in product.

## Mock-only

English marketing nav; EN chip; static specialist names/photos; “How it Works” if no route (product has no dedicated how-it-works page — **do not invent one**).

## Risk

**HIGH.** No mobile Figma. Header variant unresolved.
