# Figma → Freuly implementation map

Functional behavior and i18n remain **codebase-owned**. Figma is visual only.

Risk = visual implementation complexity given current code + available specs.

---

## PUBLIC / MARKETPLACE

### Homepage — `102:9`

| | |
|---|---|
| Route | `/[lang]` (`app/[lang]/page.tsx` → `HomeClient.tsx`; `/` uses default `ru`) |
| Shared | `Header.tsx`, `Footer.jsx`, `LanguageBar.tsx`, `EarlyAccessPromoBanner.tsx` |
| Key components | `GermanyMapCTA`, `ServiceSearchFlow`, `FounderBadge`, `SpecialistPreviewCard`, `InstallFreuly` |
| Risk | **HIGH** |
| Screenshot | `screenshots/homepage-desktop.png` |

**Preserve:** i18n; `/api/site-blocks`; `/api/homepage/parent-category-slots`; `/api/homepage/popular-categories`; `/api/recommended-specialists`; `/api/specialists/categories`; PWA install.

**Mock-only:** English nav (Home / How it Works); “Trusted by professionals across Europe”; invented category blurbs; EN language chip; static specialist names.

**No mobile Figma.** Use existing responsive Header/HomeClient. **INFERENCE:** stack sections, keep 390 patterns from DS mobile header.

### Search wizard — `102:2312` family

| | |
|---|---|
| Route | `/[lang]/service-search` |
| Files | `app/[lang]/service-search/page.tsx`, `components/search-flow/ServiceSearchFlow.tsx` |
| Risk | **MEDIUM** |
| Screenshot | `screenshots/search-wizard-desktop.png`, `search-wizard-mobile.png` |

**Preserve:** step machine service → language → format → location/radius; redirect to `/specialists` or category; do not invent a 6th step.

**Mock-only:** English “Step 1 of 5”; popular-category chips if they are not wired to real slugs.

### Search results — `102:2729` family

| | |
|---|---|
| Route | **`/specialists`** — `app/[lang]/search/page.tsx` is redirect-only |
| Files | `app/specialists/page.tsx`, `lib/search/specialistSearch.ts`, `ServiceRequestCtaBlock` |
| Risk | **HIGH** |
| Screenshot | `screenshots/search-results-desktop.png`, `search-results-mobile.png` |

**Preserve:** query params `lang, place, q, category, mode, radius`; zero-results analytics; nearby/online fallback; noindex rules as in code.

**Note:** `102:3035` results-category-grid likely maps to `/[lang]/category/[slug]` (**INFERENCE**). `102:280` earlier search-results is NEEDS_REVIEW.

### Specialist public profile — `102:3483` / `102:3697`

| | |
|---|---|
| Route | `/[lang]/specialist/[id]` |
| Files | `app/[lang]/specialist/[id]/page.tsx`, `SpecialistProfileClient.tsx`, `LeadForm`, `MobileStickyCTA` |
| Risk | **HIGH** |
| Screenshot | `screenshots/specialist-profile-desktop.png`, `specialist-profile-online-desktop.png`, `specialist-profile-mobile.png` |

**Preserve:** Supabase public fetch; slug/id; JSON-LD; lead create API; work format / geography; documents lightbox.

**Mock-only:** reviews/stars; “FREULY FIRST 50” unless the specialist actually has that flag; static Kassel/cosmetologist copy. `102:507` earlier profile is NEEDS_REVIEW.

### Request service — `102:3883`

| | |
|---|---|
| Route | `/[lang]/request-service` and in-profile `LeadForm` (two real surfaces, one Figma board) |
| Files | `ServiceRequestForm.tsx`, `LeadForm.tsx` |
| Risk | **MEDIUM** |
| Screenshot | `screenshots/request-service-desktop.png`, `request-success-mobile.png` |

**Preserve:** `category_id` / `source_path`; lead vs service-request pipelines; noindex; attribution cookie on `/request/[public_token]` (no dedicated Figma for token page).

---

## SPECIALIST ACQUISITION

### Registration — `102:2199`

| | |
|---|---|
| Route | `/[lang]/become-specialist` |
| Files | `SpecialistQuickRegisterForm.tsx` (flag `newSpecialistFunnel`) or `SpecialistApplicationForm.tsx` |
| Risk | **MEDIUM** |
| Screenshot | `screenshots/specialist-registration-desktop.png` |

**Preserve:** feature flag; legal checkboxes (AGB, rules, privacy, independent-activity); no Gewerbeschein requirement copy if present in product; redirect to dashboard.

**Mock-only:** “startup-offer-banner” static English unless it maps to the real first-50 offer. No mobile frame.

