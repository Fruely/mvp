# Specialist public profile

## Approved nodes

| Variant | Desktop | Mobile | Size D / M |
|---|---|---|---|
| Local | `102:3483` | `102:3987` | 1440×3200 / 390×3267 |
| Online | `102:3697` | `102:4166` | 1440×2168 / 390×2349 |

Earlier generic `102:507` (1440×1522) is **NEEDS_REVIEW**.

Screenshots: `specialist-profile-desktop.png`, `specialist-profile-online-desktop.png`, `specialist-profile-mobile.png` — SUCCESS.

## Layout — EXACT_MCP_DATA (metadata)

Local desktop children:

- `102:3484` global-header 1440×80
- `102:3501` hero-container 1440×492
- `102:3529` body-container 1440×2245
- `102:3657` global-footer 1440×383

Online desktop: hero 492, body 1213, footer 383.

DS specialist block (`102:6511`) documents: identity hero, FIRST 50 badge, category, city, format, language pills, bio, dual CTAs, price display, avatar upload (editor — not public).

Exact auto-layout numbers for the 3200px frame were not fully dumped via `get_design_context` (size). Treat screenshot + child IDs as source; tokens from chosen language.

## Route / code

`/[lang]/specialist/[id]` → `SpecialistProfileClient.tsx`, `LeadForm`, `MobileStickyCTA`, `SpecialistDocumentsLightbox`.

## Preserve

Public Supabase profile; slug/id; JSON-LD; lead API; format/geography; documents; install prompt.

## Mock-only

Reviews/stars (“Отзывов пока нет”, “Оставить отзыв”); invented prices; static Irina/Kassel copy; FIRST 50 unless real flag.

## Risk

**HIGH.** Two format variants. Footer height 383 vs 298. Language B identity block vs Language A page chrome.
