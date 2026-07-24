"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode, RefObject } from "react";
import {
  DEFAULT_SERVICE_SEARCH_RADIUS_KM,
  SERVICE_SEARCH_UI_RADII_KM,
  buildServiceSearchResultsUrl,
} from "@/lib/search/serviceSearchUrl";

type LanguageOption = {
  value: "ua" | "ru" | "de";
  label: string;
};

type FormatOption = {
  value: "online" | "nearby" | "any";
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
  emptyServiceError: string;
  emptyLocationError: string;
};

type Step = "start" | "service" | "language" | "format" | "location";

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
    emptyServiceError: "Bitte geben Sie eine Dienstleistung ein.",
    emptyLocationError: "Bitte geben Sie Stadt oder PLZ ein.",
  },
};

const FLOW_STEPS: readonly Exclude<Step, "start">[] = [
  "service",
  "language",
  "format",
  "location",
];

function getProgressStep(step: Step): number | null {
  if (step === "start") return null;
  const index = FLOW_STEPS.indexOf(step);
  return index >= 0 ? index + 1 : null;
}

function choiceButtonClass(isSelected: boolean): string {
  return [
    "w-full rounded-2xl border px-5 py-4 text-left transition-all duration-200",
    "min-h-[3.75rem] active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
    isSelected
      ? "border-primary bg-blue-50 text-primary shadow-sm"
      : "border-gray-200 bg-white text-textPrimary hover:border-blue-200 hover:bg-blue-50/40",
  ].join(" ");
}

