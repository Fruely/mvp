import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import OnboardingChecklist, { type OnboardingChecklistItem } from "./OnboardingChecklist";
import OnboardingProgress, { type OnboardingStep, type OnboardingStepKey } from "./OnboardingProgress";
import OnboardingStepShell from "./OnboardingStepShell";

const STEPS: OnboardingStepKey[] = ["welcome", "basic", "about", "services", "photo", "review"];

export default function SpecialistOnboardingWizard({
  dict,
  lang,
  activeStep,
  profileStarted,
  publishReady,
  isUncategorizedCategory,
  checklistItems,
}: {
  dict: Dictionary;
  lang: string;
  activeStep: OnboardingStepKey;
  profileStarted: boolean;
  publishReady: boolean;
  isUncategorizedCategory: boolean;
  checklistItems: OnboardingChecklistItem[];
}) {
  const baseHref = `/${lang}/specialist/dashboard/onboarding`;
  const dashboardHref = `/${lang}/specialist/dashboard`;
  const steps: OnboardingStep[] = STEPS.map((step) => ({
    key: step,
    label: t(dict, `dashboard.onboarding.steps.${step}`),
    href: step === "welcome" ? baseHref : `${baseHref}?step=${step}`,
  }));

  const activeStepLabel = t(dict, `dashboard.onboarding.steps.${activeStep}`);

  return (
    <div className="space-y-6">
      <OnboardingStepShell
        title={t(dict, "dashboard.onboarding.welcome.title")}
        body={t(dict, "dashboard.onboarding.welcome.body")}
        footer={
          <>
            <Link
              href={`${baseHref}?step=basic`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {profileStarted
                ? t(dict, "dashboard.onboarding.cta.continue")
                : t(dict, "dashboard.onboarding.cta.start")}
            </Link>
            <Link
              href={dashboardHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t(dict, "dashboard.onboarding.cta.dashboard")}
            </Link>
          </>
        }
      >
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            publishReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {publishReady
            ? t(dict, "dashboard.onboarding.publishReady")
            : t(dict, "dashboard.onboarding.publishNotReady")}
        </div>
        {isUncategorizedCategory ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t(dict, "dashboard.onboarding.uncategorizedWarning")}
          </div>
        ) : null}
      </OnboardingStepShell>

      <OnboardingProgress steps={steps} activeStep={activeStep} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <OnboardingStepShell
          title={activeStepLabel}
          body={t(dict, "dashboard.onboarding.placeholder.body")}
        >
          <p className="text-sm text-gray-600">{t(dict, "dashboard.onboarding.placeholder.next")}</p>
        </OnboardingStepShell>

        <OnboardingChecklist
          title={t(dict, "dashboard.onboarding.checklist.title")}
          publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
          recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
          items={checklistItems}
        />
      </div>
    </div>
  );
}
