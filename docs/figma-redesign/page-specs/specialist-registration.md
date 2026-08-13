# Specialist registration

## Approved nodes

| Role | Node | Size | Notes |
|---|---|---|---|
| Canonical | `102:2199` registration-restyled | 1440×1800 @ 22200,-988 | Canvas label: Variant B — Restyled Registration |
| Header | `102:2200` | 1440×80 | |
| Offer banner | `102:2212` | 1440×131 | |
| Form | `102:2223` | 1440×1129 | |
| Footer | `102:2270` | 1440×298 | |
| Earlier page | `102:951` | 1440×1445 | NEEDS_REVIEW |
| Real screenshots | `102:2195` | 1440×2160 | REFERENCE_SCREENSHOT |

**No mobile.** Screenshot: `specialist-registration-desktop.png` — SUCCESS.

## Layout — EXACT_MCP_DATA (metadata + texts)

Fields in `102:2223`: First name, Last name, Email, Phone, Password, independent-activity checkbox, Gewerbeschein disclaimer, AGB, specialist rules, Privacy, first-50 note, “Create account and go to dashboard”, sign-in link.

Use Language A chrome (this frame sits with the restyled set) unless human chooses B. Input geometry from DS `102:6149` if implementing under B.

## Route / code

`/[lang]/become-specialist` → `SpecialistQuickRegisterForm` or `SpecialistApplicationForm` via `featureFlags.newSpecialistFunnel`.

## Preserve

Flag switch; legal checkboxes; no extra verification docs at register; redirect to dashboard/onboarding.

## Mock-only

Static Anna Müller; English-only banner unless it is the real first-50 offer.

## Risk

**MEDIUM.** No mobile Figma.
