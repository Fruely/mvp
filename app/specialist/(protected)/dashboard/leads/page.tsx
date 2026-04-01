export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import LeadsTable from "@/components/dashboard/LeadsTable";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { isContactsLocked } from "@/lib/dashboard/isContactsLocked";
import type { DashboardLead } from "@/lib/dashboard/getDashboardData";
import { specialistLangHomePath } from "@/lib/specialists/navigation";

export default async function SpecialistDashboardLeadsPage() {
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data, error } = await service
    .from("leads")
    .select("id, client_name, client_email, client_phone, message, status, created_at")
    .eq("specialist_id", specialist.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard/leads] failed to load leads", error);
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

  const specialistRecord = specialist as unknown as Record<string, unknown>;
  const subscriptionStatus =
    typeof specialistRecord.subscription_status === "string" ? specialistRecord.subscription_status : null;
  const contactsLocked = isContactsLocked(subscriptionStatus);

  return <LeadsTable initialLeads={leads} contactsLocked={contactsLocked} />;
}

