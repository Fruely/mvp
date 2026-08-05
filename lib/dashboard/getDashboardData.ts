import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DASHBOARD_LEAD_REDACTED_SELECT,
  mapRowToDashboardLead,
  type DashboardLead,
} from "@/lib/leads/contactUnlock";

export type { DashboardLead };

export type DailyLeadPoint = {
  date: string;
  count: number;
};

export type DashboardData = {
  leadsRecent: DashboardLead[];
  activityByDay: DailyLeadPoint[];
  counts: {
    new: number;
    contacted: number;
    closed: number;
  };
  totalLast30Days: number;
};

export function aggregateLeadsByDay(
  leads: DashboardLead[],
  days = 30
): DailyLeadPoint[] {
  const countByDate = new Map<string, number>();

  for (const lead of leads) {
    const rawDate = typeof lead.created_at === "string" ? lead.created_at.slice(0, 10) : "";
    if (!rawDate) continue;
    countByDate.set(rawDate, (countByDate.get(rawDate) ?? 0) + 1);
  }

  const result: DailyLeadPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      count: countByDate.get(key) ?? 0,
    });
  }

  return result;
}

export async function getDashboardData(
  supabase: SupabaseClient,
  specialistId: string
): Promise<DashboardData> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("leads")
    .select(DASHBOARD_LEAD_REDACTED_SELECT)
    .eq("specialist_id", specialistId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] failed to load leads", error);
    return {
      leadsRecent: [],
      activityByDay: aggregateLeadsByDay([], 30),
      counts: { new: 0, contacted: 0, closed: 0 },
      totalLast30Days: 0,
    };
  }

  const leads: DashboardLead[] = (data ?? []).map((row) =>
    mapRowToDashboardLead(row as Record<string, unknown>),
  );

  const counts = leads.reduce(
    (acc, lead) => {
      if (lead.status === "new") acc.new += 1;
      if (lead.status === "contacted") acc.contacted += 1;
      if (lead.status === "closed") acc.closed += 1;
      return acc;
    },
    { new: 0, contacted: 0, closed: 0 }
  );

  return {
    leadsRecent: leads.slice(0, 5),
    activityByDay: aggregateLeadsByDay(leads, 30),
    counts,
    totalLast30Days: leads.length,
  };
}
