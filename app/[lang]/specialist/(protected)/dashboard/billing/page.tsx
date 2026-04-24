import Link from "next/link";
import { redirect } from "next/navigation";
import {
  manualInvoicesEnabled,
  paymentsEnabled,
  subscriptionEnforcementEnabled,
  subscriptionPublicPaidCopyEnabled,
} from "@/lib/billing/featureFlags";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";

export const dynamic = "force-dynamic";

export default async function SpecialistDashboardBillingPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";

  const { specialist } = await getCurrentUserAndSpecialist();
  const dict = await getDictionary(lang);

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const mailtoHref = `mailto:info@freuly.de?subject=${encodeURIComponent(
    t(dict, "dashboard.billingPage.mailtoSubject")
  )}`;

  const subscriptionHref = `/${lang}/specialist/dashboard/subscription`;

  return (
    <div
      className="space-y-8"
      data-payments-enabled={String(paymentsEnabled)}
      data-subscription-enforcement-enabled={String(subscriptionEnforcementEnabled)}
      data-subscription-public-paid-copy-enabled={String(subscriptionPublicPaidCopyEnabled)}
      data-manual-invoices-enabled={String(manualInvoicesEnabled)}
    >
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
      </section>

      <section className="rounded-2xl border border-amber-100/90 bg-gradient-to-b from-amber-50/50 to-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.billingPage.disabledTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700 sm:text-base">
          {t(dict, "dashboard.billingPage.disabledBody")}
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
