import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { isSupportedLang, type Lang } from "@/lib/i18n";

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

  return (
    <DashboardShell specialist={specialist} lang={lang}>
      {children}
    </DashboardShell>
  );
}
