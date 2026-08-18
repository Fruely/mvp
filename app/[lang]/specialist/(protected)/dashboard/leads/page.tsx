export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import LeadsTable from "@/components/dashboard/LeadsTable";
import { Alert } from "@/components/ui";
import { dashboardPageStackClass } from "@/components/dashboard/dashboardStyles";
import { canUnlockLeadContacts } from "@/lib/billing/contactUnlockEntitlement";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  getSubscriptionDisplayState,
  leadsBannerSeverity,
  leadsSubscriptionBannerText,
} from "@/lib/specialists/subscriptionDisplay";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import {
  DASHBOARD_LEAD_REDACTED_SELECT,
  mapRowToDashboardLead,
} from "@/lib/leads/contactUnlock";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

export default async function SpecialistDashboardLeadsPage({
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

  const [{ data, error }, plan] = await Promise.all([
    service
      .from("leads")
      .select(DASHBOARD_LEAD_REDACTED_SELECT)
      .eq("specialist_id", specialist.id)
      .order("created_at", { ascending: false }),
    getSpecialistPlanForDashboard(service, specialist.id),
  ]);

  if (error) {
    console.error("[dashboard/leads] failed to load leads", error);
  }

  const leads = (data ?? []).map((row) => mapRowToDashboardLead(row as Record<string, unknown>));
  const display = getSubscriptionDisplayState(plan);
  const leadsBanner = leadsSubscriptionBannerText(dict, display);
  const canUnlockContacts = canUnlockLeadContacts(plan.plan_status);
  const billingHref = `/${lang}/specialist/dashboard/billing`;

  return (
    <div className={dashboardPageStackClass}>
      {leadsBanner ? (
        <Alert variant={leadsBannerSeverity(display) === "danger" ? "error" : leadsBannerSeverity(display) === "warning" ? "warning" : "info"}>
          {leadsBanner}
        </Alert>
      ) : null}
      <LeadsTable
        initialLeads={leads}
        lang={lang}
        dict={dict}
        canUnlockContacts={canUnlockContacts}
        billingHref={billingHref}
      />
    </div>
  );
}
