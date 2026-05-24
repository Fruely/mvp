import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCurrentUserAndSpecialist,
  getSpecialistOnboardingGateState,
} from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

function isOnboardingAllowedPath(pathname: string, lang: Lang): boolean {
  const dashboardBase = `/${lang}/specialist/dashboard`;
  return (
    pathname === `${dashboardBase}/onboarding` ||
    pathname.startsWith(`${dashboardBase}/onboarding/`) ||
    pathname === `${dashboardBase}/services` ||
    pathname.startsWith(`${dashboardBase}/services/`) ||
    pathname === `${dashboardBase}/settings` ||
    pathname.startsWith(`${dashboardBase}/settings/`)
  );
}

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
  const pathname = headers().get("x-freuly-pathname") || "";
  const gate = await getSpecialistOnboardingGateState(specialist, service);

  if (gate.state !== "published" && !isOnboardingAllowedPath(pathname, lang)) {
    const step = gate.state === "ready" ? "review" : "welcome";
    redirect(`/${lang}/specialist/dashboard/onboarding?step=${step}&reason=incomplete_profile`);
  }

  const plan = await getSpecialistPlanForDashboard(service, specialist.id);

  return (
    <DashboardShell
      specialist={specialist}
      planStatusForBadge={plan.plan_status}
      lang={lang}
      dict={dict}
      isPublished={gate.state === "published"}
    >
      {children}
    </DashboardShell>
  );
}
