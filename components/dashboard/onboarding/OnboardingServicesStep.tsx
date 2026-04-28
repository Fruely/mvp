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
}: {
  dict: Dictionary;
  lang: string;
}) {
  const servicesHrefWithContext = `/${lang}/specialist/dashboard/services?from=onboarding`;

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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={servicesHrefWithContext}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t(dict, "dashboard.onboarding.servicesStep.openServices")}
        </Link>
      </div>
    </section>
  );
}
