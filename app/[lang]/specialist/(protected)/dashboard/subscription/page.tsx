import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  dashboardNoticeTitleBody,
  getSubscriptionDisplayState,
  pickDashboardSubscriptionNotice,
  subscriptionNoticePanelClass,
} from "@/lib/specialists/subscriptionDisplay";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getDictionary, isSupportedLang, t, type Dictionary, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function getStatusBadgeClass(planStatus: string): string {
  if (planStatus === "early_access" || planStatus === "trialing") return "bg-emerald-50 text-emerald-700";
  if (planStatus === "active") return "bg-blue-50 text-blue-700";
  if (planStatus === "grace" || planStatus === "grace_period") return "bg-amber-50 text-amber-700";
  if (planStatus === "inactive") return "bg-rose-50 text-rose-700";
  if (planStatus === "expired") return "bg-rose-50 text-rose-700";
  if (planStatus === "cancelled") return "bg-slate-100 text-slate-700";
  return "bg-gray-100 text-gray-700";
}

function formatPlanDate(value: string | null, lang: Lang, dict: Dictionary): string {
  if (!value) return t(dict, "dashboard.subscriptionPage.dateEmpty");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t(dict, "dashboard.subscriptionPage.dateEmpty");
  const locale = lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale);
}

function planDisplayLabel(dict: Dictionary, planCode: string): string {
  const code = planCode.trim().toLowerCase();
  const key = `dashboard.subscriptionPage.plan.${code}`;
  const translated = t(dict, key);
  if (translated !== key) return translated;
  return planCode.trim() || t(dict, "dashboard.subscriptionPage.plan.starter");
}

function statusDisplayLabel(dict: Dictionary, planStatus: string): string {
  const raw = planStatus.trim().toLowerCase();
  const key = `dashboard.subscriptionPage.status.${raw}`;
  const translated = t(dict, key);
  if (translated !== key) return translated;
  return t(dict, "dashboard.subscriptionPage.status.unknown");
}

export default async function SpecialistDashboardSubscriptionPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";

  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();
  const dict = await getDictionary(lang);

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const plan = await getSpecialistPlanForDashboard(service, specialist.id);
  const display = getSubscriptionDisplayState(plan);
  const subscriptionNoticePick = pickDashboardSubscriptionNotice(display);
  const subscriptionNoticeCopy = subscriptionNoticePick
    ? dashboardNoticeTitleBody(dict, subscriptionNoticePick)
    : null;

  const planStatusRaw = plan.plan_status;
  const statusLabel = statusDisplayLabel(dict, planStatusRaw);
  const planLabel = planDisplayLabel(dict, plan.plan_code);
  const subscriptionUntil = plan.expires_at;
  const graceUntil = plan.grace_until;
  const startedAt = plan.started_at;

  const mailSubject = t(dict, "dashboard.subscriptionPage.mailto.subject");
  const mailtoHref = `mailto:freuly.de@gmail.com?subject=${encodeURIComponent(mailSubject)}`;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/90">
          {t(dict, "dashboard.subscriptionPage.kicker")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {t(dict, "dashboard.subscriptionPage.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
          {t(dict, "dashboard.subscriptionPage.subtitle")}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/${lang}/pricing`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {t(dict, "dashboard.subscriptionPage.cta.viewPlans")}
          </Link>
          <Link
            href={`/${lang}/specialist/dashboard/billing`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            {t(dict, "dashboard.subscriptionPage.cta.manageBilling")}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.subscriptionPage.planCardTitle")}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t(dict, "dashboard.subscriptionPage.label.status")}
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(planStatusRaw)}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t(dict, "dashboard.subscriptionPage.label.plan")}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{planLabel}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t(dict, "dashboard.subscriptionPage.label.startedAt")}
            </p>
            <p className="mt-2 text-sm text-gray-800">{formatPlanDate(startedAt, lang, dict)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t(dict, "dashboard.subscriptionPage.label.expiresAt")}
            </p>
            <p className="mt-2 text-sm text-gray-800">{formatPlanDate(subscriptionUntil, lang, dict)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t(dict, "dashboard.subscriptionPage.label.graceUntil")}
            </p>
            <p className="mt-2 text-sm text-gray-800">{formatPlanDate(graceUntil, lang, dict)}</p>
          </div>
        </div>

        <a
          href={mailtoHref}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          {t(dict, "dashboard.subscriptionPage.cta.support")}
        </a>
      </section>

      <section className="rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/40 to-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.subscriptionPage.context.title")}
        </h2>
        {subscriptionNoticeCopy ? (
          <div
            className={`mt-4 ${subscriptionNoticePanelClass(subscriptionNoticeCopy.severity)}`}
          >
            <p className="font-semibold leading-snug">{subscriptionNoticeCopy.title}</p>
            <p className="mt-2 text-sm leading-relaxed opacity-[0.95]">{subscriptionNoticeCopy.body}</p>
          </div>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-600">
          <li className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden />
            <span>{t(dict, "dashboard.subscriptionPage.context.bulletPayment")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden />
            <span>{t(dict, "dashboard.subscriptionPage.context.bulletNotify")}</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">{t(dict, "dashboard.subscriptionPage.faq.title")}</h2>
        <dl className="mt-4 space-y-4 text-sm text-gray-700">
          <div>
            <dt className="font-medium text-gray-900">{t(dict, "dashboard.subscriptionPage.faq.contactsQ")}</dt>
            <dd className="mt-2 leading-relaxed">{t(dict, "dashboard.subscriptionPage.faq.contactsA")}</dd>
          </div>
          <div>
            <dd className="leading-relaxed">{t(dict, "dashboard.subscriptionPage.faq.leadsA")}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
