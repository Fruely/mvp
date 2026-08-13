"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode, RefObject } from "react";
import {
  buildServiceSearchResultsUrl,
  DEFAULT_SERVICE_SEARCH_RADIUS_KM,
  SERVICE_SEARCH_UI_RADII_KM,
} from "@/lib/search/serviceSearchUrl";
import {
  publicChoiceButtonClass,
  publicFieldClass,
  publicHomeSearchBarClass,
  publicHomeSearchCtaClass,
  publicHomeSearchInputClass,
  publicHomeStepPanelClass,
  publicLinkPrimaryClass,
  publicWizardCardClass,
} from "@/components/public/publicStyles";
import {
  canAdvanceFromStep,
  getActionLabel,
  getNextStep,
  getPreviousStep,
  getProgressMeta,
  shouldShowBackButton,
  type FlowFormat,
  type FlowLanguage,
  type FlowState,
  type FlowStep,
} from "@/lib/search/serviceSearchFlow.logic";

type LanguageOption = {
  value: FlowLanguage;
  label: string;
};

type FormatOption = {
  value: FlowFormat;
  label: string;
  description: string;
};

export type ServiceSearchFlowText = {
  headline: string;
  description: string;
  startHeadline: string;
  startCta: string;
  serviceQuestion: string;
  serviceInputLabel: string;
  serviceInputPlaceholder: string;
  languageQuestion: string;
  languageOptions: LanguageOption[];
  formatQuestion: string;
  formatOptions: FormatOption[];
  locationQuestion: string;
  locationInputLabel: string;
  locationInputPlaceholder: string;
  radiusLabel: string;
  radiusUnit: string;
  nextCta: string;
  backCta: string;
  submitCta: string;
  submittingCta: string;
  emptyServiceError: string;
  emptyLocationError: string;
};

type Step = FlowStep;

type ServiceSearchFlowVariant = "page" | "home";

type ServiceSearchFlowProps = {
  text: ServiceSearchFlowText;
  variant?: ServiceSearchFlowVariant;
  defaultLanguage?: LanguageOption["value"];
  initialLocation?: string;
  className?: string;
};

