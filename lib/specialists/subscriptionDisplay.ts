import type { SpecialistPlanForUi } from "@/lib/specialists/subscription";
import { t, type Dictionary } from "@/lib/i18n";

export type SubscriptionPhase =
  | "early_access"
  | "active"
  | "trialing"
  | "grace_period"
  | "expired"
  | "cancelled"
  | "unknown";

export type SubscriptionSeverity = "neutral" | "success" | "info" | "warning" | "danger";

export type SubscriptionDisplayState = {
  planCode: string;
  status: string;
  phase: SubscriptionPhase;
  severity: SubscriptionSeverity;
  daysUntilExpires: number | null;
  daysUntilGraceEnds: number | null;
  isExpiringSoon: boolean;
  isInGracePeriod: boolean;
  isExpired: boolean;
  isPaymentCurrentlyDisabled: boolean;
  shouldShowDashboardNotice: boolean;
  shouldShowLeadsNotice: boolean;
};

/** Calendar-day difference: target UTC midnight minus today UTC midnight. */
function utcCalendarDaysFromToday(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const targetUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetUtc - todayUtc) / 86400000);
}

function normalizePhase(raw: string | null | undefined): SubscriptionPhase {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "early_access") return "early_access";
  if (s === "trialing") return "trialing";
  if (s === "active") return "active";
  if (s === "grace" || s === "grace_period") return "grace_period";
  if (s === "expired") return "expired";
  if (s === "cancelled") return "cancelled";
  if (!s) return "unknown";
  return "unknown";
}

function severityForPhase(phase: SubscriptionPhase): SubscriptionSeverity {
  switch (phase) {
    case "early_access":
      return "info";
    case "trialing":
    case "active":
      return "success";
    case "grace_period":
      return "warning";
    case "expired":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Unified UI-only subscription display state from `specialist_plan` snapshot.
 * Does not change plan_status in the database or infer expired solely from dates.
 */
export function getSubscriptionDisplayState(plan: SpecialistPlanForUi): SubscriptionDisplayState {
  const status = (plan.plan_status ?? "").trim();
  const phase = normalizePhase(status);
  const severity = severityForPhase(phase);

  const daysUntilExpires = utcCalendarDaysFromToday(plan.expires_at);
  const daysUntilGraceEnds = utcCalendarDaysFromToday(plan.grace_until);

  const isExpiringSoon =
    daysUntilExpires !== null && daysUntilExpires >= 0 && daysUntilExpires <= 7;

  const isInGracePeriod = phase === "grace_period";
  const isExpired = phase === "expired" || phase === "cancelled";

  const isPaymentCurrentlyDisabled = true;

  const shouldShowDashboardNotice =
    isExpiringSoon || isInGracePeriod || isExpired || phase === "early_access";

  const shouldShowLeadsNotice = isInGracePeriod || isExpired || isExpiringSoon;

  return {
    planCode: plan.plan_code,
    status,
    phase,
    severity,
    daysUntilExpires,
    daysUntilGraceEnds,
    isExpiringSoon,
    isInGracePeriod,
    isExpired,
    isPaymentCurrentlyDisabled,
    shouldShowDashboardNotice,
    shouldShowLeadsNotice,
  };
}

export type DashboardSubscriptionNoticePick =
  | { kind: "expired" }
  | { kind: "grace"; daysUntilGraceEnds: number | null }
  | { kind: "expiring"; daysUntilExpires: number }
  | { kind: "early_access" };

/**
 * Single primary notice for dashboard home / subscription (priority: expired → grace → expiring → early access).
 */
export function pickDashboardSubscriptionNotice(
  display: SubscriptionDisplayState
): DashboardSubscriptionNoticePick | null {
  if (!display.shouldShowDashboardNotice) return null;
  if (display.isExpired) return { kind: "expired" };
  if (display.isInGracePeriod) return { kind: "grace", daysUntilGraceEnds: display.daysUntilGraceEnds };
  if (display.isExpiringSoon && display.daysUntilExpires != null) {
    return { kind: "expiring", daysUntilExpires: display.daysUntilExpires };
  }
  if (display.phase === "early_access") return { kind: "early_access" };
  return null;
}

export function leadsBannerSeverity(display: SubscriptionDisplayState): SubscriptionSeverity {
  if (display.isExpired) return "danger";
  if (display.isInGracePeriod || display.isExpiringSoon) return "warning";
  return "info";
}

/** One-line banner above the leads table when `shouldShowLeadsNotice`. */
export function leadsSubscriptionBannerText(
  dict: Dictionary,
  display: SubscriptionDisplayState
): string | null {
  if (!display.shouldShowLeadsNotice) return null;
  if (display.isExpired) {
    return t(dict, "dashboard.subscriptionNotice.leadsExpired");
  }
  if (display.isInGracePeriod) {
    if (display.daysUntilGraceEnds != null) {
      return t(dict, "dashboard.subscriptionNotice.leadsGrace").replace(
        "{{days}}",
        String(display.daysUntilGraceEnds)
      );
    }
    return t(dict, "dashboard.subscriptionNotice.leadsGraceNoDays");
  }
  if (display.isExpiringSoon && display.daysUntilExpires != null) {
    return t(dict, "dashboard.subscriptionNotice.leadsExpiringSoon").replace(
      "{{days}}",
      String(display.daysUntilExpires)
    );
  }
  return null;
}

export function dashboardNoticeTitleBody(
  dict: Dictionary,
  pick: DashboardSubscriptionNoticePick
): { title: string; body: string; severity: SubscriptionSeverity } {
  switch (pick.kind) {
    case "expired":
      return {
        title: t(dict, "dashboard.subscriptionNotice.expiredTitle"),
        body: t(dict, "dashboard.subscriptionNotice.expiredBody"),
        severity: "danger",
      };
    case "grace":
      return {
        title: t(dict, "dashboard.subscriptionNotice.graceTitle"),
        body:
          pick.daysUntilGraceEnds != null
            ? t(dict, "dashboard.subscriptionNotice.graceBody").replace(
                "{{days}}",
                String(pick.daysUntilGraceEnds)
              )
            : t(dict, "dashboard.subscriptionNotice.graceBodyNoDays"),
        severity: "warning",
      };
    case "expiring":
      return {
        title: t(dict, "dashboard.subscriptionNotice.expiringSoonTitle"),
        body: t(dict, "dashboard.subscriptionNotice.expiringSoonBody").replace(
          "{{days}}",
          String(pick.daysUntilExpires)
        ),
        severity: "warning",
      };
    case "early_access":
      return {
        title: t(dict, "dashboard.subscriptionNotice.earlyAccessTitle"),
        body: t(dict, "dashboard.subscriptionNotice.earlyAccessBody"),
        severity: "info",
      };
  }
}

/** Tailwind classes for compact dashboard notice panels (severity → surface). */
export function subscriptionNoticePanelClass(severity: SubscriptionSeverity): string {
  const base = "rounded-xl border px-4 py-3.5 text-sm leading-relaxed shadow-sm";
  switch (severity) {
    case "danger":
      return `${base} border-rose-200/90 bg-rose-50/70 text-rose-950`;
    case "warning":
      return `${base} border-amber-200/90 bg-amber-50/55 text-amber-950`;
    case "info":
      return `${base} border-indigo-200/80 bg-indigo-50/45 text-indigo-950`;
    case "success":
      return `${base} border-emerald-200/80 bg-emerald-50/45 text-emerald-950`;
    default:
      return `${base} border-gray-200/90 bg-gray-50/90 text-gray-900`;
  }
}
