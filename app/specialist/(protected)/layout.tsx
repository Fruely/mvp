import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";

export default async function SpecialistProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCurrentUserAndSpecialist();
  return <>{children}</>;
}