export const SERVICE_SEARCH_FLOW_TEXT: Record<"ru" | "ua" | "de", ServiceSearchFlowText> = {
  ru: {
    headline: "Какую услугу вы ищете?",
    description: "Короткий подбор услуги и специалиста на Freuly",
    startHeadline: "Какую услугу вы ищете?",
    startCta: "Начать поиск",
    serviceQuestion: "Какая услуга вам нужна?",
    serviceInputLabel: "Услуга",
    serviceInputPlaceholder: "Введите услугу",
    languageQuestion: "На каком языке вам удобно получить услугу?",
    languageOptions: [
      { value: "ua", label: "Українська" },
      { value: "ru", label: "Русский" },
      { value: "de", label: "Deutsch" },
    ],
    formatQuestion: "Какой формат вам подходит?",
    formatOptions: [
      {
        value: "online",
        label: "Онлайн",
        description: "Специалист сможет работать с вами дистанционно.",
      },
      {
        value: "nearby",
        label: "Рядом со мной",
        description: "Покажем специалистов поблизости, если это возможно.",
      },
      {
        value: "any",
        label: "Без разницы",
        description: "Подойдут и онлайн, и локальные варианты.",
      },
    ],
    locationQuestion: "Где вам нужна услуга?",
    locationInputLabel: "Город или индекс",
    locationInputPlaceholder: "Например: Köln или 50667",
    radiusLabel: "Радиус поиска",
    radiusUnit: "км",
    nextCta: "Дальше",
    backCta: "Назад",
    submitCta: "Показать специалистов",
    submittingCta: "Поиск…",
    emptyServiceError: "Введите услугу, чтобы продолжить.",
    emptyLocationError: "Укажите город или индекс, чтобы продолжить.",
  },
  ua: {
    headline: "Яку послугу ви шукаєте?",
    description: "Короткий підбір послуги та спеціаліста на Freuly",
    startHeadline: "Яку послугу ви шукаєте?",
    startCta: "Почати пошук",
    serviceQuestion: "Яка послуга вам потрібна?",
    serviceInputLabel: "Послуга",
    serviceInputPlaceholder: "Введіть послугу",
    languageQuestion: "Якою мовою вам зручно отримати послугу?",
    languageOptions: [
      { value: "ua", label: "Українська" },
      { value: "ru", label: "Русский" },
      { value: "de", label: "Deutsch" },
    ],
    formatQuestion: "Який формат вам підходить?",
    formatOptions: [
      {
        value: "online",
        label: "Онлайн",
        description: "Спеціаліст зможе працювати з вами дистанційно.",
      },
      {
        value: "nearby",
        label: "Поруч зі мною",
        description: "Покажемо спеціалістів поблизу, якщо це можливо.",
      },
      {
        value: "any",
        label: "Без різниці",
        description: "Підійдуть і онлайн, і локальні варіанти.",
      },
    ],
    locationQuestion: "Де вам потрібна послуга?",
    locationInputLabel: "Місто або індекс",
    locationInputPlaceholder: "Наприклад: Köln або 50667",
    radiusLabel: "Радіус пошуку",
    radiusUnit: "км",
    nextCta: "Далі",
    backCta: "Назад",
    submitCta: "Показати спеціалістів",
    submittingCta: "Пошук…",
    emptyServiceError: "Введіть послугу, щоб продовжити.",
    emptyLocationError: "Вкажіть місто або індекс, щоб продовжити.",
  },
  de: {
    headline: "Welche Dienstleistung suchen Sie?",
    description: "Kurze Auswahl einer Dienstleistung und passender Spezialisten auf Freuly",
    startHeadline: "Welche Dienstleistung suchen Sie?",
    startCta: "Suche starten",
    serviceQuestion: "Welche Dienstleistung benötigen Sie?",
    serviceInputLabel: "Dienstleistung",
    serviceInputPlaceholder: "Dienstleistung eingeben",
    languageQuestion: "In welcher Sprache möchten Sie die Dienstleistung erhalten?",
    languageOptions: [
      { value: "ua", label: "Українська" },
      { value: "ru", label: "Русский" },
      { value: "de", label: "Deutsch" },
    ],
    formatQuestion: "Welches Format passt zu Ihnen?",
    formatOptions: [
      {
        value: "online",
        label: "Online",
        description: "Der Spezialist kann aus der Ferne mit Ihnen arbeiten.",
      },
      {
        value: "nearby",
        label: "In meiner Nähe",
        description: "Wir zeigen passende Spezialisten in Ihrer Nähe, wenn möglich.",
      },
      {
        value: "any",
        label: "Egal",
        description: "Online- und lokale Angebote sind beide in Ordnung.",
      },
    ],
    locationQuestion: "Wo benötigen Sie die Dienstleistung?",
    locationInputLabel: "Stadt oder Postleitzahl",
    locationInputPlaceholder: "Zum Beispiel: Köln oder 50667",
    radiusLabel: "Suchradius",
    radiusUnit: "km",
    nextCta: "Weiter",
    backCta: "Zurück",
    submitCta: "Spezialisten anzeigen",
    submittingCta: "Suche…",
    emptyServiceError: "Bitte geben Sie eine Dienstleistung ein.",
    emptyLocationError: "Bitte geben Sie Stadt oder PLZ ein.",
  },
};

function choiceButtonClass(isSelected: boolean): string {
  return publicChoiceButtonClass(isSelected);
}

