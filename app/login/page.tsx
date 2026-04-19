import { redirect } from "next/navigation";
import { specialistDashboardPath } from "@/lib/specialists/navigation";
import SpecialistPasswordSignIn from "@/app/specialist/claim/SpecialistPasswordSignIn";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

/**
 * Stable login route:
 * - not logged in -> show login form
 * - logged in with specialist -> dashboard
 * - logged in without specialist -> claim flow
 */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const authClient = createSupabaseServerClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (user) {
    const { data: specialist } = await serviceClient
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specialist?.id) {
      redirect(specialistDashboardPath());
    }

    redirect("/specialist/claim");
  }

  return (
    <div className="min-h-[40vh] px-4 py-10">
      <SpecialistPasswordSignIn />
    </div>
  );
}
