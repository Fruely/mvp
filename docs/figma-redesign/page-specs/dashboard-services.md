# Dashboard services

## Approved nodes

| Role | Node | Size |
|---|---|---|
| Desktop | `102:4832` | 1440×1024 |
| Mobile | `102:4966` | 390×942 |
| Body | `102:4859` | header 80 + breadcrumb 81 + body 551 |
| Sidebar | `102:4860` crm-sidebar | 240×417 |
| Main | `102:4895` | 1000×431 |

Screenshots: `dashboard-services-desktop.png`, `dashboard-services-mobile.png` — SUCCESS.

## Layout

Language B CRM shell. DS table pattern `102:6623` / row `102:6377`: uppercase 12 headers, name 15 Bold, price 16 `#0D9488`, status pill, edit/disable/delete. Mobile: stacked card (Model 1).

## Route / code

`/[lang]/specialist/dashboard/services` → `ServicesTable`, `ServiceForm`. `?from=onboarding` return.

## Preserve

Publication validation; real service rows; no invented pricing model.

## Mock-only

“Менторинг / 50 € / АКТИВНА”.

## Risk

**MEDIUM.**