function StepProgress({ current, total }: { current: number; total: number }) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <div
      className="mb-7 flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current} of ${total}`}
    >
      {steps.map((stepNumber) => {
        const isComplete = stepNumber < current;
        const isCurrent = stepNumber === current;

        return (
          <span
            key={stepNumber}
            className={[
              "rounded-full transition-all duration-300",
              isComplete
                ? "h-2 w-2 bg-freuly-primary/70"
                : isCurrent
                  ? "h-2 w-8 bg-freuly-primary"
                  : "h-2 w-2 bg-freuly-border-default",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

function FlowCard({
  children,
  centered = false,
  progressStep,
  compact = false,
}: {
  children: ReactNode;
  centered?: boolean;
  progressStep?: { current: number; total: number } | null;
  compact?: boolean;
}) {
  return (
    <section
      className={[
        compact ? publicHomeStepPanelClass : publicWizardCardClass,
        "text-left",
        centered ? "text-center" : "",
      ].join(" ")}
    >
      {progressStep ? (
        <StepProgress current={progressStep.current} total={progressStep.total} />
      ) : null}
      {children}
    </section>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-freuly-text-secondary transition hover:text-freuly-text-primary freuly-focus-ring"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}

function ActionFooter({
  label,
  loadingLabel,
  disabled = false,
  loading = false,
}: {
  label: string;
  loadingLabel: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-1 mt-6 border-t border-freuly-border-subtle bg-freuly-surface/95 px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      <button
        type="submit"
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        className={[
          publicLinkPrimaryClass,
          "w-full min-h-[48px] px-8 py-4 text-base",
          disabled || loading ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      >
        {loading ? loadingLabel : label}
      </button>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
  error,
  inputRef,
  autoFocus = false,
  large = false,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <label className="block" htmlFor={id}>
        <span className="mb-2 block text-sm font-semibold text-freuly-text-muted">{label}</span>
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          className={[
            publicFieldClass,
            large ? "py-5 text-xl sm:text-2xl" : "py-4 text-lg",
            error ? "border-freuly-error focus-visible:ring-freuly-error/25" : "",
          ].join(" ")}
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm font-medium text-freuly-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepTitle({
  children,
  titleRef,
  compact = false,
}: {
  children: ReactNode;
  titleRef?: RefObject<HTMLHeadingElement | null>;
  compact?: boolean;
}) {
  const titleClass = compact
    ? "mb-4 text-xl font-semibold leading-[1.3] tracking-tight text-freuly-text-primary outline-none freuly-focus-ring"
    : "mb-7 text-[1.65rem] font-bold leading-[1.2] tracking-tight text-freuly-text-primary outline-none sm:text-[2rem] freuly-focus-ring";

  if (compact) {
    return (
      <h2 ref={titleRef} tabIndex={-1} className={titleClass}>
        {children}
      </h2>
    );
  }

  return (
    <h1 ref={titleRef} tabIndex={-1} className={titleClass}>
      {children}
    </h1>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${publicLinkPrimaryClass} w-full min-h-[48px] px-8 py-4 text-base`}
    >
      {children}
    </button>
  );
}

export default function ServiceSearchFlow({
  text,
  variant = "page",
  defaultLanguage,
  initialLocation = "",
  className = "",
}: ServiceSearchFlowProps) {
  const router = useRouter();
  const isHomeVariant = variant === "home";
  const [step, setStep] = useState<Step>(isHomeVariant ? "service" : "start");
  const [service, setService] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageOption["value"] | null>(defaultLanguage ?? null);
  const [selectedFormat, setSelectedFormat] =
    useState<FormatOption["value"] | null>(null);
  const [location, setLocation] = useState(initialLocation);
  const [radiusKm, setRadiusKm] = useState<number>(
    DEFAULT_SERVICE_SEARCH_RADIUS_KM
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);

  const flowState = {
    service,
    selectedLanguage,
    selectedFormat,
    location,
    radiusKm,
  };

  const progressStep = getProgressMeta(step, selectedFormat);
  const canAdvance = canAdvanceFromStep(step, flowState);
  const actionLabel = getActionLabel(step, flowState, {
    nextCta: text.nextCta,
    submitCta: text.submitCta,
  });

  useEffect(() => {
    if (step === "service") {
      serviceInputRef.current?.focus();
    }
    if (step === "location") {
      locationInputRef.current?.focus();
    }
    stepTitleRef.current?.focus();
  }, [step]);

  function goToServiceStep() {
    setError(null);
    setStep("service");
  }

  function goBack() {
    setError(null);
    setStep(getPreviousStep(step, isHomeVariant));
  }

  function validateStep(currentStep: Step): boolean {
    if (currentStep === "service" && !service.trim()) {
      setError(text.emptyServiceError);
      return false;
    }

    if (currentStep === "location" && !location.trim()) {
      setError(text.emptyLocationError);
      return false;
    }

    if (currentStep === "radius" && !location.trim()) {
      setError(text.emptyLocationError);
      return false;
    }

    setError(null);
    return true;
  }

  function buildFlowResultsUrl(state: FlowState): string | null {
    if (!state.selectedLanguage || !state.selectedFormat || !state.service.trim()) {
      return null;
    }

    if (state.selectedFormat === "nearby" && !state.location.trim()) {
      return null;
    }

    return buildServiceSearchResultsUrl({
      service: state.service,
      language: state.selectedLanguage,
      format: state.selectedFormat,
      location: state.location,
      radiusKm: state.radiusKm || DEFAULT_SERVICE_SEARCH_RADIUS_KM,
    });
  }

  function submitResults() {
    if (isSubmitting) return;

    const url = buildFlowResultsUrl(flowState);
    if (!url) {
      if (selectedFormat === "nearby" && !location.trim()) {
        setError(text.emptyLocationError);
      }
      return;
    }

    setIsSubmitting(true);
    router.push(url);
  }

  function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validateStep(step)) return;
    if (!canAdvanceFromStep(step, flowState)) return;

    const next = getNextStep(step, flowState);
    if (next === "submit") {
      submitResults();
      return;
    }

    setError(null);
    setStep(next);
  }

  const rootClassName = isHomeVariant
    ? ["w-full text-left", className].filter(Boolean).join(" ")
    : "flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-freuly-page px-freuly-4 py-freuly-8 sm:py-freuly-12";

  const content = (
    <div
      key={step}
      className={
        isHomeVariant
          ? step === "service"
            ? "w-full animate-fadeIn"
            : "mx-auto w-full max-w-xl animate-fadeIn"
          : "mx-auto w-full max-w-lg animate-fadeIn"
      }
    >
      {!isHomeVariant && step === "start" ? (
        <FlowCard centered>
          <h1 className="mb-10 text-[1.85rem] font-bold leading-[1.15] tracking-tight text-freuly-text-primary sm:text-[2.35rem]">
            {text.startHeadline}
          </h1>
          <PrimaryButton onClick={goToServiceStep}>{text.startCta}</PrimaryButton>
        </FlowCard>
      ) : null}

      {step === "service" && isHomeVariant ? (
        <form onSubmit={handleStepSubmit} className="w-full">
          <div className={publicHomeSearchBarClass}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2 sm:px-0">
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4 shrink-0 text-freuly-text-muted"
                aria-hidden
              >
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <label htmlFor="service-query" className="sr-only">
                {text.serviceInputLabel}
              </label>
              <input
                ref={serviceInputRef}
                id="service-query"
                value={service}
                onChange={(event) => {
                  setService(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={text.serviceInputPlaceholder}
                autoComplete="off"
                aria-invalid={Boolean(error)}
                className={publicHomeSearchInputClass}
              />
            </div>
            <button
              type="submit"
              disabled={!canAdvance || isSubmitting}
              aria-disabled={!canAdvance || isSubmitting}
              aria-busy={isSubmitting}
              className={publicHomeSearchCtaClass}
            >
              {isSubmitting ? text.submittingCta : text.startCta}
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-left text-sm font-medium text-freuly-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {step === "service" && !isHomeVariant ? (
        <FlowCard progressStep={progressStep}>
          {shouldShowBackButton(step, isHomeVariant) ? (
            <BackButton label={text.backCta} onClick={goBack} />
          ) : null}
          <StepTitle titleRef={stepTitleRef}>{text.serviceQuestion}</StepTitle>

          <form onSubmit={handleStepSubmit} className="space-y-1">
            <TextField
              id="service-query"
              label={text.serviceInputLabel}
              value={service}
              placeholder={text.serviceInputPlaceholder}
              error={error}
              large
              inputRef={serviceInputRef}
              onChange={(value) => {
                setService(value);
                if (error) setError(null);
              }}
            />
            <ActionFooter
              label={actionLabel}
              loadingLabel={text.submittingCta}
              disabled={!canAdvance}
              loading={isSubmitting}
            />
          </form>
        </FlowCard>
      ) : null}

      {step === "language" ? (
        <FlowCard progressStep={progressStep} compact={isHomeVariant}>
          {shouldShowBackButton(step, isHomeVariant) ? (
            <BackButton label={text.backCta} onClick={goBack} />
          ) : null}
          <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
            {text.languageQuestion}
          </StepTitle>

          <form onSubmit={handleStepSubmit}>
            <div className="grid gap-3">
              {text.languageOptions.map((option) => {
                const isSelected = selectedLanguage === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedLanguage(option.value)}
                    className={choiceButtonClass(isSelected)}
                  >
                    <span className="block text-lg font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <ActionFooter
              label={actionLabel}
              loadingLabel={text.submittingCta}
              disabled={!canAdvance}
              loading={isSubmitting}
            />
          </form>
        </FlowCard>
      ) : null}

      {step === "format" ? (
        <FlowCard progressStep={progressStep} compact={isHomeVariant}>
          {shouldShowBackButton(step, isHomeVariant) ? (
            <BackButton label={text.backCta} onClick={goBack} />
          ) : null}
          <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
            {text.formatQuestion}
          </StepTitle>

          <form onSubmit={handleStepSubmit}>
            <div className="grid gap-3">
              {text.formatOptions.map((option) => {
                const isSelected = selectedFormat === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedFormat(option.value);
                      if (error) setError(null);
                    }}
                    className={choiceButtonClass(isSelected)}
                  >
                    <span className="block text-lg font-semibold">{option.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-freuly-text-secondary">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <ActionFooter
              label={actionLabel}
              loadingLabel={text.submittingCta}
              disabled={!canAdvance}
              loading={isSubmitting}
            />
          </form>
        </FlowCard>
      ) : null}

      {step === "location" ? (
        <FlowCard progressStep={progressStep} compact={isHomeVariant}>
          {shouldShowBackButton(step, isHomeVariant) ? (
            <BackButton label={text.backCta} onClick={goBack} />
          ) : null}
          <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
            {text.locationQuestion}
          </StepTitle>

          <form onSubmit={handleStepSubmit} className="space-y-1">
            <TextField
              id="service-location"
              label={text.locationInputLabel}
              value={location}
              placeholder={text.locationInputPlaceholder}
              error={error}
              large
              inputRef={locationInputRef}
              onChange={(value) => {
                setLocation(value);
                if (error) setError(null);
              }}
            />
            <ActionFooter
              label={actionLabel}
              loadingLabel={text.submittingCta}
              disabled={!canAdvance}
              loading={isSubmitting}
            />
          </form>
        </FlowCard>
      ) : null}

      {step === "radius" ? (
        <FlowCard progressStep={progressStep} compact={isHomeVariant}>
          {shouldShowBackButton(step, isHomeVariant) ? (
            <BackButton label={text.backCta} onClick={goBack} />
          ) : null}
          <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
            {text.radiusLabel}
          </StepTitle>

          <form onSubmit={handleStepSubmit}>
            <fieldset>
              <legend className="sr-only">{text.radiusLabel}</legend>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={text.radiusLabel}>
                {SERVICE_SEARCH_UI_RADII_KM.map((km) => {
                  const isSelected = radiusKm === km;
                  return (
                    <button
                      key={km}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setRadiusKm(km)}
                      className={[
                        "min-h-[44px] rounded-freuly-md border px-2 py-2 text-sm font-semibold transition freuly-focus-ring",
                        isSelected
                          ? "border-freuly-primary bg-freuly-primary-light text-freuly-primary shadow-sm"
                          : "border-freuly-border-default bg-freuly-surface text-freuly-text-primary hover:border-freuly-primary/30 hover:bg-freuly-primary-light/40",
                      ].join(" ")}
                    >
                      {km} {text.radiusUnit}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <ActionFooter
              label={actionLabel}
              loadingLabel={text.submittingCta}
              disabled={!canAdvance}
              loading={isSubmitting}
            />
          </form>
        </FlowCard>
      ) : null}
    </div>
  );

  if (isHomeVariant) {
    return <div className={rootClassName}>{content}</div>;
  }

  return <main className={rootClassName}>{content}</main>;
}
