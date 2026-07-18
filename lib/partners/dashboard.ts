import type { SupabaseClient } from "@supabase/supabase-js";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  computeDashboardAmounts,
  type DashboardAmountTotals,
} from "@/lib/partners/dashboardAmounts";
import { getBerlinMonthBoundsUtc } from "@/lib/partners/monthlyBounds";
import { publicCommissionRef } from "@/lib/partners/publicRef";
import type { PartnerRow, PartnerStatus } from "@/lib/partners/types";

export { computeDashboardAmounts, type DashboardAmountTotals } from "@/lib/partners/dashboardAmounts";

export type DashboardPeriod = "month" | "all";

export type PartnerDashboardDto = {
  partner: {
    id: string;
    name: string;
    status: PartnerStatus;
    commission_amount_cents: number;
    currency: string;
    referral_code: string;
    referral_path: string;
  };
  period: DashboardPeriod;
  period_bounds: { start: string | null; end_exclusive: string | null };
  metrics: {
    clicks: number;
    registrations: number;
    payments: number;
    earned_cents: number;
  };
  balances: DashboardAmountTotals;
  links: Array<{
    id: string;
    code: string;
    campaign: string | null;
    target_path: string;
    is_active: boolean;
    referral_path: string;
  }>;
  commissions: Array<{
    id: string;
    public_ref: string;
    amount_cents: number;
    currency: string;
    status: string;
    earned_at: string;
  }>;
  payouts: Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    paid_at: string | null;
    period_start: string | null;
    period_end: string | null;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
  }>;
  unread_notifications: number;
  last_payout_at: string | null;
};

export async function getPartnerDashboard(
  supabase: SupabaseClient,
  partnerId: string,
  period: DashboardPeriod = "month"
): Promise<PartnerDashboardDto> {
  if (!partnerId.trim()) throw new PartnerDomainError("partner_id_required");

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerErr || !partner) throw new PartnerDomainError("partner_not_found", 404);
  const p = partner as PartnerRow;

  const bounds = period === "month" ? getBerlinMonthBoundsUtc() : null;
  const startIso = bounds?.startIso ?? null;
  const endIso = bounds?.endExclusiveIso ?? null;

  let clicksQuery = supabase
    .from("partner_clicks")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId);
  let attrQuery = supabase
    .from("partner_attributions")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId);
  let periodCommissionsQuery = supabase
    .from("partner_commissions")
    .select("amount_cents, status")
    .eq("partner_id", partnerId);

  if (startIso && endIso) {
    clicksQuery = clicksQuery.gte("created_at", startIso).lt("created_at", endIso);
    attrQuery = attrQuery.gte("registered_at", startIso).lt("registered_at", endIso);
    periodCommissionsQuery = periodCommissionsQuery
      .gte("earned_at", startIso)
      .lt("earned_at", endIso);
  }

  const [
    clicksRes,
    attrRes,
    periodCommissionsRes,
    allCommissionsRes,
    linksRes,
    recentCommissionsRes,
    payoutsRes,
    notificationsRes,
  ] = await Promise.all([
    clicksQuery,
    attrQuery,
    periodCommissionsQuery,
    supabase.from("partner_commissions").select("amount_cents, status").eq("partner_id", partnerId),
    supabase
      .from("partner_links")
      .select("id, code, campaign, target_path, is_active")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_commissions")
      .select("id, amount_cents, currency, status, earned_at")
      .eq("partner_id", partnerId)
      .order("earned_at", { ascending: false })
      .limit(50),
    supabase
      .from("partner_payouts")
      .select("id, amount_cents, currency, status, paid_at, period_start, period_end")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("partner_notifications")
      .select("id, type, title, body, read_at, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const periodCommissions = (periodCommissionsRes.data ?? []) as Array<{
    amount_cents: number;
    status: string;
  }>;
  const allCommissions = (allCommissionsRes.data ?? []) as Array<{
    amount_cents: number;
    status: string;
  }>;

  const periodAmounts = computeDashboardAmounts(periodCommissions);
  const balances = computeDashboardAmounts(allCommissions);

  let payments = 0;
  for (const c of periodCommissions) {
    if (c.status === "approved" || c.status === "paid") payments += 1;
  }

  const notifications = (notificationsRes.data ?? []) as PartnerDashboardDto["notifications"];
  const unread = notifications.filter((n) => !n.read_at).length;

  const payouts = (payoutsRes.data ?? []) as PartnerDashboardDto["payouts"];
  const lastPaid = payouts.find((x) => x.paid_at)?.paid_at ?? null;

  return {
    partner: {
      id: p.id,
      name: p.name,
      status: p.status,
      commission_amount_cents: p.commission_amount_cents,
      currency: p.currency,
      referral_code: p.referral_code,
      referral_path: `/r/${p.referral_code}`,
    },
    period,
    period_bounds: { start: startIso, end_exclusive: endIso },
    metrics: {
      clicks: clicksRes.count ?? 0,
      registrations: attrRes.count ?? 0,
      payments,
      earned_cents: periodAmounts.total_earned_cents,
    },
    balances,
    links: ((linksRes.data ?? []) as Array<{
      id: string;
      code: string;
      campaign: string | null;
      target_path: string;
      is_active: boolean;
    }>).map((l) => ({
      ...l,
      referral_path: `/r/${l.code}`,
    })),
    commissions: (
      (recentCommissionsRes.data ?? []) as Array<{
        id: string;
        amount_cents: number;
        currency: string;
        status: string;
        earned_at: string;
      }>
    ).map((c) => ({
      id: c.id,
      public_ref: publicCommissionRef(c.id),
      amount_cents: c.amount_cents,
      currency: c.currency,
      status: c.status,
      earned_at: c.earned_at,
    })),
    payouts,
    notifications,
    unread_notifications: unread,
    last_payout_at: lastPaid,
  };
}
