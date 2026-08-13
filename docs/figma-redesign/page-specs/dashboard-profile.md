# Dashboard profile

## Approved nodes

| Role | Node | Size |
|---|---|---|
| Board | `102:4332` canvas | 1950×3667 |
| Desktop | `102:4333` desktop-dashboard | 1440×3587 |
| Mobile | `102:4650` mobile-dashboard | 390×2618 |
| Header | `102:4334` | 1440×80 |
| Breadcrumb | `102:4351` | 1440×81 |
| Body | `102:4360` | 1440×3426 |
| Sidebar | `102:4361` crm-sidebar | 240×419 |
| Form | `102:4396` main-form-flow | 1000×3306 |

Screenshots: `dashboard-profile-desktop.png`, `dashboard-profile-mobile.png` — SUCCESS.

## Layout — EXACT_MCP_DATA (metadata)

Desktop form sections (1000 wide):

- `102:4397` verification-recommendation 221
- `102:4416` profile-completion 203
- `102:4456` section-basic-info 625
- `102:4533` section-languages 121
- `102:4555` section-avatar 303
- `102:4563` section-description 246
- `102:4569` section-video 264
- `102:4586` section-gallery 294
- `102:4604` section-documents 329
- `102:4621` section-services-summary 139
- `102:4627` save-publish-strip 123
- `102:4637` help-support-desktop 86

Mobile `102:4672`: verification, completion, basic-info, languages, avatar, description, video, gallery, save-publish, support — 358 wide cards.

Breadcrumb texts: “Кабинет специалиста”, “Артур Ніскубін”, “АН”, “Выйти”.

This page uses **Language B / CRM shell**, not the warm overview shell.

## Route / code

`/[lang]/specialist/dashboard/profile` → `SpecialistDashboardEditor.tsx`.

## Preserve

Entitlements; verification; all real profile fields; publish/save distinction; no new About/Photo routes.

## Mock-only

“FREULY CRM”; static name/avatar; Telegram/WhatsApp support widgets unless product already has those links.

## Risk

**HIGH.** Long form. Shell conflict with overview.
