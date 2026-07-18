import type { SupabaseClient } from "@supabase/supabase-js";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  aggregatePeriodReport,
  type PeriodReportAmounts,
} from "@/lib/partners/monthlyBounds";

export {
  aggregatePeriodReport,
  berlinLocalToUtc,
  getBerlinMonthBoundsUtc,
  isTimestampInRange,
  type MonthBounds,
  type PeriodReportAmounts,
} from "@/lib/partners/monthlyBounds";

export async function getPartnerPeriodReport(
  supabase: SupabaseClient,
  partnerId: string,
  start: Date,
  endExclusive: Date
): Promise<PeriodReportAmounts> {
  if (!partnerId.trim()) throw new PartnerDomainError("partner_id_required");
  const startIso = start.toISOString();
  const endIso = endExclusive.toISOString();

  const [clicksRes, attrRes, commissionsRes] = await Promise.all([
    supabase
      .from("partner_clicks")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("partner_attributions")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .gte("registered_at", startIso)
      .lt("registered_at", endIso),
    supabase
      .from("partner_commissions")
      .select("amount_cents, status")
      .eq("partner_id", partnerId)
      .gte("earned_at", startIso)
      .lt("earned_at", endIso),
  ]);

  if (clicksRes.error || attrRes.error || commissionsRes.error) {
    throw new PartnerDomainError("period_report_failed", 500);
  }

  return aggregatePeriodReport({
    clicks: clicksRes.count ?? 0,
    registrations: attrRes.count ?? 0,
    commissions: (commissionsRes.data ?? []) as Array<{
      amount_cents: number;
      status: string;
    }>,
  });
}
