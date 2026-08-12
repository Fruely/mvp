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
  parseSpecialistOnboardingState,
  shouldShowLaunchVideoGuide,
  VIDEO_GUIDE_AUTO_HIDE_STATUSES,
} from "@/lib/specialists/onboardingState";
import {
  dashboardNoticeTitleBody,
  getSubscriptionDisplayState,
  pickDashboardSubscriptionNotice,
  type SubscriptionSeverity,
} from "@/lib/specialists/subscriptionDisplay";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type AlertVariant,
  type BadgeVariant,
} from "@/components/ui";
import SpecialistLaunchVideoGuide from "@/components/specialist/SpecialistLaunchVideoGuide";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import VerificationBanner from "./VerificationBanner";

function formatDashboardDate(value: string | null, lang: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const locale = lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale);
}

function subscriptionStatusBadgeVariant(planStatus: string): BadgeVariant {
  if (planStatus === "early_access" || planStatus === "trialing") return "success";
  if (planStatus === "active") return "info";
  if (planStatus === "grace" || planStatus === "grace_period") return "warning";
  if (planStatus === "expired") return "error";
  return "neutral";
}

function subscriptionSeverityToAlertVariant(severity: SubscriptionSeverity): AlertVariant {
  if (severity === "danger") return "error";
  if (severity === "warning") return "warning";
  if (severity === "success") return "success";
  if (severity === "info") return "info";
  return "info";
}

const linkPrimaryClass =
  "inline-flex min-h-[40px] w-full shrink-0 items-center justify-center rounded-freuly-md bg-freuly-primary px-freuly-4 py-freuly-2 text-freuly-button text-freuly-text-on-primary transition-colors hover:bg-freuly-primary-hover freuly-focus-ring sm:w-auto";

const linkSecondaryClass =
  "inline-flex min-h-[40px] w-full items-center justify-center rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-4 py-freuly-2 text-freuly-button text-freuly-text-primary transition-colors hover:bg-freuly-border-subtle freuly-focus-ring sm:w-auto";

const linkUrgentClass =
  "inline-flex min-h-[40px] w-full items-center justify-center rounded-freuly-md bg-freuly-warning px-freuly-4 py-freuly-2 text-freuly-button text-freuly-text-on-primary transition-colors hover:bg-freuly-warning/90 freuly-focus-ring sm:w-auto";

function planDisplayLabel(dict: Dictionary, planCode: string): string {
  const code = planCode.trim().toLowerCase();
  const key = `dashboard.subscriptionPage.plan.${code}`;
  const translated = t(dict, key);
  if (translated !== key) return translated;
  return planCode.trim() || t(dict, "dashboard.subscriptionPage.plan.starter");
}

