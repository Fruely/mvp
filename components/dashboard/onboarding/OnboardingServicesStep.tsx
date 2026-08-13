import Link from "next/link";
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { dashboardLinkPrimaryClass } from "@/components/dashboard/dashboardStyles";
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
    <Card padding="lg" className="shadow-none">
      <CardHeader>
        <CardTitle className="text-freuly-card-title">
          {t(dict, "dashboard.onboarding.servicesStep.title")}
        </CardTitle>
        <p className="mt-freuly-2 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">
          {t(dict, "dashboard.onboarding.servicesStep.body")}
        </p>
      </CardHeader>

      <CardContent>
        <Alert variant={hasValidService ? "success" : "warning"}>
          <p className="font-semibold text-freuly-text-primary">
            {hasValidService
              ? t(dict, "dashboard.onboarding.servicesStep.validMessage")
              : t(dict, "dashboard.onboarding.servicesStep.missingMessage")}
          </p>
        </Alert>

        <div className="mt-freuly-5 flex flex-wrap items-center gap-freuly-3">
          <Link
            href={hasValidService ? nextStepHref : servicesHrefWithContext}
            className={dashboardLinkPrimaryClass}
          >
            {hasValidService
              ? t(dict, "dashboard.onboarding.servicesStep.continueToPhoto")
              : t(dict, "dashboard.onboarding.servicesStep.openServices")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
