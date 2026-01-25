import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SPECIALIST_ID_COOKIE = "specialist_id";

export default async function SpecialistProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const specialistId = cookieStore.get(SPECIALIST_ID_COOKIE)?.value;

  if (!specialistId || !specialistId.trim()) {
    redirect("/specialist/login");
  }

  return <>{children}</>;
}
