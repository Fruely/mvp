import Link from "next/link";
import { redirect } from "next/navigation";
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
import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";
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

  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();
  const dict = await getDictionary(lang);

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

  const checkoutNotice =
    resolvedSearch.checkout === "success"
      ? t(dict, "dashboard.billingPage.checkout.processingNotice")
      : resolvedSearch.checkout === "cancel"
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/90">
          {t(dict, "dashboard.billingPage.kicker")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {t(dict, "dashboard.billingPage.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
          {t(dict, "dashboard.billingPage.subtitle")}
        </p>
        <p className="mt-4 text-sm text-gray-600">
          {(isGrace || isInactive)
            ? t(dict, "dashboard.billingPage.lastPlanLabel")
            : t(dict, "dashboard.billingPage.currentPlanLabel")}{" "}
          <span className="font-semibold text-gray-900">{planLabel(dict, currentPlanCode)}</span>
          {" · "}
          <span className="text-gray-700">{statusLabel(dict, plan.plan_status)}</span>
        </p>
      </section>

      {isGrace ? (
        <section className="rounded-2xl border border-amber-200/90 bg-amber-50/55 px-5 py-4 text-sm leading-relaxed text-amber-950">
          {graceUntilFormatted
            ? t(dict, "dashboard.billingPage.graceNotice").replace("{{graceUntil}}", graceUntilFormatted)
            : t(dict, "dashboard.billingPage.graceNoticeNoDays")}
        </section>
      ) : null}

      {isInactive ? (
        <section className="rounded-2xl border border-rose-200/90 bg-rose-50/70 px-5 py-4 text-sm leading-relaxed text-rose-950">
          {t(dict, "dashboard.billingPage.inactiveNotice")}
        </section>
      ) : null}

      {checkoutNotice ? (
        <section className="rounded-2xl border border-indigo-100/90 bg-indigo-50/40 px-5 py-4 text-sm text-gray-700">
          {checkoutNotice}
        </section>
      ) : null}

      {promotedCheckoutNotice ? (
        <section className="rounded-2xl border border-indigo-100/90 bg-indigo-50/40 px-5 py-4 text-sm text-gray-700">
          <p>{promotedCheckoutNotice}</p>
          <p className="mt-3">
            <Link
              href={promotedRequestHref}
              className="font-medium text-indigo-700 underline-offset-4 hover:underline"
            >
              {t(dict, "dashboard.billingPage.promotedCheckout.backToRequest")}
            </Link>
          </p>
        </section>
      ) : null}

      {checkoutDisabledBannerVisible ? (
        <section className="rounded-2xl border border-amber-100/90 bg-gradient-to-b from-amber-50/50 to-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-gray-900">
            {t(dict, "dashboard.billingPage.disabledTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700 sm:text-base">
            {t(dict, "dashboard.billingPage.disabledBody")}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.billingPage.planPicker.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          {t(dict, "dashboard.billingPage.planPicker.subtitle")}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                className={`flex flex-col rounded-xl border p-5 ${
                  isCurrent || isSelected
                    ? "border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-500/10"
                    : "border-gray-200 bg-gray-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {pricingName !== pricingKey ? pricingName : planLabel(dict, entry.code)}
                  </h3>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      {t(dict, "dashboard.billingPage.planPicker.currentBadge")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{priceLabel}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-600">
                  {entry.code === "basic"
                    ? t(dict, "dashboard.billingPage.planPicker.professionalHint")
                    : t(dict, "dashboard.billingPage.planPicker.growthHint")}
                </p>
                <div className="mt-4">
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
        <p className="mt-5 text-sm">
          <Link href={pricingHref} className="font-medium text-indigo-700 underline-offset-4 hover:underline">
            {t(dict, "dashboard.billingPage.planPicker.viewAllPlans")}
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <Link
          href={subscriptionHref}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
        >
          {t(dict, "dashboard.billingPage.backToSubscription")}
        </Link>
        <a
          href={mailtoHref}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          {t(dict, "dashboard.billingPage.contactSupport")}
        </a>
      </section>
    </div>
  );
}
