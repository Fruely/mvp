import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, isSupportedLang, t, type Dictionary, type Lang } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import {
  isPaidPlanCode,
  PLAN_CATALOG,
  parsePaidPlanCode,
  parsePlanCode,
  type PlanCode,
} from "@/lib/billing/plans";
import PlanCheckoutButton from "@/components/billing/PlanCheckoutButton";

export const dynamic = "force-dynamic";

function planLabel(dict: Dictionary, code: PlanCode): string {
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

export default async function SpecialistDashboardBillingPage({
  params,
  searchParams,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
  searchParams: { plan?: string; checkout?: string } | Promise<{ plan?: string; checkout?: string }>;
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
  const checkoutNotice =
    resolvedSearch.checkout === "success"
      ? t(dict, "dashboard.billingPage.checkout.successNotice")
      : resolvedSearch.checkout === "cancel"
        ? t(dict, "dashboard.billingPage.checkout.cancelNotice")
        : null;

  const mailtoHref = `mailto:info@freuly.de?subject=${encodeURIComponent(
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
          {t(dict, "dashboard.billingPage.currentPlanLabel")}{" "}
          <span className="font-semibold text-gray-900">{planLabel(dict, currentPlanCode)}</span>
          {" · "}
          <span className="text-gray-700">{statusLabel(dict, plan.plan_status)}</span>
        </p>
      </section>

      {checkoutNotice ? (
        <section className="rounded-2xl border border-indigo-100/90 bg-indigo-50/40 px-5 py-4 text-sm text-gray-700">
          {checkoutNotice}
        </section>
      ) : null}

      <section className="rounded-2xl border border-amber-100/90 bg-gradient-to-b from-amber-50/50 to-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.billingPage.disabledTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700 sm:text-base">
          {t(dict, "dashboard.billingPage.disabledBody")}
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.billingPage.planPicker.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          {t(dict, "dashboard.billingPage.planPicker.subtitle")}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PLAN_CATALOG.map((entry) => {
            const isCurrent = currentPlanCode === entry.code;
            const isSelected = selectedPaidPlan === entry.code;
            const pricingKey = `pricing.${entry.code}.name`;
            const pricingName = t(dict, pricingKey);

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
                <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-600">
                  {entry.isPaid
                    ? t(dict, "dashboard.billingPage.planPicker.paidHint")
                    : t(dict, "dashboard.billingPage.planPicker.freeHint")}
                </p>
                {isPaidPlanCode(entry.code) ? (
                  <div className="mt-4">
                    <PlanCheckoutButton planCode={entry.code} lang={lang} dict={dict} />
                  </div>
                ) : (
                  <p className="mt-4 text-xs font-medium text-emerald-700">
                    {t(dict, "dashboard.billingPage.planPicker.starterActive")}
                  </p>
                )}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="text-sm font-semibold text-gray-900">
            {t(dict, "dashboard.billingPage.paymentsTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {t(dict, "dashboard.billingPage.paymentsBody")}
          </p>
        </section>
        <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="text-sm font-semibold text-gray-900">
            {t(dict, "dashboard.billingPage.invoiceTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {t(dict, "dashboard.billingPage.invoiceBody")}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/35 to-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.billingPage.futureTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700">
          {t(dict, "dashboard.billingPage.futureBody")}
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
