import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SPECIALIST_ID_COOKIE = "specialist_id";

type SpecialistProfile = {
  id: string;
  status: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
};

export default async function SpecialistDashboardPage() {
  const cookieStore = await cookies();
  const specialistId = cookieStore.get(SPECIALIST_ID_COOKIE)?.value?.trim();

  if (!specialistId) {
    redirect("/specialist/login");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("id, status, rejection_reason, approved_at, rejected_at")
    .eq("id", specialistId)
    .maybeSingle();

  if (error) {
    console.error("[specialist dashboard] Fetch error:", error);
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Specialist dashboard
          </h1>
          <p className="rounded-lg border border-gray-200 bg-white p-4 text-gray-600">
            Something went wrong. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Specialist dashboard
          </h1>
          <p className="rounded-lg border border-gray-200 bg-white p-4 text-gray-600">
            Profile not found.
          </p>
        </div>
      </div>
    );
  }

  const profile = data as SpecialistProfile;
  const status = profile.status ?? "pending";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Specialist dashboard
        </h1>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {status === "pending" && (
            <p className="text-gray-700">
              Your profile is under review.
            </p>
          )}
          {status === "approved" && (
            <p className="text-gray-700">
              Your profile is approved and active.
            </p>
          )}
          {status === "rejected" && (
            <div className="space-y-3">
              <p className="text-gray-700">
                Your profile was not approved.
              </p>
              {profile.rejection_reason?.trim() && (
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">Reason</p>
                  <p className="mt-1 text-gray-700">
                    {profile.rejection_reason.trim()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
