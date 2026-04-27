export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { notify } from "@/lib/notifications/notify";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { isPublicationReadyForDashboard } from "@/lib/dashboard/publicationReadiness";
import { getDictionary, isSupportedLang, t, type Dictionary } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  dashboardNoticeTitleBody,
  getSubscriptionDisplayState,
  pickDashboardSubscriptionNotice,
  subscriptionNoticePanelClass,
} from "@/lib/specialists/subscriptionDisplay";
import VerificationBanner from "./VerificationBanner";

function formatDashboardDate(value: string | null, lang: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const locale = lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale);
}

function subscriptionStatusBadgeClass(planStatus: string): string {
  if (planStatus === "early_access" || planStatus === "trialing") return "bg-emerald-50 text-emerald-700";
  if (planStatus === "active") return "bg-blue-50 text-blue-700";
  if (planStatus === "grace" || planStatus === "grace_period") return "bg-amber-50 text-amber-700";
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
    .select("postal_code, work_format, languages, telegram_chat_id")
    .eq("id", specialist.id)
    .maybeSingle();

  const { data: profileRow } = await service
    .from("specialist_profiles")
    .select("photo_url, about_me, video_url, gallery_urls, certificate_urls")
    .eq("specialist_id", specialist.id)
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

  const plan = await getSpecialistPlanForDashboard(service, specialist.id);
  const display = getSubscriptionDisplayState(plan);
  const subscriptionNoticePick = pickDashboardSubscriptionNotice(display);
  const subscriptionNoticeCopy = subscriptionNoticePick
    ? dashboardNoticeTitleBody(dict, subscriptionNoticePick)
    : null;

  const planStatus = plan.plan_status;
  const planCode = plan.plan_code;
  const subscriptionUntil = plan.expires_at;
  const graceUntil = plan.grace_until;

  const subscriptionNeedsAttention =
    planStatus === "grace" || planStatus === "grace_period" || planStatus === "expired";

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

  const { count: profileViewsCount, error: profileViewsError } = await service
    .from("profile_view_events")
    .select("id", { count: "exact", head: true })
    .eq("specialist_id", specialist.id);

  const profileViewsTotalSafe =
    !profileViewsError && typeof profileViewsCount === "number" ? profileViewsCount : null;

  const hasPhoto =
    typeof profileRow?.photo_url === "string" && profileRow.photo_url.trim().length > 0;
  const hasAboutMe =
    typeof profileRow?.about_me === "string" && profileRow.about_me.trim().length > 0;
  const hasVideo =
    typeof profileRow?.video_url === "string" && profileRow.video_url.trim().length > 0;
  const galleryCount = Array.isArray(profileRow?.gallery_urls)
    ? profileRow.gallery_urls.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ).length
    : 0;
  const certificateCount = Array.isArray(profileRow?.certificate_urls)
    ? profileRow.certificate_urls.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ).length
    : 0;
  const telegramConnected = Boolean(String(specExtra?.telegram_chat_id ?? "").trim());
  const activeServicesCount = Array.isArray(servicesRows) ? servicesRows.length : 0;

  type ImprovementSeverity = "missing" | "improve";
  type Improvement = { key: string; label: string; severity: ImprovementSeverity };
  const improvements: Improvement[] = [];

  if (!hasPhoto) {
    improvements.push({
      key: "photo",
      label: t(dict, "dashboard.home.improve.items.photo"),
      severity: "missing",
    });
  }
  if (activeServicesCount === 0) {
    improvements.push({
      key: "services",
      label: t(dict, "dashboard.home.improve.items.services"),
      severity: "missing",
    });
  }
  if (!hasAboutMe) {
    improvements.push({
      key: "about",
      label: t(dict, "dashboard.home.improve.items.about"),
      severity: "missing",
    });
  }
  if (!telegramConnected) {
    improvements.push({
      key: "telegram",
      label: t(dict, "dashboard.home.improve.items.telegram"),
      severity: "improve",
    });
  }
  if (galleryCount === 0) {
    improvements.push({
      key: "gallery",
      label: t(dict, "dashboard.home.improve.items.gallery"),
      severity: "improve",
    });
  }
  if (certificateCount === 0) {
    improvements.push({
      key: "certificates",
      label: t(dict, "dashboard.home.improve.items.certificates"),
      severity: "improve",
    });
  }
  if (!hasVideo) {
    improvements.push({
      key: "video",
      label: t(dict, "dashboard.home.improve.items.video"),
      severity: "improve",
    });
  }

  const MAX_IMPROVEMENTS = 6;
  const visibleImprovements = improvements.slice(0, MAX_IMPROVEMENTS);
  const hiddenImprovementsCount = Math.max(0, improvements.length - MAX_IMPROVEMENTS);

  const statusLabel = specialistStatusLabel(dict, status);
  const onboardingHref = `/${lang}/specialist/dashboard/onboarding`;
  const onboardingPublishHref = `/${lang}/specialist/dashboard/onboarding?step=review`;
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
  const profileAlreadyPublished =
    st === "published_unverified" || st === "approved" || st === "featured_verified";
  const showOnboardingCta = !profileAlreadyPublished;
  const onboardingCtaHref = profileReadyForPublish ? onboardingPublishHref : onboardingHref;
  const onboardingCtaTitle = profileReadyForPublish
    ? t(dict, "dashboard.onboarding.ctaCard.readyTitle")
    : t(dict, "dashboard.onboarding.ctaCard.title");
  const onboardingCtaBody = profileReadyForPublish
    ? t(dict, "dashboard.onboarding.ctaCard.readyBody")
    : t(dict, "dashboard.onboarding.ctaCard.body");
  const onboardingCtaButton = profileReadyForPublish
    ? t(dict, "dashboard.onboarding.ctaCard.readyButton")
    : t(dict, "dashboard.onboarding.ctaCard.button");

  return (
    <div className="space-y-6">
      <VerificationBanner status={status} dict={dict} />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t(dict, "dashboard.home.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t(dict, "dashboard.home.subtitle")}</p>
      </div>

      {showOnboardingCta ? (
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-blue-950">
                {onboardingCtaTitle}
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-blue-900">
                {onboardingCtaBody}
              </p>
            </div>
            <Link
              href={onboardingCtaHref}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {onboardingCtaButton}
            </Link>
          </div>
        </section>
      ) : null}

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
          {subscriptionNoticeCopy ? (
            <div
              className={`mt-4 ${subscriptionNoticePanelClass(subscriptionNoticeCopy.severity)}`}
            >
              <p className="font-semibold leading-snug">{subscriptionNoticeCopy.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed opacity-[0.92]">
                {subscriptionNoticeCopy.body}
              </p>
            </div>
          ) : null}
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.home.profileViews.title")}
        </h2>
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <p className="text-3xl font-semibold tabular-nums text-gray-900">
            {profileViewsTotalSafe !== null ? profileViewsTotalSafe : "—"}
          </p>
          <p className="text-sm text-gray-600">
            {t(dict, "dashboard.home.profileViews.totalLabel")}
          </p>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t(dict, "dashboard.home.profileViews.hint")}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.home.improve.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{t(dict, "dashboard.home.improve.subtitle")}</p>

        {visibleImprovements.length === 0 ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
            {t(dict, "dashboard.home.improve.allGood")}
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {visibleImprovements.map((item) => {
                const isMissing = item.severity === "missing";
                return (
                  <li
                    key={item.key}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold leading-none ${
                        isMissing
                          ? "border border-amber-300 bg-white text-amber-700"
                          : "border border-sky-300 bg-white text-sky-700"
                      }`}
                    >
                      {isMissing ? "!" : "+"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900">{item.label}</p>
                      <p
                        className={`mt-0.5 text-xs ${
                          isMissing ? "text-amber-700" : "text-sky-700"
                        }`}
                      >
                        {isMissing
                          ? t(dict, "dashboard.home.improve.severity.missing")
                          : t(dict, "dashboard.home.improve.severity.improve")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hiddenImprovementsCount > 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                {t(dict, "dashboard.home.improve.more").replace(
                  "{{count}}",
                  String(hiddenImprovementsCount),
                )}
              </p>
            ) : null}
            <Link
              href={profileHref}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              {t(dict, "dashboard.home.improve.cta")}
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
