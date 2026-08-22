import Link from "next/link";
import { redirect } from "next/navigation";
import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";
import PremiumProActivationPoller from "@/components/billing/PremiumProActivationPoller";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardLinkPrimaryClass,
  dashboardLinkSecondaryClass,
  dashboardPageStackClass,
} from "@/components/dashboard/dashboardStyles";
import { Alert, Badge, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import { getDictionary, isSupportedLang, t, type Dictionary, type Lang } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import {
  PUBLIC_COMMERCIAL_PLAN_CATALOG,
  parsePaidPlanCode,
  parsePlanCode,
  type PlanCode,
} from "@/lib/billing/plans";
import {
  isBillingPageCheckoutDisabledBannerVisible,
  isBillingPagePlanCheckoutEnabled,
} from "@/lib/billing/billingPageCheckoutReadiness";
import { isPlanCardCurrent } from "@/lib/specialists/subscriptionDisplay";

export const dynamic = "force-dynamic";

function planLabel(dict: Dictionary, code: PlanCode): string {
  const commercialKey =
    code === "basic"
      ? "pricing.professional.name"
      : code === "premium"
        ? "pricing.growth.name"
        : null;
  if (commercialKey) {
    const commercial = t(dict, commercialKey);
    if (commercial !== commercialKey) return commercial;
  }

  const key = `dashboard.subscriptionPage.plan.${code}`;
  const translated = t(dict, key);
  return translated !== key ? translated : code;
}

function statusLabel(dict: Dictionary, planStatus: string): string {
  const raw = planStatus.trim().toLowerCase();
  const key = `dashboard.subscriptionPage.status.${raw}`;
  const translated = t(dict, key);
  if (translated !== key) return translated;
  return t(dict, "dashboard.subscriptionPage.status.unknown");
}

function formatPlanDate(value: string | null, lang: Lang): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale);
}

