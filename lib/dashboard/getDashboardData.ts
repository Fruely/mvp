import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadStatus = "new" | "contacted" | "closed";

export type DashboardLead = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

export type DashboardData = {
  leadsRecent: DashboardLead[];
  counts: {
    new: number;
    contacted: number;
    closed: number;
  };
  totalLast30Days: number;
};

export async function getDashboardData(
  supabase: SupabaseClient,
  specialistId: string
): Promise<DashboardData> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("leads")
    .select("id, client_name, client_email, client_phone, message, status, created_at")
    .eq("specialist_id", specialistId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] failed to load leads", error);
    return {
      leadsRecent: [],
      counts: { new: 0, contacted: 0, closed: 0 },
      totalLast30Days: 0,
    };
  }

  const leads: DashboardLead[] = (data ?? []).map((row) => ({
    id: String(row.id),
    client_name: typeof row.client_name === "string" ? row.client_name : null,
    client_email: typeof row.client_email === "string" ? row.client_email : null,
    client_phone: typeof row.client_phone === "string" ? row.client_phone : null,
    message: typeof row.message === "string" ? row.message : null,
    status: typeof row.status === "string" ? row.status : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  }));

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
    counts,
    totalLast30Days: leads.length,
  };
}

