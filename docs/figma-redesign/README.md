# Freuly redesign — local Figma handoff snapshot

This directory is a **durable, MCP-derived design handoff** for the Freuly UI redesign on branch `ui/freuly-redesign`. It exists so future implementation work can proceed when the Figma MCP connection is temporarily unavailable.

**Figma file:** [Untitled (`xWsx2qKg5VWquqwsrmwyMT`)](https://www.figma.com/design/xWsx2qKg5VWquqwsrmwyMT/Untitled)

## Snapshot status

| Field | Value |
|---|---|
| Branch | `ui/freuly-redesign` |
| Base commit | `c9069f1d37d1750cd8377364303c7dfb0024d0dc` |
| Snapshot date | 2026-08-13 |
| Status | **PARTIAL** — see limitations below |

### What is captured

Live Figma MCP data (2026-08-13 session) for:

- **`dashboard-restyled`** (`102:1623`) — full desktop frame tree, typography, colors, spacing
- **`global-header`** (`102:1624`) — embedded in dashboard frame; specs captured
- **`global-footer`** (`102:1780`) — embedded in dashboard frame; specs captured; **implemented** in `components/Footer.jsx` at commit `c9069f1`
- Shared visual tokens aligned in `styles/tokens.css` from the same MCP session

### What is NOT captured (requires live MCP)

- **File-level canvas inventory** — top-level pages, duplicate frames, Variant A/B boards, reference screenshots, obsolete variants, mobile breakpoints, and standalone public/marketplace frames were **not enumerated** because the Figma MCP server (`user-figma`) was in error state during snapshot creation (`mcp_auth` timed out; tool discovery failed).
- Figma **variables** (`get_variable_defs` returned `{}` on inspected nodes)
- **Code Connect** mappings (plan limitation)
- **Standalone** design-system boards (if they exist outside `102:1623`)
- **Mobile** variants for any screen
- MCP **screenshot asset URLs** (7-day expiry; not stored here)

Re-run inventory when MCP is healthy:

```text
get_metadata(fileKey: xWsx2qKg5VWquqwsrmwyMT)          # no nodeId — list all pages
get_metadata(fileKey: ..., nodeId: <page-id>)           # per-page frame list
get_design_context(fileKey: ..., nodeId: <frame-id>)    # APPROVED_TARGET + DESIGN_SYSTEM
get_variable_defs(fileKey: ..., nodeId: <frame-id>)
get_screenshot(fileKey: ..., nodeId: <frame-id>)
```

Update `frame-manifest.json` and re-commit.

## Files in this snapshot

| File | Purpose |
|---|---|
| [`frame-manifest.json`](./frame-manifest.json) | Machine-readable frame inventory + classifications |
| [`implementation-map.md`](./implementation-map.md) | Approved targets → Freuly routes/components + risk |
| [`design-spec.md`](./design-spec.md) | Shared colors, type, spacing, component geometry from MCP |

## How Cursor sessions should use this

1. **Start here** before opening Figma MCP for redesign work on `ui/freuly-redesign`.
2. Read `implementation-map.md` to find the canonical route/component for a screen.
3. Read `design-spec.md` for tokens and recurring patterns (buttons, cards, badges, header/footer).
4. Use `frame-manifest.json` to resolve node IDs and classifications programmatically.
5. **Do not treat** `REFERENCE_SCREENSHOT`, `DUPLICATE`, or `OBSOLETE_OR_INTERMEDIATE` entries as implementation targets (none inventoried yet — pending full file scan).
6. **Prefer live MCP** when available to validate geometry before large visual patches.
7. **Functional source of truth** remains the codebase (routes, i18n keys, billing/onboarding logic). Figma English strings are mock copy only.
8. Label any value not directly from MCP as **inference** in PR descriptions.

## Classification legend

| Classification | Meaning |
|---|---|
| `APPROVED_TARGET` | Intended production redesign frame |
| `DESIGN_SYSTEM` | Tokens, primitives, or reusable chrome |
| `REFERENCE_SCREENSHOT` | Production screenshot for comparison only |
| `DUPLICATE` | Generated/copy frame; not canonical |
| `OBSOLETE_OR_INTERMEDIATE` | Superseded exploration |
| `NEEDS_REVIEW` | Exists in product scope but no confirmed Figma target yet |

## Related implementation (already on branch)

| Area | Commit | Notes |
|---|---|---|
| Design tokens + UI primitives | `bfe195d`, `a040b97` | `styles/tokens.css`, `components/ui/*` |
| Dashboard shell + sidebar | `a72479e` | `DashboardShell`, `Sidebar` |
| Dashboard overview fidelity | `bb37524`, `f151de8` | Node `102:1623` main content |
| Global footer | `c9069f1` | Node `102:1780` |

## Data provenance

All **exact** hex, px, and node IDs in this snapshot come from Figma MCP tools used in-session:

- `get_design_context`
- `get_metadata`
- `get_variable_defs`
- `get_screenshot`
- `get_code_connect_map` (unavailable on current plan)

No authentication tokens or secrets are stored in this directory.
