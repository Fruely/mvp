import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

export default async function SpecialistProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";
  const { specialist } = await getCurrentUserAndSpecialist();
  const dict = await getDictionary(lang);
  const service = createServiceClient();
  const plan = await getSpecialistPlanForDashboard(service, specialist.id);

  return (
    <DashboardShell specialist={specialist} planStatusForBadge={plan.plan_status} lang={lang} dict={dict}>
      {children}
    </DashboardShell>
  );
}
