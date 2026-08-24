import Link from "next/link";
import { Alert } from "@/components/ui";
import SpecialistContactRulesNotice from "@/components/legal/SpecialistContactRulesNotice";
import { dashboardLinkPrimaryClass } from "@/components/dashboard/dashboardStyles";
import { t, type Dictionary } from "@/lib/i18n";
import { getDemandChannelCopy } from "@/lib/dashboard/demandChannelCopy";
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
      body: "Bitte schließen Sie die Einrichtung ab. Danach werden alle Bereiche des Fachkräfte-Kontos freigeschaltet.",
    };
  }

  if (lang === "ua") {
    return {
      title: "Ваш профіль ще не опубліковано.",
      body: "Будь ласка, завершіть налаштування. Після цього всі розділи кабінету спеціаліста стануть доступними.",
    };
  }

  return {
    title: "Ваш профиль ещё не опубликован.",
    body: "Пожалуйста, завершите настройку. После этого все разделы кабинета специалиста станут доступны.",
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
  const demandCopy = getDemandChannelCopy(lang);

  const steps: OnboardingStep[] = ONBOARDING_STEP_ORDER.map((step) => ({
    key: step,
    label: demandCopy.onboarding.steps[step],
    href: stepHref(baseHref, step),
  }));

  const welcomeFooter = (
    <div className="flex flex-wrap items-center gap-freuly-3">
      <Link
        href={publishReady ? stepHref(baseHref, "review") : stepHref(baseHref, "basic")}
        className={dashboardLinkPrimaryClass}
      >
        {publishReady
          ? demandCopy.onboarding.readyCta
          : profileStarted
            ? demandCopy.onboarding.continue
            : demandCopy.onboarding.start}
      </Link>
    </div>
  );

  return (
    <div className="space-y-freuly-6">
      {categoriesLoadError ? (
        <Alert variant="error" title="Ошибка загрузки">
          {categoriesLoadError}
        </Alert>
      ) : null}
      {showIncompleteProfileGateNotice ? (
        <Alert variant="warning" title={gateMessage.title}>
          {gateMessage.body}
        </Alert>
      ) : null}

      <SpecialistContactRulesNotice lang={lang} />

      <OnboardingProgress steps={steps} activeStep={activeStep} />

      {activeStep === "welcome" ? (
        <OnboardingStepShell
          title={demandCopy.onboarding.welcomeTitle}
          body={demandCopy.onboarding.welcomeBody}
          footer={welcomeFooter}
          titleAs="h1"
        >
          <Alert variant={publishReady ? "success" : "warning"}>
            {publishReady
              ? demandCopy.onboarding.publishReady
              : demandCopy.onboarding.publishNotReady}
          </Alert>
          {isUncategorizedCategory ? (
            <Alert variant="warning" className="mt-freuly-3">
              {t(dict, "dashboard.onboarding.uncategorizedWarning")}
            </Alert>
          ) : null}
        </OnboardingStepShell>
      ) : null}

      {activeStep === "basic" ? (
        <div className="grid gap-freuly-6 lg:grid-cols-[1fr_360px]">
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
            title={demandCopy.onboarding.checklistTitle}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "about" ? (
        <div className="grid gap-freuly-6 lg:grid-cols-[1fr_360px]">
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
            title={demandCopy.onboarding.checklistTitle}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "services" ? (
        <div className="grid gap-freuly-6 lg:grid-cols-[1fr_360px]">
          <OnboardingServicesStep dict={dict} lang={lang} summary={servicesSummary} />
          <OnboardingChecklist
            title={demandCopy.onboarding.checklistTitle}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "photo" ? (
        <div className="grid min-w-0 gap-freuly-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <OnboardingPhotoStep
            dict={dict}
            lang={lang}
            baseHref={baseHref}
            dashboardHref={`/${lang}/specialist/dashboard`}
            currentPhotoUrl={currentPhotoUrl}
          />
          <OnboardingChecklist
            title={demandCopy.onboarding.checklistTitle}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}

      {activeStep === "review" ? (
        <div className="grid gap-freuly-6 lg:grid-cols-[1fr_360px]">
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
            title={demandCopy.onboarding.checklistTitle}
            publishReadyLabel={t(dict, "dashboard.onboarding.checklist.done")}
            recommendationLabel={t(dict, "dashboard.onboarding.checklist.recommendation")}
            items={checklistItems}
          />
        </div>
      ) : null}
    </div>
  );
}