### Onboarding — `102:1817` / `1921` / `1986` / `2088` / `2165`

| | |
|---|---|
| Route | `/[lang]/specialist/dashboard/onboarding` |
| Files | `SpecialistOnboardingWizard.tsx`, step forms, `getSpecialistOnboardingGateState`, `validatePublication` |
| Risk | **HIGH** |
| Screenshot | `screenshots/specialist-onboarding-basic-desktop.png` |

**Preserve:** publish gate; `?step=` / `?reason=`; geography validation; allowed pre-publish paths; photo upload; hasValidServiceForPublish.

Figma shows 3 progress steps (Basic / Services / Review). Product also has About / Photo steps — **do not drop them** because Figma omitted standalone frames. Those fields exist on dashboard profile `102:4333`.

No onboarding mobile frames.

---

## SPECIALIST DASHBOARD

All under `app/[lang]/specialist/(protected)/` + `DashboardShell` (`Sidebar`, `TopBar`). Still nested in public `[lang]` layout (Header/Footer remain unless a later change removes them).

| Screen | Figma | Route | Files | Risk | Screenshot |
|---|---|---|---|---|---|
| Overview | `102:1623` | `/dashboard` | `dashboard/page.tsx` | **LOW** (partial `bb37524`) | `dashboard-overview-desktop.png` |
| Profile | `102:4333` / `102:4650` | `/dashboard/profile` | `SpecialistDashboardEditor.tsx` | **HIGH** | `dashboard-profile-*.png` |
| Services | `102:4832` / `102:4966` | `/dashboard/services` | `ServicesTable`, `ServiceForm` | **MEDIUM** | `dashboard-services-*.png` |
| Leads | `102:5070` / `102:5187` | `/dashboard/leads` | `LeadsTable` | **MEDIUM** | `dashboard-requests-*.png` |
| Subscription | `102:5248` / `102:5513` | `/dashboard/subscription` | subscription page | **HIGH** | `dashboard-subscription-*.png` |
| Billing | `102:5410` / `102:5630` | `/dashboard/billing` | `PlanCheckoutButton` | **HIGH** | `dashboard-payment-*.png` |
| Video guide | `102:5692` / `102:5804` | `/dashboard/video-guide` | `videoGuideItems.ts` | **LOW** | `dashboard-video-guide-*.png` |
| Settings | **none** | `/dashboard/settings` | `ChangePasswordForm` | — | — |
| Promoted request | **none** | `/dashboard/requests/promoted` | `PromotedRequestPageView` | — | — |

**Preserve on all dashboard pages:** auth (`getCurrentUserAndSpecialist`); unpublished lock; real plan/leads/views; i18n; Stripe lifecycle; contact redaction (`contactUnlock.ts`); verification banners; PWA prompts.

**Mock-only:** static “Starter” / “Early free access” / counts `0`; “FREULY CRM”; English/Russian chrome instead of locale keys; reviews widgets.

**Shell conflict:** overview uses warm sidebar + marketing header/footer. Later pages use CRM sidebar + breadcrumb. Product currently uses `TopBar` + `Sidebar` inside public Header/Footer. Do not invent a second app shell without a human decision.

---

## SHARED

| Figma | Code | Status | Risk |
|---|---|---|---|
| `102:1624` / `102:10` / `102:6267` headers | `Header.tsx` | Competing variants | **HIGH** until header choice |
| `102:1780` footer | `Footer.jsx` | Implemented `c9069f1` (Language A) | **LOW** |
| `102:1637` / `102:6292` sidebars | `Sidebar.tsx` | Partial Language A | **MEDIUM** |
| DS buttons/inputs/cards/badges/alerts | `components/ui/*` | Aligned to Language A | **MEDIUM** if B is chosen |
| Tokens | `styles/tokens.css` | Language A | **HIGH** if migrating to B |

---

## Real screens with no approved Figma target

Pricing, About, For Specialists, Support, legal, login, partners (+ dashboard/claim/onboarding), admin, specialist claim, PWA `/app` + install, SEO category landings, `/services/...` programmatic SEO, reset/update password, client dashboard stub, dashboard settings, promoted request, request token page.

Do not invent redesigns for these from this file.

---

## Suggested order (after human palette/header decision)

1. Resolve Language A vs B + header variant.
2. Finish global header.
3. Remaining dashboard pages using the chosen shell.
4. Homepage + wizard + results.
5. Public profile + request states.
6. Registration + onboarding.
7. Mobile pass for frames that have 390 counterparts; infer the rest from DS models.
