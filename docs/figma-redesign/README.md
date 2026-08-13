# Freuly redesign — local Figma handoff library

Durable, **live-MCP-derived** design handoff for the Freuly UI redesign on branch `ui/freuly-redesign`. Future implementation can continue from this directory if Figma MCP disconnects.

**Figma file:** [Untitled (`xWsx2qKg5VWquqwsrmwyMT`)](https://www.figma.com/design/xWsx2qKg5VWquqwsrmwyMT/Untitled)  
**Page:** `0:1` Page 1 (only page in the file)

## Snapshot status

| Field | Value |
|---|---|
| Branch | `ui/freuly-redesign` |
| Extends | `cfff0fd` (partial snapshot: only `102:1623`) |
| Inventory date | 2026-08-13 |
| MCP server | `project-0-freuly-mvp-Figma` (live this run) |
| Status | **COMPLETE canvas inventory** + persisted screenshots + page specs |

### Live MCP proof (this run)

| Call | Result |
|---|---|
| `get_metadata` file `xWsx2qKg5VWquqwsrmwyMT` (no nodeId) | SUCCESS — page `0:1` Page 1 |
| `get_design_context` `102:1623` | SUCCESS — `dashboard-restyled` 1440×1900 |
| `get_metadata` `0:1` | SUCCESS — 153 top-level nodes |
| `get_variable_defs` `102:1623` and `102:5864` | `{}` — no Figma variables |
| `get_design_context` DS sections 1–9 | SUCCESS |
| `get_screenshot` approved targets | SUCCESS — 27 PNGs saved under `screenshots/` |

Do **not** treat this snapshot as cached-from-cfff0fd. Canvas inventory and design-system values were re-queried live.

## How to use

1. Read [`approved-targets.md`](./approved-targets.md) for the implementation target set.
2. Read [`implementation-map.md`](./implementation-map.md) for route/file mapping and what must be preserved.
3. Read [`design-spec.md`](./design-spec.md) for tokens. **Two competing palettes exist — do not silently normalize.**
4. Open the matching file in [`page-specs/`](./page-specs/) before implementing a screen.
5. Use [`frame-manifest.json`](./frame-manifest.json) for node IDs and classifications.
6. Compare against `screenshots/*.png` (local, no MCP required).
7. **Functional source of truth = codebase.** Figma is visual only. English/Russian mock copy is not i18n.

## Files

| Path | Purpose |
|---|---|
| `frame-manifest.json` | Machine-readable inventory + classifications + conflicts |
| `approved-targets.md` | Human list of APPROVED_TARGET + DESIGN_SYSTEM |
| `implementation-map.md` | Figma → route → files → preserve / ignore / risk |
| `design-spec.md` | Shared language + recorded conflicts |
| `page-specs/*.md` | Per-family implementation specs |
| `screenshots/*.png` | Live MCP screenshots persisted this run |

## Classification totals

| Class | Count |
|---|---|
| Meaningful frames inspected | 137 (153 top-level nodes minus 16 text/rect labels) |
| APPROVED_TARGET | 46 |
| DESIGN_SYSTEM | 7 |
| REFERENCE_SCREENSHOT | 16 |
| DUPLICATE | 68 |
| OBSOLETE_OR_INTERMEDIATE | 4 |
| NEEDS_REVIEW | 5 |

Canonical ID series is **`102:*`**. The whole canvas was copied; non-102 frames share the same x,y and name. Prior accepted work used `102:1623`.

## Critical conflicts (human choice required)

Recorded in `design-spec.md` and `frame-manifest.json` `meta.conflicts`:

1. **Palette:** `#107B80` / `#F8F7F5` / `#1E1E1E` (homepage, wizard, dashboard-restyled, current `tokens.css`) vs `#0D9488` / `#FAF9F6` / `#1E293B` (foundations board + later CRM dashboards).
2. **Header:** dark homepage header vs white dashboard-restyled header vs DS public-header with UA/RU/DE.
3. **Dashboard shell:** warm sidebar + site header/footer vs later `crm-sidebar` + breadcrumb strip + “FREULY CRM” label.
4. **Radius:** cards 10 vs 12; buttons 6 vs 8.

## Rules that stay true

- Do not invent chat, client dashboard, appointments, or payment-method vaults.
- Do not invent routes. Figma “Requests” → product `/dashboard/leads`. Figma “Payment” → `/dashboard/billing`.
- Preserve auth, Supabase, subscription/billing lifecycle, onboarding publish gates, i18n (`ua`/`ru`/`de`), real counts, conditional banners.
- Client dashboard at `app/client/(protected)/dashboard` is a stub — no Figma target, do not build.
- Figma variables: **absent**. Code Connect: **unavailable**.
