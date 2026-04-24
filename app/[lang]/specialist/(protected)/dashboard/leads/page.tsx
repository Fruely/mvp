export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import LeadsTable from "@/components/dashboard/LeadsTable";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  getSubscriptionDisplayState,
  leadsBannerSeverity,
  leadsSubscriptionBannerText,
  subscriptionNoticePanelClass,
} from "@/lib/specialists/subscriptionDisplay";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { isContactsLocked } from "@/lib/dashboard/isContactsLocked";
import type { DashboardLead } from "@/lib/dashboard/getDashboardData";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

export default async function SpecialistDashboardLeadsPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";
  const dict = await getDictionary(lang);

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

  const plan = await getSpecialistPlanForDashboard(service, specialist.id);
  const contactsLocked = isContactsLocked(plan.plan_status);
  const display = getSubscriptionDisplayState(plan);
  const leadsBanner = leadsSubscriptionBannerText(dict, display);

  return (
    <div className="space-y-4">
      {leadsBanner ? (
        <div
          className={`${subscriptionNoticePanelClass(leadsBannerSeverity(display))} text-sm leading-relaxed`}
          role="status"
        >
          {leadsBanner}
        </div>
      ) : null}
      <LeadsTable initialLeads={leads} contactsLocked={contactsLocked} />
    </div>
  );
}

