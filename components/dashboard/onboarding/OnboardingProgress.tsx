import Link from "next/link";

export type OnboardingStepKey = "welcome" | "basic" | "about" | "services" | "photo" | "review";

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
  return (
    <nav className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-label="Onboarding progress">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {steps.map((step, index) => {
          const isActive = step.key === activeStep;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`flex h-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index + 1}
                </span>
                <span>{step.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
