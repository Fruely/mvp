import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const CLIENT_ID_COOKIE = "client_id";

export default async function ClientDashboardPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get(CLIENT_ID_COOKIE)?.value?.trim();

  if (!clientId) {
    redirect("/client/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Client dashboard
        </h1>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-700">
            This is your client dashboard. You will be able to manage your
            requests and communication here.
          </p>
        </div>
      </div>
    </div>
  );
}
