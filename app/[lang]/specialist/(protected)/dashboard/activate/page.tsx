import Link from "next/link";
import { redirect } from "next/navigation";
import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import PlanVisualPreview from "@/components/pricing/PlanVisualPreview";
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getDemandChannelCopy } from "@/lib/dashboard/demandChannelCopy";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { PUBLIC_COMMERCIAL_PLAN_CATALOG } from "@/lib/billing/plans";
import { isBillingPagePlanCheckoutEnabled } from "@/lib/billing/billingPageCheckoutReadiness";
import { dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";
import { getPublicPricingCopy } from "@/lib/pricing/publicPricingCopy";
import {
  getCurrentUserAndSpecialist,
  getSpecialistOnboardingGateState,
} from "@/lib/specialists/server";

export const dynamic = "force-dynamic";

export default async function SpecialistDemandChannelActivationPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";
  const [dict, { specialist }] = await Promise.all([
    getDictionary(lang),
    getCurrentUserAndSpecialist(),
  ]);
  const copy = getDemandChannelCopy(lang);
  const pricingCopy = getPublicPricingCopy(lang);

  if (!specialist.status || specialist.status === "draft") {
    const gate = await getSpecialistOnboardingGateState(specialist);
    if (gate.state !== "ready") {
      redirect(`/${lang}/specialist/dashboard/onboarding`);
    }
  }

  return (
    <div className="space-y-freuly-6">
      <DashboardPageHeader
        kicker={copy.billing.kicker}
        title={copy.billing.title}
        subtitle={copy.billing.subtitle}
      />

      <Alert variant="info" title={copy.billing.introTitle}>
        {copy.billing.introBody}
      </Alert>

      <Alert variant="warning">{copy.billing.draftNotice}</Alert>

      <Card>
        <CardHeader>
          <CardTitle>{copy.billing.planPickerTitle}</CardTitle>
          <p className="mt-freuly-2 max-w-3xl text-freuly-body text-freuly-text-secondary">
            {copy.billing.planPickerSubtitle}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-freuly-4 md:grid-cols-2">
            {PUBLIC_COMMERCIAL_PLAN_CATALOG.map((entry) => {
              const professional = entry.code === "basic";
              const nameKey = professional ? "pricing.professional.name" : "pricing.growth.name";
              const priceKey = professional ? "pricing.professional.price" : "pricing.growth.price";

              return (
                <div
                  key={entry.code}
                  className={`flex flex-col rounded-freuly-card border p-freuly-5 ${
                    professional
                      ? "border-freuly-border-default bg-white"
                      : "border-freuly-primary/30 bg-freuly-primary-light/20 ring-1 ring-freuly-primary/10"
                  }`}
                >
                  <h2 className="text-freuly-card-title text-freuly-text-primary">{t(dict, nameKey)}</h2>
                  <p className="mt-freuly-2 text-xl font-semibold text-freuly-text-primary">{t(dict, priceKey)}</p>
                  <p className="mt-freuly-3 flex-1 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
                    {professional ? copy.billing.professionalHint : copy.billing.growthHint}
                  </p>
                  <PlanVisualPreview
                    plan={professional ? "professional" : "growth"}
                    lang={lang}
                    label={professional ? pricingCopy.preview.professionalLabel : pricingCopy.preview.growthLabel}
                  />
                  <div className="mt-freuly-5">
                    <PlanCheckoutButton
                      planCode={entry.code}
                      lang={lang}
                      dict={dict}
                      checkoutEnabled={isBillingPagePlanCheckoutEnabled(entry.code)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-freuly-5 flex flex-wrap items-center gap-freuly-4">
            <Link href={`/${lang}/specialist/dashboard`} className={dashboardLinkSecondaryClass}>
              {copy.billing.decideLater}
            </Link>
            <Link
              href={`/${lang}/pricing`}
              className="text-freuly-body-sm font-medium text-freuly-primary underline-offset-4 hover:underline"
            >
              {t(dict, "dashboard.billingPage.planPicker.viewAllPlans")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
