# Dashboard payment (product: billing)

## Approved nodes

| Role | Node | Size |
|---|---|---|
| Desktop | `102:5410` | 1440×1024 |
| Body | `102:5437` | 1440×793 |
| Main | `102:5473` | 1000×673 |
| Mobile | `102:5630` | 390×1800 |

Screenshots: `dashboard-payment-desktop.png`, `dashboard-payment-mobile.png` — SUCCESS.

## Layout

Language B CRM shell. Visual checkout/plan actions only — no card-on-file manager in MCP tree names.

## Route / code

`/[lang]/specialist/dashboard/billing` → `PlanCheckoutButton.tsx`. Success/cancel query params.

## Preserve

Stripe Checkout for plans + promoted access; webhook fulfillment; do **not** invent payment-method vault, invoices list, or client payments.

## Mock-only

Any stored-card UI if present in the screenshot — treat as decorative unless code already has it (it does not).

## Risk

**HIGH.**
