# Request service / lead states

## Approved nodes

| Role | Node | Size | Viewport |
|---|---|---|---|
| Desktop both states | `102:3883` | 1440×1285 | desktop |
| Form | `102:3900` state-expanded | 616×609 | desktop |
| Success | `102:3927` state-success | 616×646 | desktop |
| Mobile success | `102:4300` | 390×844 | mobile |

Screenshots: `request-service-desktop.png` (1440×1285), `request-success-mobile.png` (390×844) — SUCCESS.

## Layout — EXACT_MCP_DATA

`102:3883`: header 80 + `states-main` 822 + footer 383. Two cards side by side.

Form texts: “Быстрая заявка”, name/email/phone/message, helper copy, “Отправить запрос”.  
Success: “Ваша заявка отправлена!”, specialist name, echoed name/service.

DS success card `102:6473`: 48 circle `#ECFDF5`, title 18 Bold, body 13 `#64748B`, outline teal button.

Mobile `102:4300`: header 62 + success-content 478.

## Route / code

Two real surfaces share this visual:

1. `/[lang]/request-service` → `ServiceRequestForm.tsx`
2. Profile `LeadForm.tsx`

`/[lang]/request/[public_token]` has **no** Figma frame — keep current attribution UI.

## Preserve

Separate lead vs service-request APIs; query params; noindex; do not add appointments.

## Mock-only

Static Екатерина / Ирина / Шугаринг copy.

## Risk

**MEDIUM.** Map one visual to two forms without inventing a new route.
