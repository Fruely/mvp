# Figma → Freuly implementation map

Maps **approved** (or partially approved) Figma targets to production routes. Functional behavior and i18n remain codebase-owned.

**Snapshot:** partial — only `102:1623` subtree fully MCP-inspected. See [`frame-manifest.json`](./frame-manifest.json).

Legend: **Risk** = implementation complexity given current code + available specs.

---

## APPROVED targets (MCP-confirmed)

### Specialist Dashboard — Overview

| Figma | Route | Primary files | Status | Risk |
|---|---|---|---|---|
| `102:1623` dashboard-restyled | `/[lang]/specialist/dashboard` | `app/[lang]/specialist/(protected)/dashboard/page.tsx`, `DashboardShell.tsx`, `Sidebar.tsx`, `TopBar.tsx` | Partial (`bb37524`) | **LOW** |

**Preserve (functional):**

- Publication gating / locked sidebar items (`isPublished`)
- Real profile status, subscription plan, leads counts from API
- Onboarding banners, verification flows, install PWA prompts if present
- i18n via `locales/*.json` — not Figma English strings

**Mock-only in Figma (do NOT hardcode):**

- Static badge text "Published (awaiting review)", "Early free access", "Starter"
- Static counts `0` for requests/profile views
- English nav labels (Pricing, Partners, Specialist cabinet, Join Freuly)
- Recommendation row copy (Telegram, gallery, certificates, video)

**Gaps vs Figma (post-`bb37524`):**

- Dashboard uses `TopBar` not embedded `global-header` from frame
- `main` uses responsive `max-w-7xl` + breakpoint padding vs fixed 48px
- Requests card fixed 420px may need explicit width on large screens

---

### Shared — Global header

| Figma | Route | Primary files | Status | Risk |
|---|---|---|---|---|
| `102:1624` global-header (in `102:1623`) | All public pages via `app/[lang]/layout.tsx` | `components/Header.tsx` | Not started | **MEDIUM** |

**Preserve:**

- Existing nav targets: pricing, partners, specialist cabinet, become-specialist
- i18n keys: `header.nav.*`, `header.cabinet`, `header.joinButton`
- Mobile nav behavior (current collapsible row)

**Blast radius:** Every page using `[lang]/layout.tsx`, root `app/page.tsx`, legal layouts that include Header.

**Figma specs:** 80px height, px 64, logo mark 32×32 `#107B80`, wordmark 20px Bold, nav 15px, active link `#107B80`, primary CTA 14px Semibold px 16 py 10 radius 6.

---

### Shared — Global footer

| Figma | Route | Primary files | Status | Risk |
|---|---|---|---|---|
| `102:1780` global-footer | Global | `components/Footer.jsx`, `FooterLanguageSwitcher.tsx` | Implemented (`c9069f1`) | **LOW** |

**Preserve beyond Figma mock:**

- Legal routes: datenschutz, AGB, impressum
- Cookie settings link / consent integration
- Real column links mapped to Freuly routes (not Figma "Careers", "Success Stories" unless routes exist)
- UA/RU/DE language switching (not "English (Europe)" only)

---

### Design system — Sidebar pattern

| Figma | Route | Primary files | Status | Risk |
|---|---|---|---|---|
| `102:1637` sidebar | `/[lang]/specialist/dashboard/*` | `components/dashboard/Sidebar.tsx` | Partial | **LOW** |

**Naming mismatch:** Figma "Requests" → product route `/dashboard/leads`.

**Preserve:** Lock-until-published logic, exact nav order from product (includes onboarding-specific items if any).

---

## UI primitives (code + MCP-derived tokens)

| Pattern | Figma evidence | Code | Status | Risk |
|---|---|---|---|---|
| Button primary/secondary/strong/outline | `102:1623` buttons | `components/ui/Button.tsx` | Aligned | **LOW** |
| Card | card radius 10, p 24 | `components/ui/Card.tsx` | Aligned | **LOW** |
| Badge success/warning | badge nodes in overview | `components/ui/Badge.tsx` | Aligned | **LOW** |
| Tokens | MCP hex from `102:1623` | `styles/tokens.css`, `tailwind.config.js` | Aligned | **LOW** |

---

## NEEDS_REVIEW — expected product screens without inventoried Figma frame

These screens exist in Freuly but **no approved standalone Figma frame ID** is in this snapshot. Do not implement visual redesign until MCP file inventory confirms target node.

### PUBLIC / MARKETPLACE

| Screen | Route | Primary files | Risk (if frame found) |
|---|---|---|---|
| Homepage | `/[lang]` | `HomeClient.tsx`, homepage sections | **HIGH** — many dynamic blocks, site-blocks API |
| Search Wizard | `/[lang]/service-search` | `ServiceSearchFlow.tsx` | **MEDIUM** — multi-step state machine |
| Search Results | `/[lang]/search` | `app/[lang]/search/page.tsx` | **HIGH** — geo/radius logic, filters |
| Specialist Profile | `/[lang]/specialist/[id]` | `SpecialistProfileClient.tsx` | **HIGH** — rich profile data, request CTA |
| Request Service | `/[lang]/request-service` | request flow pages | **MEDIUM** |
| Request token states | `/[lang]/request/[public_token]` | token page | **MEDIUM** |

### SPECIALIST ACQUISITION

| Screen | Route | Primary files | Risk |
|---|---|---|---|
| Specialist registration | `/[lang]/become-specialist` | `SpecialistApplicationForm`, `SpecialistQuickRegisterForm` | **MEDIUM** |
| Specialist onboarding | `/[lang]/specialist/dashboard/onboarding` | `SpecialistOnboardingWizard.tsx` | **HIGH** — multi-step wizard, photo upload |

### SPECIALIST DASHBOARD (sub-pages)

| Screen | Route | Primary files | Risk |
|---|---|---|---|
| Profile editor | `/dashboard/profile` | profile page + forms | **HIGH** |
| Services | `/dashboard/services` | `ServicesTable`, `ServiceForm` | **MEDIUM** |
| Requests/Leads | `/dashboard/leads` | `LeadsTable`, `LeadsChart` | **MEDIUM** |
| Subscription | `/dashboard/subscription` | subscription page + Stripe lifecycle | **HIGH** |
| Payment/Billing | `/dashboard/billing` | billing page | **HIGH** |
| Settings | `/dashboard/settings` | settings page | **LOW** |
| Video Guide | `/dashboard/video-guide` | video-guide page | **LOW** |

### SHARED DESIGN (not inventoried)

| Screen | Notes | Risk |
|---|---|---|
| Design system board | May exist on Figma canvas | **LOW** once tokens confirmed |
| Mobile variants | None captured | **HIGH** — responsive work unknown |

---

## Intentional functional differences (keep)

| Area | Figma shows | Product requires |
|---|---|---|
| Footer links | Marketing labels (Careers, Success Stories) | Map to existing routes only |
| Language | English (Europe) selector | UA/RU/DE + cookie `freuly_lang` |
| Dashboard header | Marketing global-header inside frame | Specialist area uses `TopBar` + separate public Header on marketing pages |
| Requests label | "Requests" | Route and copy may use "Leads" / localized equivalent |
| Payment nav | "Payment" | Billing route `/dashboard/billing` |
| Subscription mock | "Starter", "Early free access" | Live plan status from `specialist_plan` |

---

## Suggested implementation order (after full inventory)

1. Complete MCP file scan → update manifest classifications
2. Global header (`102:1624`) — high visibility, contained component
3. Remaining dashboard sub-pages (once frames confirmed)
4. Public homepage + search (largest blast radius)
5. Specialist profile + request flows
6. Mobile variants per screen