function subscriptionStatusLabel(dict: Dictionary, planStatus: string): string {
  const raw = planStatus.trim().toLowerCase();
  const key = `dashboard.subscriptionPage.status.${raw}`;
  const translated = t(dict, key);
  if (translated !== key) return translated;
  return t(dict, "dashboard.subscriptionPage.status.unknown");
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
    .select(
      "postal_code, country_code, work_format, languages, telegram_chat_id, onboarding_state, service_radius_km, lat, lng"
    )
    .eq("id", specialist.id)
    .maybeSingle();

  const { data: profileRow } = await service
    .from("specialist_profiles")
    .select("photo_url, about_me, video_url, gallery_urls, certificate_urls, city")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const categoryId =
    typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
      ? ((specialist as unknown as Record<string, unknown>).category_id as string)
      : "";

  const { data: categoryRow } = await service
    .from("categories")
    .select("parent_id, slug")
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
  const serviceRadiusKm =
    typeof specExtra?.service_radius_km === "number" && Number.isFinite(specExtra.service_radius_km)
      ? specExtra.service_radius_km
      : null;

  const profileReadyForPublish = isPublicationReadyForDashboard({
    name,
    categoryId,
    categoryParentId,
    categorySlug: typeof categoryRow?.slug === "string" ? categoryRow.slug : null,
    categoryMissing: Boolean(categoryId) && !categoryRow,
    languages,
    workFormat,
    postalCode,
    countryCode: typeof specExtra?.country_code === "string" ? specExtra.country_code : null,
    city: typeof profileRow?.city === "string" ? profileRow.city : null,
    lat: typeof specExtra?.lat === "number" ? specExtra.lat : null,
    lng: typeof specExtra?.lng === "number" ? specExtra.lng : null,
    serviceRadiusKm,
    servicesInSelectedCategory: servicesInCategory,
  });

  const profileHref = `/${lang}/specialist/dashboard/profile`;
  const subscriptionHref = `/${lang}/specialist/dashboard/subscription`;
  const billingHref = `/${lang}/specialist/dashboard/billing`;
  const pricingHref = `/${lang}/pricing`;
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
  const profileStarted = Boolean(
    name ||
      categoryId ||
      languages.length > 0 ||
      postalCode ||
      hasAboutMe ||
      hasPhoto ||
      activeServicesCount > 0,
  );
  const onboardingCtaHref = profileReadyForPublish ? onboardingPublishHref : onboardingHref;
  const onboardingCtaTitle = profileReadyForPublish
    ? t(dict, "dashboard.onboarding.ctaCard.readyTitle")
    : t(dict, "dashboard.onboarding.ctaCard.title");
  const onboardingCtaBody = profileReadyForPublish
    ? t(dict, "dashboard.onboarding.ctaCard.readyBody")
    : t(dict, "dashboard.onboarding.ctaCard.body");
  const onboardingCtaButton = profileReadyForPublish
    ? t(dict, "dashboard.onboarding.ctaCard.readyButton")
    : profileStarted
      ? t(dict, "dashboard.onboarding.cta.continue")
      : t(dict, "dashboard.onboarding.cta.start");
  const onboardingState = parseSpecialistOnboardingState(specExtra?.onboarding_state);
  const shouldAutoShowVideoGuide = shouldShowLaunchVideoGuide({
    specialistStatus: status,
    onboardingState,
    now: new Date(),
  });
  const canUseVideoGuide =
    !status || !VIDEO_GUIDE_AUTO_HIDE_STATUSES.has(String(status));

  return (
    <div className="space-y-freuly-6">
      <VerificationBanner status={status} dict={dict} />
      <InstallFreuly
        lang={lang}
        audience="specialist"
        placement="dashboard"
        variant="dashboard"
      />

      <header>
        <h1 className="text-freuly-page-title text-freuly-text-primary">
          {t(dict, "dashboard.home.title")}
        </h1>
        <p className="mt-freuly-1 text-freuly-body-sm text-freuly-text-secondary">
          {t(dict, "dashboard.home.subtitle")}
        </p>
      </header>

      {showOnboardingCta ? (
        <Card className="border-freuly-primary/15 bg-freuly-primary-light shadow-none">
          <div className="flex flex-col gap-freuly-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-freuly-card-title text-freuly-text-primary">{onboardingCtaTitle}</h2>
              <p className="mt-freuly-1 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">
                {onboardingCtaBody}
              </p>
            </div>
            <Link href={onboardingCtaHref} className={linkPrimaryClass}>
              {onboardingCtaButton}
            </Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="mb-freuly-3">
          <CardTitle>{t(dict, "dashboard.home.blocks.profileTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-freuly-2 text-freuly-body-sm text-freuly-text-primary">
          <p>
            <span className="font-medium text-freuly-text-secondary">
              {t(dict, "dashboard.home.profileStatusLabel")}
            </span>{" "}
            <span>{statusLabel}</span>
          </p>
          <p className="text-freuly-text-secondary">{publishReadinessLine}</p>
          {statusHint ? <p className="text-freuly-text-muted">{statusHint}</p> : null}
          <p className="text-freuly-text-secondary">
            {profileReadyForPublish
              ? t(dict, "dashboard.home.readyBody")
              : t(dict, "dashboard.home.incompleteBody")}
          </p>
        </CardContent>
        {profileAlreadyPublished ? (
          <CardFooter>
            <Link href={profileHref} className={linkPrimaryClass}>
              {t(dict, "dashboard.home.editProfile")}
            </Link>
          </CardFooter>
        ) : null}
      </Card>

      <div className="grid gap-freuly-4 md:grid-cols-2">
        <Card>
          <CardHeader className="mb-freuly-3">
            <CardTitle>{t(dict, "dashboard.home.blocks.subscriptionTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-freuly-3 text-freuly-body-sm">
            <div>
              <p className="text-freuly-helper font-medium uppercase tracking-wide text-freuly-text-muted">
                {t(dict, "dashboard.home.subscription.plan")}
              </p>
              <p className="mt-freuly-1 font-medium text-freuly-text-primary">
                {planDisplayLabel(dict, planCode)}
              </p>
            </div>
            <div>
              <p className="text-freuly-helper font-medium uppercase tracking-wide text-freuly-text-muted">
                {t(dict, "dashboard.home.subscription.status")}
              </p>
              <div className="mt-freuly-1">
                <Badge variant={subscriptionStatusBadgeVariant(planStatus)}>
                  {subscriptionStatusLabel(dict, planStatus)}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-freuly-helper font-medium uppercase tracking-wide text-freuly-text-muted">
                {t(dict, "dashboard.home.subscription.expires")}
              </p>
              <p className="mt-freuly-1 text-freuly-text-primary">
                {formatDashboardDate(subscriptionUntil, lang)}
              </p>
            </div>
            {graceUntil ? (
              <div>
                <p className="text-freuly-helper font-medium uppercase tracking-wide text-freuly-text-muted">
                  {t(dict, "dashboard.home.subscription.grace")}
                </p>
                <p className="mt-freuly-1 text-freuly-text-primary">
                  {formatDashboardDate(graceUntil, lang)}
                </p>
              </div>
            ) : null}
          </CardContent>
          {subscriptionNoticeCopy ? (
            <Alert
              variant={subscriptionSeverityToAlertVariant(subscriptionNoticeCopy.severity)}
              title={subscriptionNoticeCopy.title}
              className="mx-freuly-5 mb-freuly-4 mt-freuly-1"
            >
              {subscriptionNoticeCopy.body}
            </Alert>
          ) : null}
          <CardFooter className="flex-col gap-freuly-2 sm:flex-row sm:flex-wrap">
            <Link href={pricingHref} className={linkPrimaryClass}>
              {t(dict, "dashboard.home.subscription.ctaChoosePlan")}
            </Link>
            <Link
              href={billingHref}
              className={subscriptionNeedsAttention ? linkUrgentClass : linkSecondaryClass}
            >
              {subscriptionNeedsAttention
                ? t(dict, "dashboard.home.subscription.ctaUrgent")
                : t(dict, "dashboard.home.subscription.ctaPay")}
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="mb-freuly-3">
            <CardTitle>{t(dict, "dashboard.home.blocks.leadsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-freuly-2 text-freuly-body-sm text-freuly-text-primary">
            <p>
              <span className="font-medium text-freuly-text-secondary">
                {t(dict, "dashboard.home.leads.total")}
              </span>{" "}
              {leadsTotalSafe !== null ? (
                <span className="tabular-nums">{leadsTotalSafe}</span>
              ) : (
                <span className="text-freuly-text-muted">{t(dict, "dashboard.home.leads.unavailable")}</span>
              )}
            </p>
            <p>
              <span className="font-medium text-freuly-text-secondary">
                {t(dict, "dashboard.home.leads.new")}
              </span>{" "}
              {leadsNewSafe !== null ? (
                <span className="tabular-nums">{leadsNewSafe}</span>
              ) : (
                <span className="text-freuly-text-muted">{t(dict, "dashboard.home.leads.unavailable")}</span>
              )}
            </p>
            <p className="text-freuly-helper text-freuly-text-muted">
              {t(dict, "dashboard.home.leads.newHint")}
            </p>
          </CardContent>
          <CardFooter>
            <Link href={leadsHref} className={linkPrimaryClass}>
              {t(dict, "dashboard.home.leads.cta")}
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader className="mb-freuly-3">
          <CardTitle>{t(dict, "dashboard.home.profileViews.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-freuly-1 sm:flex-row sm:items-baseline sm:gap-freuly-3">
            <p className="text-[1.75rem] font-semibold tabular-nums leading-none text-freuly-text-primary">
              {profileViewsTotalSafe !== null ? profileViewsTotalSafe : "—"}
            </p>
            <p className="text-freuly-body-sm text-freuly-text-secondary">
              {t(dict, "dashboard.home.profileViews.totalLabel")}
            </p>
          </div>
          <p className="mt-freuly-2 text-freuly-helper text-freuly-text-muted">
            {t(dict, "dashboard.home.profileViews.hint")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="mb-freuly-3">
          <CardTitle>{t(dict, "dashboard.home.improve.title")}</CardTitle>
          <CardDescription>{t(dict, "dashboard.home.improve.subtitle")}</CardDescription>
        </CardHeader>

        {visibleImprovements.length === 0 ? (
          <Alert variant="success" className="mx-freuly-5 mb-freuly-5">
            {t(dict, "dashboard.home.improve.allGood")}
          </Alert>
        ) : (
          <>
            <CardContent>
              <ul className="space-y-freuly-2">
                {visibleImprovements.map((item) => {
                  const isMissing = item.severity === "missing";
                  return (
                    <li
                      key={item.key}
                      className="flex items-start gap-freuly-3 rounded-freuly-md border border-freuly-border-subtle bg-freuly-border-subtle/40 px-freuly-3 py-freuly-2 text-freuly-body-sm"
                    >
                      <Badge
                        variant={isMissing ? "warning" : "info"}
                        className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px] font-semibold leading-none"
                        aria-hidden
                      >
                        {isMissing ? "!" : "+"}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-freuly-text-primary">{item.label}</p>
                        <p className="mt-freuly-1 text-freuly-helper text-freuly-text-muted">
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
                <p className="mt-freuly-2 text-freuly-helper text-freuly-text-muted">
                  {t(dict, "dashboard.home.improve.more").replace(
                    "{{count}}",
                    String(hiddenImprovementsCount),
                  )}
                </p>
              ) : null}
            </CardContent>
            <CardFooter>
              <Link href={profileHref} className={linkPrimaryClass}>
                {t(dict, "dashboard.home.improve.cta")}
              </Link>
            </CardFooter>
          </>
        )}
      </Card>

      {canUseVideoGuide ? (
        <SpecialistLaunchVideoGuide lang={lang} initialAutoShow={shouldAutoShowVideoGuide} />
      ) : null}
    </div>
  );
}
