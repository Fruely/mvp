# Dashboard requests (product: leads)

## Approved nodes

| Role | Node | Size |
|---|---|---|
| Desktop | `102:5070` | 1520×1080 (artboard wider than 1440) |
| Inner | `102:5071` desktop-dashboard | 1440×1000 @ 40,40 |
| Mobile | `102:5187` | 470×924 |

Screenshots: `dashboard-requests-desktop.png`, `dashboard-requests-mobile.png` — SUCCESS.

## Layout

Language B CRM shell. DS request card `102:6394`: title “Новая заявка”, NEW pill, id/time, message, muted note, full-width “Связаться с клиентом”.

## Route / code

**`/[lang]/specialist/dashboard/leads`** — not `/dashboard/requests`.  
Only real `/requests/*` page is `/dashboard/requests/promoted` (no Figma).

## Preserve

`LeadsTable`; subscription banner; `contactUnlock.ts` redaction; real lead records.

## Mock-only

Static IDs/times; unlocked contact if product still redacts.

## Risk

**MEDIUM.**
