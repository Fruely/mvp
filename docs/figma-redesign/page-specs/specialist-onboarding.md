# Specialist onboarding

## Approved nodes

| Step | Node | Size | Children |
|---|---|---|---|
| Basic | `102:1817` | 1440×1417 | header 80, progress 80, content 1257 |
| Services | `102:1921` | 1440×1024 | header, progress, content 839 |
| Review | `102:1986` | 1440×1277 | header, progress, content 1117 |
| Recommendations | `102:2088` | 1440×1300 | header, progress, content 834 |
| Publish states | `102:2165` | 1440×1200 | header, content 850 (no progress) |

**No mobile.** Screenshot: `specialist-onboarding-basic-desktop.png` — SUCCESS.

## Layout — EXACT_MCP_DATA (texts under `102:1844`)

Progress: “Step 1 of 3”. Basic: name, category, specialization, languages (+ add), work format (Online / In person / Both).

Figma progress is 3 steps. Product wizard also has About / Photo. **Do not delete those steps.** Extra fields are specified on dashboard profile `102:4333`.

## Route / code

`/[lang]/specialist/dashboard/onboarding` → `SpecialistOnboardingWizard.tsx` + step forms.

## Preserve

`getSpecialistOnboardingGateState`, `validatePublication`, `hasValidServiceForPublish`, `?step=` / `?reason=`, geography, photo upload, unpublished path lock.

## Mock-only

English labels; Anna Schmidt; “Legal Services / Immigration Lawyer” as hardcoded defaults.

## Risk

**HIGH.** Multi-step + publish rules. Visual specs complete for Basic via screenshot; other steps need `get_screenshot` if pixel-matching later.
