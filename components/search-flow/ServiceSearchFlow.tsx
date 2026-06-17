"use client";

import { useState } from "react";
import type { FormEvent } from "react";

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
  nextCta: string;
  backCta: string;
  emptyServiceError: string;
};

type Step = "start" | "service" | "language" | "format";

type ServiceSearchFlowProps = {
  text: FlowText;
};

export default function ServiceSearchFlow({ text }: ServiceSearchFlowProps) {
  const [step, setStep] = useState<Step>("start");
  const [service, setService] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageOption["value"] | null>(null);
  const [selectedFormat, setSelectedFormat] =
    useState<FormatOption["value"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function goToServiceStep() {
    setError(null);
    setStep("service");
  }

  function goBack() {
    setError(null);

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="mx-auto w-full max-w-3xl text-center">
        {step === "start" ? (
          <section className="rounded-[2rem] bg-white/70 px-6 py-12 shadow-sm ring-1 ring-blue-100 backdrop-blur sm:px-10 sm:py-16">
            <h1 className="mb-8 text-4xl font-bold leading-tight text-textPrimary sm:text-5xl md:text-6xl">
              {text.startHeadline}
            </h1>

            <button
              type="button"
              onClick={goToServiceStep}
              className="btn-primary px-8 py-4 text-lg"
            >
              {text.startCta}
            </button>
          </section>
        ) : null}

        {step === "service" ? (
          <section className="rounded-[2rem] bg-white/80 px-6 py-10 text-left shadow-sm ring-1 ring-blue-100 backdrop-blur sm:px-10 sm:py-12">
            <button
              type="button"
              onClick={goBack}
              className="mb-8 text-sm font-medium text-textSecondary transition hover:text-textPrimary"
            >
              ← {text.backCta}
            </button>

            <h1 className="mb-8 text-3xl font-bold leading-tight text-textPrimary sm:text-4xl md:text-5xl">
              {text.serviceQuestion}
            </h1>

            <form onSubmit={handleServiceSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-textSecondary">
                  {text.serviceInputLabel}
                </span>

                <input
                  value={service}
                  onChange={(event) => {
                    setService(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={text.serviceInputPlaceholder}
                  className="w-full rounded-2xl border border-blue-100 bg-white px-5 py-4 text-lg text-textPrimary outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {error ? (
                <p className="text-sm font-medium text-red-600">{error}</p>
              ) : null}

              <button type="submit" className="btn-primary px-8 py-4 text-lg">
                {text.nextCta}
              </button>
            </form>
          </section>
        ) : null}

        {step === "language" ? (
          <section className="rounded-[2rem] bg-white/80 px-6 py-10 text-left shadow-sm ring-1 ring-blue-100 backdrop-blur sm:px-10 sm:py-12">
            <button
              type="button"
              onClick={goBack}
              className="mb-8 text-sm font-medium text-textSecondary transition hover:text-textPrimary"
            >
              ← {text.backCta}
            </button>

            <h1 className="mb-8 text-3xl font-bold leading-tight text-textPrimary sm:text-4xl md:text-5xl">
              {text.languageQuestion}
            </h1>

            <div className="grid gap-3 sm:grid-cols-3">
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
                    className={`rounded-2xl border px-5 py-4 text-lg font-semibold transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100"
                        : "border-blue-100 bg-white text-textPrimary hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === "format" ? (
          <section className="rounded-[2rem] bg-white/80 px-6 py-10 text-left shadow-sm ring-1 ring-blue-100 backdrop-blur sm:px-10 sm:py-12">
            <button
              type="button"
              onClick={goBack}
              className="mb-8 text-sm font-medium text-textSecondary transition hover:text-textPrimary"
            >
              ← {text.backCta}
            </button>

            <h1 className="mb-8 text-3xl font-bold leading-tight text-textPrimary sm:text-4xl md:text-5xl">
              {text.formatQuestion}
            </h1>

            <div className="grid gap-3">
              {text.formatOptions.map((option) => {
                const isSelected = selectedFormat === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedFormat(option.value)}
                    className={`rounded-2xl border px-5 py-4 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100"
                        : "border-blue-100 bg-white text-textPrimary hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="block text-lg font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-sm text-textSecondary">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
