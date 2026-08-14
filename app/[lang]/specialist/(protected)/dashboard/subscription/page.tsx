import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardStatTile from "@/components/dashboard/DashboardStatTile";
import {
  dashboardLinkPrimaryClass,
  dashboardLinkSecondaryClass,
  dashboardPageStackClass,
} from "@/components/dashboard/dashboardStyles";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, type BadgeVariant } from "@/components/ui";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  dashboardNoticeTitleBody,
  getSubscriptionDisplayState,
  pickDashboardSubscriptionNotice,
  type SubscriptionSeverity,
} from "@/lib/specialists/subscriptionDisplay";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getDictionary, isSupportedLang, t, type Dictionary, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function subscriptionStatusBadgeVariant(planStatus: string): BadgeVariant {
  if (planStatus === "early_access" || planStatus === "trialing") return "success";
  if (planStatus === "active") return "info";
  if (planStatus === "grace" || planStatus === "grace_period") return "warning";
  if (planStatus === "expired" || planStatus === "inactive") return "error";
  if (planStatus === "cancelled") return "neutral";
  return "neutral";
}

function subscriptionSeverityToAlertVariant(severity: SubscriptionSeverity): "info" | "success" | "warning" | "error" {
  if (severity === "danger") return "error";
  if (severity === "warning") return "warning";
  if (severity === "success") return "success";
  return "info";
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

  const [{ specialist }, dict] = await Promise.all([
    getCurrentUserAndSpecialist(),
    getDictionary(lang),
  ]);
  const service = createServiceClient();

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

  const mailSubject = t(dict, "dashboard.subscriptionPage.mailto.subject");
  const mailtoHref = `mailto:freuly.de@gmail.com?subject=${encodeURIComponent(mailSubject)}`;

  return (
    <div className={dashboardPageStackClass}>
      <DashboardPageHeader
        kicker={t(dict, "dashboard.subscriptionPage.kicker")}
        title={t(dict, "dashboard.subscriptionPage.title")}
        subtitle={t(dict, "dashboard.subscriptionPage.subtitle")}
        actions={
          <>
            <Link href={`/${lang}/pricing`} className={dashboardLinkPrimaryClass}>
              {t(dict, "dashboard.subscriptionPage.cta.viewPlans")}
            </Link>
            <Link href={`/${lang}/specialist/dashboard/billing`} className={dashboardLinkSecondaryClass}>
              {t(dict, "dashboard.subscriptionPage.cta.manageBilling")}
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t(dict, "dashboard.subscriptionPage.planCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-freuly-4 sm:grid-cols-2">
            <DashboardStatTile
              label={t(dict, "dashboard.subscriptionPage.label.status")}
              value={<Badge variant={subscriptionStatusBadgeVariant(planStatusRaw)}>{statusLabel}</Badge>}
            />
            <DashboardStatTile label={t(dict, "dashboard.subscriptionPage.label.plan")} value={<span className="font-semibold">{planLabel}</span>} />
            <DashboardStatTile
              label={t(dict, "dashboard.subscriptionPage.label.startedAt")}
              value={formatPlanDate(plan.started_at, lang, dict)}
            />
            <DashboardStatTile
              label={t(dict, "dashboard.subscriptionPage.label.expiresAt")}
              value={formatPlanDate(plan.expires_at, lang, dict)}
            />
            <DashboardStatTile
              className="sm:col-span-2"
              label={t(dict, "dashboard.subscriptionPage.label.graceUntil")}
              value={formatPlanDate(plan.grace_until, lang, dict)}
            />
          </div>
          <div className="mt-freuly-6">
            <a href={mailtoHref} className={dashboardLinkPrimaryClass}>
              {t(dict, "dashboard.subscriptionPage.cta.support")}
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-freuly-primary/15 bg-freuly-primary-light/30">
        <CardHeader>
          <CardTitle>{t(dict, "dashboard.subscriptionPage.context.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-freuly-4">
          {subscriptionNoticeCopy ? (
            <Alert variant={subscriptionSeverityToAlertVariant(subscriptionNoticeCopy.severity)} title={subscriptionNoticeCopy.title}>
              {subscriptionNoticeCopy.body}
            </Alert>
          ) : null}
          <ul className="space-y-2 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-freuly-primary" aria-hidden />
              <span>{t(dict, "dashboard.subscriptionPage.context.bulletPayment")}</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-freuly-primary" aria-hidden />
              <span>{t(dict, "dashboard.subscriptionPage.context.bulletNotify")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(dict, "dashboard.subscriptionPage.faq.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-freuly-4 text-freuly-body-sm text-freuly-text-secondary">
            <div>
              <dt className="font-medium text-freuly-text-primary">{t(dict, "dashboard.subscriptionPage.faq.contactsQ")}</dt>
              <dd className="mt-freuly-2 leading-relaxed">{t(dict, "dashboard.subscriptionPage.faq.contactsA")}</dd>
            </div>
            <div>
              <dd className="leading-relaxed">{t(dict, "dashboard.subscriptionPage.faq.leadsA")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
