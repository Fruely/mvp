import Link from "next/link";
import { redirect } from "next/navigation";
import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import PlanVisualPreview from "@/components/pricing/PlanVisualPreview";
import PublishWithoutSubscriptionButton from "@/components/dashboard/onboarding/PublishWithoutSubscriptionButton";
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getDemandChannelCopy } from "@/lib/dashboard/demandChannelCopy";
import { getDictionary, resolveRouteLang, t, type Lang } from "@/lib/i18n";
import { PUBLIC_COMMERCIAL_PLAN_CATALOG } from "@/lib/billing/plans";
import { isBillingPagePlanCheckoutEnabled } from "@/lib/billing/billingPageCheckoutReadiness";
import { dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";
import { getPublicPricingCopy } from "@/lib/pricing/publicPricingCopy";
import { brandPlanText, PLAN_DISPLAY_NAMES } from "@/lib/pricing/planDisplayBranding";
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
  const lang: Lang = resolveRouteLang(resolved.lang);
  const [dict, { specialist }] = await Promise.all([
    getDictionary(lang),
    getCurrentUserAndSpecialist(),
  ]);
  const copy = getDemandChannelCopy(lang);
  const pricingCopy = getPublicPricingCopy(lang);

  const isDraft = !specialist.status || specialist.status === "draft";
  let draftReady = false;

  if (isDraft) {
    const gate = await getSpecialistOnboardingGateState(specialist);
    if (gate.state !== "ready") {
      redirect(`/${lang}/specialist/dashboard/onboarding`);
    }
    draftReady = true;
  }

  return (
    <div className="space-y-freuly-6">
      <DashboardPageHeader
        kicker={brandPlanText(copy.billing.kicker)}
        title={brandPlanText(copy.billing.title)}
        subtitle={brandPlanText(copy.billing.subtitle)}
      />

      <Alert variant="info" title={brandPlanText(copy.billing.introTitle)}>
        {brandPlanText(copy.billing.introBody)}
      </Alert>

      <Alert variant="warning">{brandPlanText(copy.billing.draftNotice)}</Alert>

      {draftReady ? (
        <Card className="border-freuly-primary/25 bg-freuly-primary-light/20">
          <CardHeader>
            <CardTitle>{brandPlanText(copy.onboarding.publishWithoutSubscription)}</CardTitle>
            <p className="mt-freuly-2 max-w-3xl text-freuly-body text-freuly-text-secondary">
              {brandPlanText(copy.onboarding.reviewReadyBody)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-start gap-freuly-3">
              <PublishWithoutSubscriptionButton
                lang={lang}
                enabled={draftReady}
                publishLabel={copy.onboarding.publishWithoutSubscription}
                publishingLabel={copy.onboarding.publishingWithoutSubscription}
                errorLabel={copy.onboarding.publishFailed}
              />
              <Link
                href={`/${lang}/specialist/dashboard/onboarding?step=review`}
                className={dashboardLinkSecondaryClass}
              >
                {brandPlanText(copy.onboarding.decideLater)}
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{brandPlanText(copy.billing.planPickerTitle)}</CardTitle>
          <p className="mt-freuly-2 max-w-3xl text-freuly-body text-freuly-text-secondary">
            {brandPlanText(copy.billing.planPickerSubtitle)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-freuly-4 md:grid-cols-2">
            {PUBLIC_COMMERCIAL_PLAN_CATALOG.map((entry) => {
              const professional = entry.code === "basic";
              const priceKey = professional ? "pricing.professional.price" : "pricing.growth.price";
              const displayName = professional ? PLAN_DISPLAY_NAMES.basic : PLAN_DISPLAY_NAMES.premium;

              return (
                <div
                  key={entry.code}
                  className={`flex flex-col rounded-freuly-card border p-freuly-5 ${
                    professional
                      ? "border-freuly-border-default bg-white"
                      : "border-freuly-primary/30 bg-freuly-primary-light/20 ring-1 ring-freuly-primary/10"
                  }`}
                >
                  <h2 className="text-freuly-card-title text-freuly-text-primary">{displayName}</h2>
                  <p className="mt-freuly-2 text-xl font-semibold text-freuly-text-primary">{t(dict, priceKey)}</p>
                  <p className="mt-freuly-3 flex-1 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
                    {brandPlanText(professional ? copy.billing.professionalHint : copy.billing.growthHint)}
                  </p>
                  <PlanVisualPreview
                    plan={professional ? "professional" : "growth"}
                    lang={lang}
                    label={brandPlanText(
                      professional ? pricingCopy.preview.professionalLabel : pricingCopy.preview.growthLabel,
                    )}
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
              {brandPlanText(copy.billing.decideLater)}
            </Link>
            <Link
              href={`/${lang}/pricing`}
              className="text-freuly-body-sm font-medium text-freuly-primary underline-offset-4 hover:underline"
            >
              {brandPlanText(t(dict, "dashboard.billingPage.planPicker.viewAllPlans"))}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
