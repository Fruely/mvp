# Shared footer

## Approved nodes

| Node | Context | Size |
|---|---|---|
| `102:1780` | dashboard-restyled — canonical prior impl | 1440×298 |
| `102:245` | homepage | 1440×298–347 |
| `102:916` | component-library | 1440×347 |
| `102:3657` | later profile | 1440×383 |

Implemented in `components/Footer.jsx` at `c9069f1` from `102:1780`.

## Geometry — EXACT_MCP_DATA `102:1780`

bg `#1E1E1E`. pt 56 pb 48 px 64. Logo 28 `#107B80` r 6 + 18 Bold white. Blurb 14 Regular 1.6 `#A3A3A3`. 3 columns, title 12 SemiBold uppercase `#A3A3A3`, links 14 Medium white gap 12. Bottom 13 `#6B6B6B`, link gap 24, language selector.

Height **conflicts** 298 vs 347 vs 383 — NEEDS_REVIEW if later pages should grow the footer.

## Route / code

`Footer.jsx`, `FooterLanguageSwitcher.tsx`, `[lang]/layout.tsx`.

## Preserve

Legal routes; cookie settings; map columns to existing routes only; UA/RU/DE via `freuly_lang`.

## Mock-only

Careers, Success Stories, Trust & Safety, Resources, “Freuly Technologies AB”, “English (Europe)”.

## Risk

**LOW** for Language A. Revisit if Language B restyles footer (no B footer spec on foundations board).
