import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function SpecialistProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { specialist } = await getCurrentUserAndSpecialist();

  return <DashboardShell specialist={specialist}>{children}</DashboardShell>;
}
