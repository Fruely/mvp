export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { notify } from "@/lib/notifications/notify";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { isPublicationReadyForDashboard } from "@/lib/dashboard/publicationReadiness";
import { getDictionary, isSupportedLang, t, type Dictionary } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import VerificationBanner from "./VerificationBanner";

function formatDashboardDate(value: string | null, lang: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const locale = lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale);
}

function subscriptionStatusBadgeClass(planStatus: string): string {
  if (planStatus === "early_access") return "bg-emerald-50 text-emerald-700";
  if (planStatus === "active") return "bg-blue-50 text-blue-700";
  if (planStatus === "grace") return "bg-amber-50 text-amber-700";
  if (planStatus === "expired") return "bg-rose-50 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function specialistStatusLabel(dict: Dictionary, raw: string | null | undefined): string {
  const key = raw && String(raw).trim() ? String(raw).trim() : "draft";
  return t(dict, `dashboard.home.specialistStatus.${key}`, { defaultValue: key });
}

export default async function SpecialistDashboardHomePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();

  const dict: Dictionary = await getDictionary(lang);

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data: visitCheck } = await service
    .from("specialists")
    .select("first_dashboard_visit_at")
    .eq("id", specialist.id)
    .maybeSingle();

  if (!visitCheck?.first_dashboard_visit_at) {
    await service
      .from("specialists")
      .update({
        first_dashboard_visit_at: new Date().toISOString(),
      })
      .eq("id", specialist.id);

    await notify("NEW_SPECIALIST", {
      name: `🟡 Зашёл в кабинет: ${specialist.name || "Без имени"}`,
    });
  }

  const { data: specExtra } = await service
    .from("specialists")
    .select("postal_code, work_format, languages")
    .eq("id", specialist.id)
    .maybeSingle();

  const categoryId =
    typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
      ? ((specialist as unknown as Record<string, unknown>).category_id as string)
      : "";

  const { data: categoryRow } = await service
    .from("categories")
    .select("parent_id")
    .eq("id", categoryId)
    .maybeSingle();

  const categoryParentId =
    categoryRow && typeof categoryRow.parent_id === "string" ? categoryRow.parent_id : null;

  const { data: servicesRows } = await service
    .from("specialist_services")
    .select("title, price_from, is_active, category_id")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  const servicesInCategory = (servicesRows ?? []).filter(
    (row) => typeof row.category_id === "string" && row.category_id === categoryId,
  );

  const name = specialist.first_name?.trim() || specialist.name?.trim() || "";
  const languages = Array.isArray(specExtra?.languages)
    ? (specExtra.languages as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  const workFormat =
    specExtra?.work_format === "online" ||
    specExtra?.work_format === "offline" ||
    specExtra?.work_format === "hybrid"
      ? String(specExtra.work_format)
      : "online";
  const postalCode = typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "";

  const profileReadyForPublish = isPublicationReadyForDashboard({
    name,
    categoryId,
    categoryParentId,
    languages,
    workFormat,
    postalCode,
    servicesInSelectedCategory: servicesInCategory,
  });

  const profileHref = `/${lang}/specialist/dashboard/profile`;
  const subscriptionHref = `/${lang}/specialist/dashboard/subscription`;
  const leadsHref = `/${lang}/specialist/dashboard/leads`;

  const specialistRecord = specialist as unknown as Record<string, unknown>;
  const { data: planRow } = await service
    .from("specialist_plan")
    .select("plan_code, plan_status, expires_at")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const subscriptionStatusRaw =
    planRow?.plan_status != null ? String(planRow.plan_status) : specialistRecord.subscription_status;
  const planNameRaw =
    planRow?.plan_code != null ? String(planRow.plan_code) : specialistRecord.plan_name;
  const subscriptionUntilRaw =
    planRow?.expires_at != null ? String(planRow.expires_at) : specialistRecord.subscription_until;
  const graceUntilRaw = specialistRecord.grace_until;

  const planStatus =
    subscriptionStatusRaw != null && String(subscriptionStatusRaw).trim()
      ? String(subscriptionStatusRaw).trim()
      : "—";
  const planCode =
    planNameRaw != null && String(planNameRaw).trim() ? String(planNameRaw).trim() : "—";
  const subscriptionUntil =
    subscriptionUntilRaw != null && String(subscriptionUntilRaw).trim() ? String(subscriptionUntilRaw) : null;
  const graceUntil =
    graceUntilRaw != null && String(graceUntilRaw).trim() ? String(graceUntilRaw) : null;

  const subscriptionNeedsAttention = planStatus === "grace" || planStatus === "expired";

  const { count: leadsTotal, error: leadsTotalError } = await service
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("specialist_id", specialist.id);

  const { count: leadsNewCount, error: leadsNewError } = await service
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("specialist_id", specialist.id)
    .eq("status", "new");

  const leadsTotalSafe =
    !leadsTotalError && typeof leadsTotal === "number" ? leadsTotal : null;
  const leadsNewSafe = !leadsNewError && typeof leadsNewCount === "number" ? leadsNewCount : null;

  const statusLabel = specialistStatusLabel(dict, status);
  const publishReadyWord = profileReadyForPublish
    ? t(dict, "dashboard.home.publishReadiness.ready")
    : t(dict, "dashboard.home.publishReadiness.notReady");
  const publishReadinessLine = t(dict, "dashboard.home.publishReadiness.line").replace(
    "{{value}}",
    publishReadyWord,
  );

  let statusHint: string | null = null;
  const st = status ?? "";
  if (st === "published_unverified") {
    statusHint = t(dict, "dashboard.home.statusHint.published_unverified");
  } else if (st === "pending") {
    statusHint = t(dict, "dashboard.home.statusHint.pending");
  } else if (st === "approved") {
    statusHint = t(dict, "dashboard.home.statusHint.approved");
  }

  return (
    <div className="space-y-6">
      <VerificationBanner status={status} dict={dict} />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t(dict, "dashboard.home.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t(dict, "dashboard.home.subtitle")}</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">{t(dict, "dashboard.home.blocks.profileTitle")}</h2>
        <div className="mt-3 space-y-2 text-sm text-gray-800">
          <p>
            <span className="font-medium text-gray-700">{t(dict, "dashboard.home.profileStatusLabel")}</span>{" "}
            <span className="text-gray-900">{statusLabel}</span>
          </p>
          <p className="text-gray-700">{publishReadinessLine}</p>
          {statusHint ? <p className="text-gray-600">{statusHint}</p> : null}
          <p className="text-gray-700">
            {profileReadyForPublish ? t(dict, "dashboard.home.readyBody") : t(dict, "dashboard.home.incompleteBody")}
          </p>
        </div>
        <Link
          href={profileHref}
          className={`mt-4 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition ${
            profileReadyForPublish
              ? "bg-teal-600 hover:bg-teal-700"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {profileReadyForPublish ? t(dict, "dashboard.home.editProfile") : t(dict, "dashboard.home.completeProfile")}
        </Link>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t(dict, "dashboard.home.blocks.subscriptionTitle")}</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t(dict, "dashboard.home.subscription.plan")}
              </p>
              <p className="mt-1 font-medium text-gray-900">{planCode}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t(dict, "dashboard.home.subscription.status")}
              </p>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${subscriptionStatusBadgeClass(planStatus)}`}
                >
                  {planStatus}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t(dict, "dashboard.home.subscription.expires")}
              </p>
              <p className="mt-1 text-gray-800">{formatDashboardDate(subscriptionUntil, lang)}</p>
            </div>
            {graceUntil ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t(dict, "dashboard.home.subscription.grace")}
                </p>
                <p className="mt-1 text-gray-800">{formatDashboardDate(graceUntil, lang)}</p>
              </div>
            ) : null}
          </div>
          <Link
            href={subscriptionHref}
            className={`mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition sm:w-auto ${
              subscriptionNeedsAttention
                ? "bg-blue-600 hover:bg-blue-700"
                : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            {subscriptionNeedsAttention
              ? t(dict, "dashboard.home.subscription.ctaUrgent")
              : t(dict, "dashboard.home.subscription.cta")}
          </Link>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t(dict, "dashboard.home.blocks.leadsTitle")}</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-800">
            <p>
              <span className="font-medium text-gray-700">{t(dict, "dashboard.home.leads.total")}</span>{" "}
              {leadsTotalSafe !== null ? (
                <span className="tabular-nums">{leadsTotalSafe}</span>
              ) : (
                <span className="text-gray-500">{t(dict, "dashboard.home.leads.unavailable")}</span>
              )}
            </p>
            <p>
              <span className="font-medium text-gray-700">{t(dict, "dashboard.home.leads.new")}</span>{" "}
              {leadsNewSafe !== null ? (
                <span className="tabular-nums">{leadsNewSafe}</span>
              ) : (
                <span className="text-gray-500">{t(dict, "dashboard.home.leads.unavailable")}</span>
              )}
            </p>
            <p className="text-xs text-gray-500">{t(dict, "dashboard.home.leads.newHint")}</p>
          </div>
          <Link
            href={leadsHref}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 sm:w-auto"
          >
            {t(dict, "dashboard.home.leads.cta")}
          </Link>
        </section>
      </div>
    </div>
  );
}
