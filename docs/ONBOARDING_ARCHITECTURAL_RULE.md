# Specialist Onboarding Architectural Rule

This document is the architectural contract for the specialist profile
publication flow. Changes that conflict with it must not be merged.

## Canonical runtime

- Route entry: `app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx`
- Wizard: `components/dashboard/onboarding/SpecialistOnboardingWizard.tsx`
- Required-step resolver: `lib/dashboard/onboardingStep.ts`
- Publication rules: `lib/dashboard/publicationValidator.ts`
- Publication endpoint: `POST /api/specialist/dashboard/publish`

There must be one specialist onboarding wizard, one required-step resolver, and
one publication validator. Alternate, legacy, feature-flagged, or duplicated
onboarding runtime paths are prohibited.

## Persisted-data resume

The first required onboarding step is derived from current persisted profile
data through the canonical publication validator:

1. Any blocking `basic` issue resolves to `basic`.
2. Complete basic requirements with a blocking service issue resolves to
   `services`.
3. No blocking issue resolves to `review`.

Client-only progress, browser storage, and a default `welcome` redirect must not
be used as the resume source of truth.

## Required and optional content

Only `PublicationValidationResult.blocking` controls publication readiness.
`about`, `photo`, and `gallery` are recommendations and must remain skippable.
They must not affect the required-step resolver or disable publication.

## Guided behavior

- Every active step exposes one obvious primary action.
- Missing service state explicitly asks for at least one valid service:
  a positive numeric price, or a supported pricing exception plus a
  non-empty price explanation.
- The onboarding services editor opens the form immediately and returns to the
  next wizard step after a valid service is saved.
- A publish-ready review shows the Publish action before long reference content.
- A successful publish redirects immediately to the specialist dashboard.
- A published specialist visiting onboarding is redirected server-side to the
  dashboard.

## Dependency boundaries

Canonical onboarding code must not import obsolete onboarding UI, legacy
helpers, alternate actions, or duplicate publication-readiness logic. Reusable
business rules belong in neutral `lib/` modules.

The CI-compatible tests in
`lib/dashboard/onboardingArchitecture.logic.test.mjs` and
`lib/dashboard/publicationValidator.logic.test.mjs` enforce this contract.
