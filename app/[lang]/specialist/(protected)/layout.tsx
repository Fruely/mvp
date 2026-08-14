import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/dashboard/getDashboardContext";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

function isOnboardingAllowedPath(pathname: string, lang: Lang): boolean {
  const dashboardBase = `/${lang}/specialist/dashboard`;
  if (
    pathname === `${dashboardBase}/onboarding` ||
    pathname.startsWith(`${dashboardBase}/onboarding/`) ||
    pathname === `${dashboardBase}/services` ||
    pathname.startsWith(`${dashboardBase}/services/`) ||
    pathname === `${dashboardBase}/settings` ||
    pathname.startsWith(`${dashboardBase}/settings/`) ||
    pathname === `${dashboardBase}/requests/promoted` ||
    pathname.startsWith(`${dashboardBase}/requests/promoted/`)
  ) {
    return true;
  }
  return false;
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
  const [ctx, dict] = await Promise.all([getDashboardContext(), getDictionary(lang)]);
  const { specialist, gate, plan } = ctx;
  const pathname = headers().get("x-freuly-pathname") || "";

  if (gate.state !== "published" && !isOnboardingAllowedPath(pathname, lang)) {
    const step = gate.firstIncompleteStep ?? "basic";
    redirect(`/${lang}/specialist/dashboard/onboarding?step=${step}&reason=incomplete_profile`);
  }

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
