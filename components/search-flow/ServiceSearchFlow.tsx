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
  publicFormatChoiceClass,
  publicHomeSearchBarClass,
  publicHomeSearchCtaClass,
  publicHomeSearchInputClass,
  publicHomeStepPanelClass,
  publicRadiusChipClass,
  publicWizardCtaClass,
  publicWizardFieldClass,
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
import {
  SERVICE_SEARCH_FLOW_TEXT,
  type ServiceSearchFlowText,
} from "@/lib/search/serviceSearchFlowText";

export { SERVICE_SEARCH_FLOW_TEXT, type ServiceSearchFlowText };

type LanguageOption = {
  value: FlowLanguage;
  label: string;
};

type FormatOption = {
  value: FlowFormat;
  label: string;
  description: string;
};

type PopularCategory = {
  slug: string;
  label: string;
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

function formatStepProgress(template: string, current: number, total: number): string {
  return template.replace("{current}", String(current)).replace("{total}", String(total));
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#9B9B9B]" aria-hidden>
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={[
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border sm:h-4 sm:w-4",
        selected ? "border-freuly-primary bg-freuly-primary" : "border-freuly-border-default bg-freuly-surface",
      ].join(" ")}
      aria-hidden
    >
      {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
    </span>
  );
}

function StepProgress({
  current,
  total,
  label,
  compact = false,
}: {
  current: number;
  total: number;
  label: string;
  compact?: boolean;
}) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <div
      className={compact ? "flex flex-col items-center gap-2" : "flex w-full flex-col items-center gap-4"}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={label}
    >
      <p
        className={[
          "font-semibold text-freuly-text-secondary",
          compact ? "text-[12px]" : "text-[12px] sm:hidden",
        ].join(" ")}
      >
        {label}
      </p>
      <div className="flex items-center justify-center gap-2">
        {steps.map((stepNumber) => {
          const isActive = stepNumber <= current;

          return (
            <span
              key={stepNumber}
              className={[
                "h-2 w-2 rounded-full",
                isActive ? "bg-freuly-primary" : "bg-freuly-border-default",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}

function WizardHeader({
  backLabel,
  onBack,
  showBack,
  progressStep,
  progressLabel,
  compact = false,
}: {
  backLabel: string;
  onBack: () => void;
  showBack: boolean;
  progressStep: { current: number; total: number } | null;
  progressLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mb-4 flex flex-col gap-3" : "mb-6 flex flex-col gap-4"}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-freuly-primary transition hover:text-freuly-primary-hover freuly-focus-ring sm:min-h-0"
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden>
              <path
                d="M7.5 2.5 3.5 6l4 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {backLabel}
          </button>
        ) : (
          <span className="flex-1" />
        )}
        {progressStep ? (
          <p className="hidden shrink-0 text-[13px] font-semibold text-freuly-text-secondary sm:block">
            {progressLabel}
          </p>
        ) : null}
      </div>
      {progressStep ? (
        <StepProgress
          current={progressStep.current}
          total={progressStep.total}
          label={progressLabel}
          compact={compact}
        />
      ) : null}
    </div>
  );
}

function FlowCard({
  children,
  actions,
  centered = false,
  compact = false,
}: {
  children: ReactNode;
  actions?: ReactNode;
  centered?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className={[
        compact
          ? publicHomeStepPanelClass
          : "flex w-full max-w-[560px] flex-1 flex-col text-left sm:flex-none sm:rounded-freuly-xl sm:border sm:border-freuly-border-default sm:bg-freuly-surface sm:p-10 sm:shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        centered ? "text-center" : "text-left",
      ].join(" ")}
    >
      {children}
      {actions ? (
        <div className={compact ? "mt-5" : "mt-auto flex flex-col gap-5 pt-6 sm:mt-6 sm:pt-0"}>
          {actions}
        </div>
      ) : null}
    </section>
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
    <button
      type="submit"
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={publicWizardCtaClass}
    >
      {loading ? loadingLabel : label}
    </button>
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
  withSearchIcon = false,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  withSearchIcon?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <label className="block" htmlFor={id}>
        <span className="mb-2 block text-[13px] font-semibold uppercase text-freuly-text-primary sm:text-sm sm:normal-case">
          {label}
        </span>
        <span className="relative block">
          {withSearchIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <SearchIcon />
            </span>
          ) : null}
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
              publicWizardFieldClass,
              withSearchIcon ? "pl-10" : "",
              error ? "border-freuly-error focus-visible:ring-freuly-error/25" : "",
            ].join(" ")}
          />
        </span>
      </label>
      {error ? (
        <p className="text-sm font-medium text-freuly-error" role="alert">
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
    : "text-[24px] font-bold leading-[1.2] tracking-tight text-freuly-text-primary outline-none sm:text-[28px] freuly-focus-ring";

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
    <button type="button" onClick={onClick} className={publicWizardCtaClass}>
      {children}
    </button>
  );
}

function PopularCategories({
  label,
  categories,
  onSelect,
}: {
  label: string;
  categories: PopularCategory[];
  onSelect: (value: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <p className="text-center text-[13px] leading-[1.4] text-freuly-text-secondary sm:text-sm">
      <span>{label} </span>
      {categories.map((category, index) => (
        <span key={category.slug}>
          {index > 0 ? <span className="text-freuly-text-secondary"> • </span> : null}
          <button
            type="button"
            onClick={() => onSelect(category.label)}
            className="font-semibold text-freuly-primary hover:text-freuly-primary-hover freuly-focus-ring"
          >
            {category.label}
          </button>
        </span>
      ))}
    </p>
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
  const [step, setStep] = useState<Step>("service");
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
  const progressLabel = progressStep
    ? formatStepProgress(text.stepProgress, progressStep.current, progressStep.total)
    : "";
  const showBack =
    shouldShowBackButton(step, isHomeVariant) && !(step === "service" && !isHomeVariant);

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

  const wizardHeader = (
    <WizardHeader
      backLabel={text.backCta}
      onBack={goBack}
      showBack={showBack}
      progressStep={progressStep}
      progressLabel={progressLabel}
      compact={isHomeVariant}
    />
  );

  const rootClassName = isHomeVariant
    ? ["w-full text-left", className].filter(Boolean).join(" ")
    : "flex min-h-[calc(100dvh-10rem)] flex-col items-stretch bg-freuly-page px-6 pb-8 pt-4 sm:items-center sm:justify-center sm:px-8 sm:pb-10 sm:pt-8";

  const content = (
    <div
      key={step}
      className={
        isHomeVariant
          ? step === "service"
            ? "w-full animate-fadeIn"
            : "mx-auto w-full max-w-xl animate-fadeIn"
          : "mx-auto flex w-full max-w-[560px] flex-1 flex-col animate-fadeIn sm:flex-none"
      }
    >
      {!isHomeVariant && step === "start" ? (
        <FlowCard
          centered
          actions={<PrimaryButton onClick={goToServiceStep}>{text.startCta}</PrimaryButton>}
        >
          <h1 className="mb-6 text-[24px] font-bold leading-[1.2] tracking-tight text-freuly-text-primary sm:text-[28px]">
            {text.startHeadline}
          </h1>
        </FlowCard>
      ) : null}

      {step === "service" && isHomeVariant ? (
        <form onSubmit={handleStepSubmit} className="w-full">
          <div className={publicHomeSearchBarClass}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2 sm:px-0">
              <SearchIcon />
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
        <form onSubmit={handleStepSubmit} className="flex flex-1 flex-col">
          <FlowCard
            actions={
              <>
                <ActionFooter
                  label={actionLabel}
                  loadingLabel={text.submittingCta}
                  disabled={!canAdvance}
                  loading={isSubmitting}
                />
                <PopularCategories
                  label={text.popularCategoriesLabel}
                  categories={text.popularCategories}
                  onSelect={(value) => {
                    setService(value);
                    if (error) setError(null);
                  }}
                />
              </>
            }
          >
            {wizardHeader}
            <div className="flex flex-col gap-6">
              <StepTitle titleRef={stepTitleRef}>{text.serviceQuestion}</StepTitle>
              <TextField
                id="service-query"
                label={text.serviceInputLabel}
                value={service}
                placeholder={text.serviceInputPlaceholder}
                error={error}
                withSearchIcon
                inputRef={serviceInputRef}
                onChange={(value) => {
                  setService(value);
                  if (error) setError(null);
                }}
              />
            </div>
          </FlowCard>
        </form>
      ) : null}

      {step === "language" ? (
        <form onSubmit={handleStepSubmit} className={isHomeVariant ? "" : "flex flex-1 flex-col"}>
          <FlowCard
            compact={isHomeVariant}
            actions={
              <ActionFooter
                label={actionLabel}
                loadingLabel={text.submittingCta}
                disabled={!canAdvance}
                loading={isSubmitting}
              />
            }
          >
            {wizardHeader}
            <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
              {text.languageQuestion}
            </StepTitle>
            <div className={isHomeVariant ? "grid gap-3" : "mt-6 grid gap-3"}>
              {text.languageOptions.map((option) => {
                const isSelected = selectedLanguage === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedLanguage(option.value)}
                    className={publicChoiceButtonClass(isSelected)}
                  >
                    <span className={isSelected ? "text-base font-semibold" : "text-base font-medium"}>
                      {option.label}
                    </span>
                    <RadioMark selected={isSelected} />
                  </button>
                );
              })}
            </div>
          </FlowCard>
        </form>
      ) : null}

      {step === "format" ? (
        <form onSubmit={handleStepSubmit} className={isHomeVariant ? "" : "flex flex-1 flex-col"}>
          <FlowCard
            compact={isHomeVariant}
            actions={
              <ActionFooter
                label={actionLabel}
                loadingLabel={text.submittingCta}
                disabled={!canAdvance}
                loading={isSubmitting}
              />
            }
          >
            {wizardHeader}
            <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
              {text.formatQuestion}
            </StepTitle>
            <div className={isHomeVariant ? "grid gap-3" : "mt-6 grid gap-3"}>
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
                    className={publicFormatChoiceClass(isSelected)}
                  >
                    <span
                      className={[
                        "block text-base font-semibold",
                        isSelected ? "text-freuly-primary" : "text-freuly-text-primary",
                      ].join(" ")}
                    >
                      {option.label}
                    </span>
                    <span
                      className={[
                        "block text-[13px] leading-normal",
                        isSelected ? "text-freuly-primary/80" : "text-freuly-text-secondary",
                      ].join(" ")}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </FlowCard>
        </form>
      ) : null}

      {step === "location" ? (
        <form onSubmit={handleStepSubmit} className={isHomeVariant ? "" : "flex flex-1 flex-col"}>
          <FlowCard
            compact={isHomeVariant}
            actions={
              <ActionFooter
                label={actionLabel}
                loadingLabel={text.submittingCta}
                disabled={!canAdvance}
                loading={isSubmitting}
              />
            }
          >
            {wizardHeader}
            <div className={isHomeVariant ? "space-y-4" : "mt-6 flex flex-col gap-6"}>
              <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
                {text.locationQuestion}
              </StepTitle>
              <TextField
                id="service-location"
                label={text.locationInputLabel}
                value={location}
                placeholder={text.locationInputPlaceholder}
                error={error}
                inputRef={locationInputRef}
                onChange={(value) => {
                  setLocation(value);
                  if (error) setError(null);
                }}
              />
            </div>
          </FlowCard>
        </form>
      ) : null}

      {step === "radius" ? (
        <form onSubmit={handleStepSubmit} className={isHomeVariant ? "" : "flex flex-1 flex-col"}>
          <FlowCard
            compact={isHomeVariant}
            actions={
              <ActionFooter
                label={actionLabel}
                loadingLabel={text.submittingCta}
                disabled={!canAdvance}
                loading={isSubmitting}
              />
            }
          >
            {wizardHeader}
            <div className={isHomeVariant ? "space-y-4" : "mt-6 flex flex-col gap-6"}>
              <StepTitle titleRef={stepTitleRef} compact={isHomeVariant}>
                {text.radiusLabel}
              </StepTitle>
              <fieldset>
                <legend className="sr-only">{text.radiusLabel}</legend>
                <div className="flex gap-2" role="radiogroup" aria-label={text.radiusLabel}>
                  {SERVICE_SEARCH_UI_RADII_KM.map((km) => {
                    const isSelected = radiusKm === km;
                    return (
                      <button
                        key={km}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setRadiusKm(km)}
                        className={publicRadiusChipClass(isSelected)}
                      >
                        {km} {text.radiusUnit}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </FlowCard>
        </form>
      ) : null}
    </div>
  );

  if (isHomeVariant) {
    return <div className={rootClassName}>{content}</div>;
  }

  return <main className={rootClassName}>{content}</main>;
}
