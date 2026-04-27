import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import OnboardingBasicForm, {
  type OnboardingBasicData,
  type OnboardingCategory,
  type OnboardingPreserveProfileData,
} from "./OnboardingBasicForm";
import OnboardingChecklist, { type OnboardingChecklistItem } from "./OnboardingChecklist";
import OnboardingProgress, {
  ONBOARDING_STEP_ORDER,
  type OnboardingStep,
  type OnboardingStepKey,
} from "./OnboardingProgress";
import OnboardingStepShell from "./OnboardingStepShell";

function stepHref(baseHref: string, step: OnboardingStepKey): string {
  return step === "welcome" ? `${baseHref}?step=welcome` : `${baseHref}?step=${step}`;
}

export default function SpecialistOnboardingWizard({
  dict,
  lang,
  activeStep,
  profileStarted,
  publishReady,
  isUncategorizedCategory,
  checklistItems,
  initialBasicData,
  categories,
  preserveProfileData,
}: {
  dict: Dictionary;
  lang: string;
  activeStep: OnboardingStepKey;
  profileStarted: boolean;
  publishReady: boolean;
  isUncategorizedCategory: boolean;
  checklistItems: OnboardingChecklistItem[];
  initialBasicData: OnboardingBasicData;
  categories: OnboardingCategory[];
  preserveProfileData: OnboardingPreserveProfileData;
}) {
  const baseHref = `/${lang}/specialist/dashboard/onboarding`;
  const dashboardHref = `/${lang}/specialist/dashboard`;
  const servicesHref = `/${lang}/specialist/dashboard/services`;

  const steps: OnboardingStep[] = ONBOARDING_STEP_ORDER.map((step) => ({
    key: step,
    label: t(dict, `dashboard.onboarding.steps.${step}`),
    href: stepHref(baseHref, step),
  }));

  const activeIndex = ONBOARDING_STEP_ORDER.indexOf(activeStep);
  const prevKey = activeIndex > 0 ? ONBOARDING_STEP_ORDER[activeIndex - 1] : null;
  const nextKey =
    activeIndex >= 0 && activeIndex < ONBOARDING_STEP_ORDER.length - 1
      ? ONBOARDING_STEP_ORDER[activeIndex + 1]
      : null;

  const secondaryLinkClass =
    "inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50";
  const primaryLinkClass =
    "inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700";

  const stepNavFooter =
    activeStep !== "welcome" ? (
      <div className="flex flex-wrap items-center gap-3">
        {prevKey ? (
          <Link href={stepHref(baseHref, prevKey)} className={secondaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.back")}
          </Link>
        ) : null}
        <Link href={dashboardHref} className={secondaryLinkClass}>
          {t(dict, "dashboard.onboarding.nav.dashboard")}
        </Link>
        {nextKey ? (
          <Link href={stepHref(baseHref, nextKey)} className={primaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.next")}
          </Link>
        ) : null}
      </div>
    ) : null;

  const welcomeFooter = (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={stepHref(baseHref, "basic")} className={primaryLinkClass}>
        {profileStarted
          ? t(dict, "dashboard.onboarding.cta.continue")
          : t(dict, "dashboard.onboarding.cta.start")}
      </Link>
      <Link href={dashboardHref} className={secondaryLinkClass}>
        {t(dict, "dashboard.onboarding.nav.dashboard")}
      </Link>
    </div>
  );

  const reviewBody = t(dict, "dashboard.onboarding.stepContent.review.body");

  return (
    <div className="space-y-6">
      <OnboardingProgress steps={steps} activeStep={activeStep} />

      {activeStep === "welcome" ? (
        <OnboardingStepShell
          title={t(dict, "dashboard.onboarding.welcome.title")}
          body={t(dict, "dashboard.onboarding.welcome.body")}
          footer={welcomeFooter}
          titleAs="h1"
        >
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              publishReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
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
      ) : null}

      {activeStep === "basic" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <OnboardingBasicForm
            dict={dict}
            lang={lang}
            baseHref={baseHref}
            dashboardHref={dashboardHref}
            initialData={initialBasicData}
            categories={categories}
            preserveProfileData={preserveProfileData}
          />
          <OnboardingChecklist
            title={t(dict, "dashboard.onboarding.checklist.title")}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "about" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <OnboardingStepShell
            title={t(dict, "dashboard.onboarding.stepContent.about.title")}
            body={t(dict, "dashboard.onboarding.stepContent.about.body")}
            footer={stepNavFooter}
            titleAs="h2"
          />
          <OnboardingChecklist
            title={t(dict, "dashboard.onboarding.checklist.title")}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "services" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <OnboardingStepShell
            title={t(dict, "dashboard.onboarding.stepContent.services.title")}
            body={t(dict, "dashboard.onboarding.stepContent.services.body")}
            footer={stepNavFooter}
            titleAs="h2"
          >
            <p className="text-sm">
              <Link href={servicesHref} className="font-medium text-blue-700 underline-offset-2 hover:underline">
                {t(dict, "dashboard.onboarding.stepContent.services.openServicesLink")}
              </Link>
            </p>
          </OnboardingStepShell>
          <OnboardingChecklist
            title={t(dict, "dashboard.onboarding.checklist.title")}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "photo" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <OnboardingStepShell
            title={t(dict, "dashboard.onboarding.stepContent.photo.title")}
            body={t(dict, "dashboard.onboarding.stepContent.photo.body")}
            footer={stepNavFooter}
            titleAs="h2"
          />
          <OnboardingChecklist
            title={t(dict, "dashboard.onboarding.checklist.title")}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "review" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <OnboardingStepShell
            title={t(dict, "dashboard.onboarding.stepContent.review.title")}
            body={reviewBody}
            footer={stepNavFooter}
            titleAs="h2"
          />
          <OnboardingChecklist
            title={t(dict, "dashboard.onboarding.checklist.title")}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}
    </div>
  );
}
