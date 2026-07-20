import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import OnboardingAboutForm, { type OnboardingAboutData } from "./OnboardingAboutForm";
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
import OnboardingPhotoStep from "./OnboardingPhotoStep";
import OnboardingReviewStep, { type OnboardingReviewSummary } from "./OnboardingReviewStep";
import OnboardingServicesStep, { type OnboardingServicesSummary } from "./OnboardingServicesStep";
import OnboardingStepShell from "./OnboardingStepShell";

function stepHref(baseHref: string, step: OnboardingStepKey): string {
  if (step === "photo") return `${baseHref}?step=photos`;
  return step === "welcome" ? `${baseHref}?step=welcome` : `${baseHref}?step=${step}`;
}

function incompleteProfileGateMessage(lang: string): { title: string; body: string } {
  if (lang === "de") {
    return {
      title: "Ihr Profil ist noch nicht veröffentlicht.",
      body: "Bitte schließen Sie die Veröffentlichung Ihres Profils ab. Danach werden alle Bereiche des Spezialisten-Kontos freigeschaltet.",
    };
  }

  if (lang === "ua") {
    return {
      title: "Ваш профіль ще не опубліковано.",
      body: "Будь ласка, завершіть публікацію профілю. Після цього всі розділи кабінету спеціаліста стануть доступними.",
    };
  }

  return {
    title: "Ваш профиль ещё не опубликован.",
    body: "Пожалуйста, завершите публикацию профиля. После этого все разделы кабинета специалиста станут доступны.",
  };
}

export default function SpecialistOnboardingWizard({
  dict,
  lang,
  activeStep,
  profileStarted,
  publishReady,
  isUncategorizedCategory,
  showIncompleteProfileGateNotice,
  checklistItems,
  initialBasicData,
  initialAboutData,
  servicesSummary,
  currentPhotoUrl,
  reviewSummary,
  publicProfileHref,
  categories,
  preserveProfileData,
  categoriesLoadError,
}: {
  dict: Dictionary;
  lang: string;
  activeStep: OnboardingStepKey;
  profileStarted: boolean;
  publishReady: boolean;
  isUncategorizedCategory: boolean;
  showIncompleteProfileGateNotice?: boolean;
  checklistItems: OnboardingChecklistItem[];
  initialBasicData: OnboardingBasicData;
  initialAboutData: OnboardingAboutData;
  servicesSummary: OnboardingServicesSummary;
  currentPhotoUrl: string;
  reviewSummary: OnboardingReviewSummary;
  publicProfileHref: string;
  categories: OnboardingCategory[];
  preserveProfileData: OnboardingPreserveProfileData;
  categoriesLoadError?: string;
}) {
  const baseHref = `/${lang}/specialist/dashboard/onboarding`;
  const gateMessage = incompleteProfileGateMessage(lang);

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
        {nextKey ? (
          <Link href={stepHref(baseHref, nextKey)} className={primaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.next")}
          </Link>
        ) : null}
      </div>
    ) : null;

  const welcomeFooter = (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={publishReady ? stepHref(baseHref, "review") : stepHref(baseHref, "basic")} className={primaryLinkClass}>
        {publishReady
          ? t(dict, "dashboard.onboarding.ctaCard.readyButton")
          : profileStarted
            ? t(dict, "dashboard.onboarding.cta.continue")
            : t(dict, "dashboard.onboarding.cta.start")}
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {categoriesLoadError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-red-950 shadow-sm">
          <p className="text-sm font-semibold">Ошибка загрузки</p>
          <p className="mt-1 text-sm leading-6">{categoriesLoadError}</p>
        </div>
      ) : null}
      {showIncompleteProfileGateNotice ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm">
          <p className="text-sm font-semibold">{gateMessage.title}</p>
          <p className="mt-1 text-sm leading-6">{gateMessage.body}</p>
        </div>
      ) : null}

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
            dashboardHref={`/${lang}/specialist/dashboard`}
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
          <OnboardingAboutForm
            dict={dict}
            lang={lang}
            baseHref={baseHref}
            dashboardHref={`/${lang}/specialist/dashboard`}
            initialData={initialAboutData}
            preserveBasicData={{
              name: initialBasicData.name,
              category_id: initialBasicData.category_id || null,
              work_format: initialBasicData.work_format,
              country_code: initialBasicData.country_code,
              postal_code: initialBasicData.postal_code,
              city: initialBasicData.city,
              lat: initialBasicData.lat,
              lng: initialBasicData.lng,
              service_radius_km: initialBasicData.service_radius_km,
              languages: initialBasicData.languages,
            }}
            preserveProfileData={{
              city: preserveProfileData.city,
              address: preserveProfileData.address,
              video_url: preserveProfileData.video_url,
              photo_url: preserveProfileData.photo_url,
              gallery_urls: preserveProfileData.gallery_urls,
              certificate_urls: preserveProfileData.certificate_urls,
            }}
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
          <OnboardingServicesStep
            dict={dict}
            lang={lang}
          />
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
          <OnboardingPhotoStep
            dict={dict}
            lang={lang}
            baseHref={baseHref}
            dashboardHref={`/${lang}/specialist/dashboard`}
            currentPhotoUrl={currentPhotoUrl}
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
          <OnboardingReviewStep
            dict={dict}
            lang={lang}
            baseHref={baseHref}
            dashboardHref={`/${lang}/specialist/dashboard`}
            publicProfileHref={publicProfileHref}
            publishReady={publishReady}
            summary={reviewSummary}
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
