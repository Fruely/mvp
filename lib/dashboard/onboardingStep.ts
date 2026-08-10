import type { PublicationValidationResult } from "./publicationValidator";

export type RequiredOnboardingStep = "basic" | "services" | "review";

/**
 * Resolves the first incomplete required onboarding step from the canonical
 * publication validator result. Optional recommendations never affect resume.
 */
export function getFirstIncompleteOnboardingStep(
  validation: Pick<PublicationValidationResult, "blocking">,
): RequiredOnboardingStep {
  if (validation.blocking.some((issue) => issue.step === "basic")) {
    return "basic";
  }

  if (validation.blocking.some((issue) => issue.step === "services")) {
    return "services";
  }

  return "review";
}
