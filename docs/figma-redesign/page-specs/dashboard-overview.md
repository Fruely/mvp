# Dashboard overview

## Approved nodes

| Role | Node | Size |
|---|---|---|
| Canonical | `102:1623` dashboard-restyled | 1440×1900 @ 8940,-988 |
| Header | `102:1624` | 1440×80 |
| Body | `102:1636` | 1440×1460 |
| Sidebar | `102:1637` | 240 × fill |
| Main | `102:1678` | fill, p 48, gap 32 |
| Footer | `102:1780` | 1440×298 |
| Older same-name | `33:7` | 1500×1940 — OBSOLETE |
| Real screenshots | `102:1618` | REFERENCE_SCREENSHOT |

**No mobile overview.** Screenshot: `dashboard-overview-desktop.png` — SUCCESS.  
`get_design_context` + `get_variable_defs` this run.

## Layout — EXACT_MCP_DATA

bg `#F8F7F5`. Column: header + row(sidebar + main) + footer.

Main stack: page-header (28 Bold + 15 muted gap 6) → profile-status-card → split-cards-row (subscription flex + requests 420) → profile-views-card → improvements-card.

Cards: white, 1px `#E6E4DF`, r 10, p 24, gap 20.  
Buttons: primary `#107B80` r 6 px 16 py 10; secondary white; strong `#1E1E1E`; outline primary.  
Badges: warning/success pills r 99 px 10 py 4 12 SemiBold.

Full tree and hexes: prior snapshot + this run’s `get_design_context` on `102:1623`. See `design-spec.md` Language A.

## Route / code

`/[lang]/specialist/dashboard` → `dashboard/page.tsx` + `DashboardShell`. Partial visual match at `bb37524`.

## Preserve

Real status/plan/leads/views; publish readiness; verification/PWA banners; i18n; locked nav.

## Mock-only

“Published (awaiting review)”, “Starter”, “Early free access”, zeros, English rec rows.

## Risk

**LOW** for Language A continuation. **HIGH** if switching the page to CRM Language B (no B overview frame).
