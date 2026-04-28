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
  const hasValidService = summary.hasValidServiceForPublish;
  const servicesHrefWithContext = `/${lang}/specialist/dashboard/services?from=onboarding`;
  const photosHref = `/${lang}/specialist/dashboard/onboarding?step=photos`;

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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t(dict, "dashboard.onboarding.servicesStep.totalServices")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
            {summary.totalServices}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t(dict, "dashboard.onboarding.servicesStep.activeServices")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
            {summary.activeServices}
          </p>
        </div>
      </div>

      <div
        className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
          hasValidService
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {hasValidService
          ? t(dict, "dashboard.onboarding.servicesStep.validMessage")
          : t(dict, "dashboard.onboarding.servicesStep.missingMessage")}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={hasValidService ? photosHref : servicesHrefWithContext}
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
