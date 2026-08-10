import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";

export type OnboardingServicesSummary = {
  totalServices: number;
  activeServices: number;
  hasValidServiceForPublish: boolean;
};

export default function OnboardingServicesStep({
  dict,
  lang,
  summary,
}: {
  dict: Dictionary;
  lang: string;
  summary: OnboardingServicesSummary;
}) {
  const servicesHrefWithContext = `/${lang}/specialist/dashboard/services?from=onboarding`;
  const nextStepHref = `/${lang}/specialist/dashboard/onboarding?step=photos`;
  const hasValidService = summary.hasValidServiceForPublish;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "dashboard.onboarding.servicesStep.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t(dict, "dashboard.onboarding.servicesStep.body")}
        </p>
      </div>

      <div
        className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
          hasValidService
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <p className="font-semibold">
          {hasValidService
            ? t(dict, "dashboard.onboarding.servicesStep.validMessage")
            : t(dict, "dashboard.onboarding.servicesStep.missingMessage")}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={hasValidService ? nextStepHref : servicesHrefWithContext}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {hasValidService
            ? t(dict, "dashboard.onboarding.servicesStep.continueToPhoto")
            : t(dict, "dashboard.onboarding.servicesStep.openServices")}
        </Link>
      </div>
    </section>
  );
}
