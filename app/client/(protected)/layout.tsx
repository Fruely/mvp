import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const CLIENT_ID_COOKIE = "client_id";

export default async function ClientProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const clientId = cookieStore.get(CLIENT_ID_COOKIE)?.value;

  if (!clientId || !clientId.trim()) {
    redirect("/client/login");
  }

  return <>{children}</>;
}
