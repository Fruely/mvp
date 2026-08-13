import Link from "next/link";
import { onboardingProgressNavClass } from "./onboardingStyles";

export type OnboardingStepKey = "welcome" | "basic" | "about" | "services" | "photo" | "review";

export const ONBOARDING_STEP_ORDER: OnboardingStepKey[] = [
  "welcome",
  "basic",
  "about",
  "services",
  "photo",
  "review",
];

export type OnboardingStep = {
  key: OnboardingStepKey;
  label: string;
  href: string;
};

export default function OnboardingProgress({
  steps,
  activeStep,
}: {
  steps: OnboardingStep[];
  activeStep: OnboardingStepKey;
}) {
  const activeIndex = ONBOARDING_STEP_ORDER.indexOf(activeStep);

  return (
    <nav className={onboardingProgressNavClass} aria-label="Onboarding progress">
      <ol className="grid gap-freuly-2 sm:grid-cols-2 lg:grid-cols-6">
        {steps.map((step, index) => {
          const isActive = step.key === activeStep;
          const isPast = activeIndex >= 0 && index < activeIndex;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`flex h-full min-h-[2.75rem] items-center gap-freuly-2 rounded-freuly-md px-freuly-3 py-freuly-2 text-freuly-body-sm font-medium transition ${
                  isActive
                    ? "bg-freuly-primary-light text-freuly-primary ring-1 ring-freuly-primary/20"
                    : isPast
                      ? "text-freuly-primary hover:bg-freuly-primary-light/60"
                      : "text-freuly-text-secondary hover:bg-freuly-border-subtle hover:text-freuly-text-primary"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-freuly-primary text-freuly-text-on-primary"
                      : isPast
                        ? "bg-freuly-primary-light text-freuly-primary"
                        : "bg-freuly-border-subtle text-freuly-text-muted"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">{step.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
