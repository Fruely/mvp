# Dashboard subscription

## Approved nodes

| Role | Node | Size |
|---|---|---|
| Desktop | `102:5248` | 1440×1342 |
| Body | `102:5275` | 1440×1179 |
| Main | `102:5311` | 1000×1059 |
| Mobile | `102:5513` | 390×1600 |

Screenshots: `dashboard-subscription-desktop.png`, `dashboard-subscription-mobile.png` — SUCCESS.

## Layout

Language B CRM shell. DS offer card `102:6411`: 2px `#0D9488`, r 16, p 32, “Freuly Professional”, BEST VALUE pill, **29 € / месяц**, connect CTA.

**Do not hardcode 29 €.** Live plan names/prices come from billing config.

Grace banner `102:6426` is a visual for real grace state.

## Route / code

`/[lang]/specialist/dashboard/subscription`. Status/grace/expiry; support mailto. **No Stripe customer portal** on this page.

## Preserve

`specialist_plan` lifecycle; grace SQL; commercial plan labels from code.

## Mock-only

“29 €”, “BEST VALUE”, “AGB и Импрессум включены” as static marketing unless already in locale.

## Risk

**HIGH.**