export default async function SpecialistDashboardBillingPage({
  params,
  searchParams,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
  searchParams: { plan?: string; checkout?: string; promoted_checkout?: string } | Promise<{
    plan?: string;
    checkout?: string;
    promoted_checkout?: string;
  }>;
}) {
  const resolved = await Promise.resolve(params);
  const resolvedSearch = await Promise.resolve(searchParams);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";

  const [{ specialist }, dict] = await Promise.all([
    getCurrentUserAndSpecialist(),
    getDictionary(lang),
  ]);
  const service = createServiceClient();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const plan = await getSpecialistPlanForDashboard(service, specialist.id);
  const currentPlanCode = parsePlanCode(plan.plan_code) ?? "starter";
  const selectedPaidPlan = parsePaidPlanCode(resolvedSearch.plan);
  const checkoutDisabledBannerVisible = isBillingPageCheckoutDisabledBannerVisible();
  const planStatus = (plan.plan_status ?? "").trim().toLowerCase();

  const isGrace = planStatus === "grace" || planStatus === "grace_period";
  const isInactive = planStatus === "inactive";
  const graceUntilFormatted = isGrace ? formatPlanDate(plan.grace_until, lang) : null;

  const isPremiumCheckoutSuccess =
    resolvedSearch.checkout === "success" && selectedPaidPlan === "premium";
  const isBasicCheckoutSuccess =
    resolvedSearch.checkout === "success" && selectedPaidPlan === "basic";
  const isCheckoutCancelled =
    resolvedSearch.checkout === "cancel" || resolvedSearch.checkout === "cancelled";

  const checkoutNotice = isBasicCheckoutSuccess
    ? t(dict, "dashboard.billingPage.checkout.processingNotice")
    : null;
  const cancelNotice = isCheckoutCancelled
    ? t(dict, "dashboard.billingPage.checkout.cancelNotice")
    : null;

  const promotedCheckoutNotice =
    resolvedSearch.promoted_checkout === "success"
      ? t(dict, "dashboard.billingPage.promotedCheckout.processingNotice")
      : resolvedSearch.promoted_checkout === "cancel"
        ? t(dict, "dashboard.billingPage.promotedCheckout.cancelNotice")
        : null;

  const promotedRequestHref = `/${lang}/specialist/dashboard/requests/promoted`;
  const mailtoHref = `mailto:freuly.de@gmail.com?subject=${encodeURIComponent(
    t(dict, "dashboard.billingPage.mailtoSubject"),
  )}`;
  const subscriptionHref = `/${lang}/specialist/dashboard/subscription`;
  const pricingHref = `/${lang}/pricing`;
  const proPageHref = `/${lang}/specialist/dashboard/pro-page`;

  return (
    <div className={dashboardPageStackClass}>
      <DashboardPageHeader
        kicker={t(dict, "dashboard.billingPage.kicker")}
        title={t(dict, "dashboard.billingPage.title")}
        subtitle={t(dict, "dashboard.billingPage.subtitle")}
      />

      <Card>
        <CardContent className="pt-freuly-6 text-freuly-body text-freuly-text-secondary">
          {(isGrace || isInactive)
            ? t(dict, "dashboard.billingPage.lastPlanLabel")
            : t(dict, "dashboard.billingPage.currentPlanLabel")}{" "}
          <span className="font-semibold text-freuly-text-primary">{planLabel(dict, currentPlanCode)}</span>
          {" · "}
          <span>{statusLabel(dict, plan.plan_status)}</span>
        </CardContent>
      </Card>

      {isGrace ? (
        <Alert variant="warning">
          {graceUntilFormatted
            ? t(dict, "dashboard.billingPage.graceNotice").replace("{{graceUntil}}", graceUntilFormatted)
            : t(dict, "dashboard.billingPage.graceNoticeNoDays")}
        </Alert>
      ) : null}

      {isInactive ? (
        <Alert variant="error">{t(dict, "dashboard.billingPage.inactiveNotice")}</Alert>
      ) : null}

      {isPremiumCheckoutSuccess ? (
        <PremiumProActivationPoller
          proPageHref={proPageHref}
          billingHref={`/${lang}/specialist/dashboard/billing`}
          activatingLabel={t(dict, "dashboard.billingPage.proActivation.activating")}
          timeoutLabel={t(dict, "dashboard.billingPage.proActivation.timeout")}
          backToBillingLabel={t(dict, "dashboard.billingPage.proActivation.backToBilling")}
        />
      ) : null}

      {checkoutNotice ? <Alert variant="info">{checkoutNotice}</Alert> : null}

      {cancelNotice ? <Alert variant="info">{cancelNotice}</Alert> : null}

      {promotedCheckoutNotice ? (
        <Alert variant="info">
          <p>{promotedCheckoutNotice}</p>
          <p className="mt-freuly-3">
            <Link href={promotedRequestHref} className="font-medium text-freuly-primary underline-offset-4 hover:underline">
              {t(dict, "dashboard.billingPage.promotedCheckout.backToRequest")}
            </Link>
          </p>
        </Alert>
      ) : null}

      {checkoutDisabledBannerVisible ? (
        <Card>
          <CardHeader>
            <CardTitle>{t(dict, "dashboard.billingPage.disabledTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-2xl text-freuly-body leading-relaxed text-freuly-text-secondary">
              {t(dict, "dashboard.billingPage.disabledBody")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t(dict, "dashboard.billingPage.planPicker.title")}</CardTitle>
          <p className="mt-freuly-2 max-w-2xl text-freuly-body text-freuly-text-secondary">
            {t(dict, "dashboard.billingPage.planPicker.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-freuly-4 md:grid-cols-2">
            {PUBLIC_COMMERCIAL_PLAN_CATALOG.map((entry) => {
              const isCurrent = isPlanCardCurrent(entry.code, currentPlanCode, planStatus);
              const isSelected = selectedPaidPlan === entry.code;
              const pricingKey =
                entry.code === "basic" ? "pricing.professional.name" : "pricing.growth.name";
              const pricingName = t(dict, pricingKey);
              const priceKey =
                entry.code === "basic" ? "pricing.professional.price" : "pricing.growth.price";
              const priceLabel = t(dict, priceKey);

              return (
                <div
                  key={entry.code}
                  className={`flex flex-col rounded-freuly-card border p-freuly-5 ${
                    isCurrent || isSelected
                      ? "border-freuly-primary/30 bg-freuly-primary-light/25 ring-1 ring-freuly-primary/10"
                      : "border-freuly-border-default bg-freuly-border-subtle/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-freuly-card-title text-freuly-text-primary">
                      {pricingName !== pricingKey ? pricingName : planLabel(dict, entry.code)}
                    </h3>
                    {isCurrent ? (
                      <Badge variant="info">{t(dict, "dashboard.billingPage.planPicker.currentBadge")}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-freuly-2 text-freuly-body font-semibold text-freuly-text-primary">{priceLabel}</p>
                  <p className="mt-freuly-2 flex-1 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
                    {entry.code === "basic"
                      ? t(dict, "dashboard.billingPage.planPicker.professionalHint")
                      : t(dict, "dashboard.billingPage.planPicker.growthHint")}
                  </p>
                  <div className="mt-freuly-4">
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
          <p className="mt-freuly-5 text-freuly-body-sm">
            <Link href={pricingHref} className="font-medium text-freuly-primary underline-offset-4 hover:underline">
              {t(dict, "dashboard.billingPage.planPicker.viewAllPlans")}
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardFooter className="mt-0 flex-col gap-freuly-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href={subscriptionHref} className={dashboardLinkSecondaryClass}>
            {t(dict, "dashboard.billingPage.backToSubscription")}
          </Link>
          <a href={mailtoHref} className={dashboardLinkPrimaryClass}>
            {t(dict, "dashboard.billingPage.contactSupport")}
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