function StepProgress({ current }: { current: number }) {
  const total = FLOW_STEPS.length;

  return (
    <div
      className="mb-7 flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current} of ${total}`}
    >
      {FLOW_STEPS.map((_, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < current;
        const isCurrent = stepNumber === current;

        return (
          <span
            key={stepNumber}
            className={[
              "rounded-full transition-all duration-300",
              isComplete
                ? "h-1.5 w-1.5 bg-primary/70"
                : isCurrent
                  ? "h-1.5 w-8 bg-primary"
                  : "h-1.5 w-1.5 bg-gray-200",
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
  progressStep?: number | null;
  compact?: boolean;
}) {
  return (
    <section
      className={[
        "rounded-3xl border border-gray-100 bg-white text-left",
        compact
          ? "p-4 shadow-soft sm:p-5"
          : "p-6 shadow-[0_18px_50px_-20px_rgba(30,64,175,0.18)] sm:p-9",
        centered ? "text-center" : "",
      ].join(" ")}
    >
      {progressStep ? <StepProgress current={progressStep} /> : null}
      {children}
    </section>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-textSecondary transition hover:text-textPrimary"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}

function PrimaryButton({
  children,
  type = "button",
  onClick,
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={[
        "btn-primary w-full min-h-[48px] px-8 py-4 text-base font-semibold",
        className,
      ].join(" ")}
    >
      {children}
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
        <span className="mb-2 block text-sm font-medium text-textSecondary">{label}</span>
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
            "w-full rounded-2xl border bg-white px-5 text-textPrimary outline-none transition",
            "placeholder:text-slate-400 focus:ring-4",
            large ? "py-5 text-xl sm:text-2xl" : "py-4 text-lg",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-gray-200 focus:border-blue-300 focus:ring-blue-100",
          ].join(" ")}
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-7 text-[1.65rem] font-bold leading-[1.2] tracking-tight text-textPrimary sm:text-[2rem]">
      {children}
    </h1>
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

  const serviceInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const progressStep = getProgressStep(step);

  useEffect(() => {
    if (step === "service") {
      serviceInputRef.current?.focus();
    }
    if (step === "location") {
      locationInputRef.current?.focus();
    }
  }, [step]);

  function goToServiceStep() {
    setError(null);
    setStep("service");
  }

  function showBackButton(): boolean {
    if (step === "start") return false;
    if (isHomeVariant && step === "service") return false;
    return true;
  }

  function goBack() {
    setError(null);

    if (step === "location") {
      setStep("format");
      return;
    }

    if (step === "format") {
      setStep("language");
      return;
    }

    if (step === "language") {
      setStep("service");
      return;
    }

    setStep("start");
  }

  function handleServiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!service.trim()) {
      setError(text.emptyServiceError);
      return;
    }

    setError(null);
    setStep("language");
  }

  function redirectToResults(
    format: FormatOption["value"],
    locationValue = location
  ) {
    if (!selectedLanguage || !service.trim()) return;

    if (format === "nearby" && !locationValue.trim()) {
      setError(text.emptyLocationError);
      return;
    }

    setError(null);
    router.push(
      buildServiceSearchResultsUrl({
        service,
        language: selectedLanguage,
        format,
        location: locationValue,
        radiusKm,
      })
    );
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    redirectToResults("nearby", location);
  }

  const rootClassName = isHomeVariant
    ? ["w-full max-w-lg mx-auto text-left", className].filter(Boolean).join(" ")
    : "flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-8 sm:py-12";

  const content = (
    <div key={step} className={isHomeVariant ? "w-full animate-fadeIn" : "mx-auto w-full max-w-lg animate-fadeIn"}>
        {!isHomeVariant && step === "start" ? (
          <FlowCard centered>
            <h1 className="mb-10 text-[1.85rem] font-bold leading-[1.15] tracking-tight text-textPrimary sm:text-[2.35rem]">
              {text.startHeadline}
            </h1>
            <PrimaryButton onClick={goToServiceStep}>{text.startCta}</PrimaryButton>
          </FlowCard>
        ) : null}

        {step === "service" ? (
          <FlowCard progressStep={progressStep} compact={isHomeVariant}>
            {showBackButton() ? (
              <BackButton label={text.backCta} onClick={goBack} />
            ) : null}
            <StepTitle>
              {isHomeVariant ? text.headline : text.serviceQuestion}
            </StepTitle>

            <form onSubmit={handleServiceSubmit} className="space-y-6">
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

              <PrimaryButton type="submit">{text.nextCta}</PrimaryButton>
            </form>
          </FlowCard>
        ) : null}

        {step === "language" ? (
          <FlowCard progressStep={progressStep} compact={isHomeVariant}>
            {showBackButton() ? (
              <BackButton label={text.backCta} onClick={goBack} />
            ) : null}
            <StepTitle>{text.languageQuestion}</StepTitle>

            <div className="grid gap-3">
              {text.languageOptions.map((option) => {
                const isSelected = selectedLanguage === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(option.value);
                      setStep("format");
                    }}
                    className={choiceButtonClass(isSelected)}
                  >
                    <span className="block text-lg font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </FlowCard>
        ) : null}

        {step === "format" ? (
          <FlowCard progressStep={progressStep} compact={isHomeVariant}>
            {showBackButton() ? (
              <BackButton label={text.backCta} onClick={goBack} />
            ) : null}
            <StepTitle>{text.formatQuestion}</StepTitle>

            <div className="grid gap-3">
              {text.formatOptions.map((option) => {
                const isSelected = selectedFormat === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedFormat(option.value);
                      setError(null);
                      if (option.value === "nearby") {
                        setStep("location");
                        return;
                      }
                      redirectToResults(option.value);
                    }}
                    className={choiceButtonClass(isSelected)}
                  >
                    <span className="block text-lg font-semibold">{option.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-textSecondary">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </FlowCard>
        ) : null}

        {step === "location" ? (
          <FlowCard progressStep={progressStep} compact={isHomeVariant}>
            {showBackButton() ? (
              <BackButton label={text.backCta} onClick={goBack} />
            ) : null}
            <StepTitle>{text.locationQuestion}</StepTitle>

            <form onSubmit={handleLocationSubmit} className="space-y-6">
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

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-textSecondary">
                  {text.radiusLabel}
                </legend>
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
                          "min-h-[44px] rounded-xl border px-2 py-2 text-sm font-semibold transition",
                          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
                          isSelected
                            ? "border-primary bg-blue-50 text-primary shadow-sm"
                            : "border-gray-200 bg-white text-textPrimary hover:border-blue-200 hover:bg-blue-50/40",
                        ].join(" ")}
                      >
                        {km} {text.radiusUnit}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <PrimaryButton type="submit">{text.nextCta}</PrimaryButton>
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
