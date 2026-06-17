"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

type LanguageOption = {
  value: "ua" | "ru" | "de";
  label: string;
};

type FormatOption = {
  value: "online" | "nearby" | "any";
  label: string;
  description: string;
};

type FlowText = {
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
  nextCta: string;
  backCta: string;
  emptyServiceError: string;
  emptyLocationError: string;
};

type Step = "start" | "service" | "language" | "format" | "location";

type ServiceSearchFlowProps = {
  text: FlowText;
};

const FLOW_STEPS: readonly Exclude<Step, "start">[] = [
  "service",
  "language",
  "format",
  "location",
];

function toSearchLang(value: LanguageOption["value"]): string {
  return value === "ua" ? "uk" : value;
}

function buildResultsUrl(opts: {
  service: string;
  language: LanguageOption["value"];
  format: FormatOption["value"];
  location: string;
}): string {
  const params = new URLSearchParams();
  params.set("lang", toSearchLang(opts.language));
  params.set("q", opts.service.trim());

  if (opts.format === "online") {
    params.set("mode", "online");
  } else if (opts.format === "nearby" && opts.location.trim()) {
    params.set("place", opts.location.trim());
  }

  return `/specialists?${params.toString()}`;
}

function getProgressStep(step: Step): number | null {
  if (step === "start") return null;
  const index = FLOW_STEPS.indexOf(step);
  return index >= 0 ? index + 1 : null;
}

function choiceButtonClass(isSelected: boolean): string {
  return [
    "w-full rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200",
    "min-h-[3.5rem] active:scale-[0.99]",
    isSelected
      ? "border-primary bg-blue-50/90 text-primary shadow-sm ring-4 ring-blue-100/70"
      : "border-gray-200 bg-white text-textPrimary hover:border-blue-200 hover:bg-slate-50",
  ].join(" ");
}

function StepProgress({ current }: { current: number }) {
  const total = FLOW_STEPS.length;

  return (
    <div
      className="mb-6 flex items-center justify-center gap-2"
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
                ? "h-2 w-2 bg-primary"
                : isCurrent
                  ? "h-2 w-9 bg-primary"
                  : "h-2 w-2 bg-gray-200",
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
}: {
  children: ReactNode;
  centered?: boolean;
  progressStep?: number | null;
}) {
  return (
    <section
      className={[
        "animate-fadeIn rounded-3xl border border-gray-200/80 bg-white",
        "p-6 shadow-[0_12px_48px_rgba(15,23,42,0.07)] sm:p-10",
        centered ? "text-center" : "text-left",
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
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-textSecondary transition hover:text-textPrimary"
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
        "btn-primary w-full px-8 py-4 text-base font-semibold sm:w-auto sm:min-w-[12rem]",
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
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2.5 block text-sm font-medium text-textSecondary">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          "w-full rounded-2xl border bg-white px-5 py-4 text-lg text-textPrimary outline-none transition",
          "placeholder:text-slate-400 focus:ring-4",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-gray-200 focus:border-blue-300 focus:ring-blue-100",
        ].join(" ")}
      />
    </label>
  );
}

function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-8 text-[1.75rem] font-bold leading-tight tracking-tight text-textPrimary sm:text-4xl">
      {children}
    </h1>
  );
}

export default function ServiceSearchFlow({ text }: ServiceSearchFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("start");
  const [service, setService] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageOption["value"] | null>(null);
  const [selectedFormat, setSelectedFormat] =
    useState<FormatOption["value"] | null>(null);
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const progressStep = getProgressStep(step);

  function goToServiceStep() {
    setError(null);
    setStep("service");
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
      buildResultsUrl({
        service,
        language: selectedLanguage,
        format,
        location: locationValue,
      })
    );
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    redirectToResults("nearby", location);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-xl">
        {step === "start" ? (
          <FlowCard centered>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-blue-700/70">
              Freuly
            </p>
            <h1 className="mb-10 text-[2rem] font-bold leading-[1.15] tracking-tight text-textPrimary sm:text-5xl">
              {text.startHeadline}
            </h1>
            <PrimaryButton onClick={goToServiceStep} className="sm:mx-auto">
              {text.startCta}
            </PrimaryButton>
          </FlowCard>
        ) : null}

        {step === "service" ? (
          <FlowCard progressStep={progressStep}>
            <BackButton label={text.backCta} onClick={goBack} />
            <StepTitle>{text.serviceQuestion}</StepTitle>

            <form onSubmit={handleServiceSubmit} className="space-y-6">
              <TextField
                id="service-query"
                label={text.serviceInputLabel}
                value={service}
                placeholder={text.serviceInputPlaceholder}
                error={error}
                onChange={(value) => {
                  setService(value);
                  if (error) setError(null);
                }}
              />

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <PrimaryButton type="submit">{text.nextCta}</PrimaryButton>
            </form>
          </FlowCard>
        ) : null}

        {step === "language" ? (
          <FlowCard progressStep={progressStep}>
            <BackButton label={text.backCta} onClick={goBack} />
            <StepTitle>{text.languageQuestion}</StepTitle>

            <div className="grid gap-3 sm:grid-cols-1">
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
          <FlowCard progressStep={progressStep}>
            <BackButton label={text.backCta} onClick={goBack} />
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
                    <span className="mt-1.5 block text-sm leading-relaxed text-textSecondary">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </FlowCard>
        ) : null}

        {step === "location" ? (
          <FlowCard progressStep={progressStep}>
            <BackButton label={text.backCta} onClick={goBack} />
            <StepTitle>{text.locationQuestion}</StepTitle>

            <form onSubmit={handleLocationSubmit} className="space-y-6">
              <TextField
                id="service-location"
                label={text.locationInputLabel}
                value={location}
                placeholder={text.locationInputPlaceholder}
                error={error}
                onChange={(value) => {
                  setLocation(value);
                  if (error) setError(null);
                }}
              />

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <PrimaryButton type="submit">{text.nextCta}</PrimaryButton>
            </form>
          </FlowCard>
        ) : null}
      </div>
    </main>
  );
}
