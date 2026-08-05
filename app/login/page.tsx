import { redirect } from "next/navigation";
import { resolveSafeNextPath } from "@/lib/auth/safeNextPath";
import SpecialistPasswordSignIn from "@/app/specialist/claim/SpecialistPasswordSignIn";
import { specialistDashboardPath } from "@/lib/specialists/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

/**
 * Stable login route:
 * - not logged in -> show login form
 * - logged in with valid `next` -> requested internal path
 * - logged in with specialist -> dashboard
 * - logged in without specialist -> claim flow
 */
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { next?: string } | Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const resolved = await Promise.resolve(searchParams ?? {});
  const safeNext = resolveSafeNextPath(
    typeof resolved.next === "string" ? resolved.next : null
  );

  const authClient = createSupabaseServerComponentClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (user) {
    if (safeNext) {
      redirect(safeNext);
    }

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

  const allowPartnerSignUp = Boolean(safeNext?.includes("/partners/"));

  return (
    <div className="min-h-[40vh] px-4 py-10">
      <SpecialistPasswordSignIn nextPath={safeNext} allowPartnerSignUp={allowPartnerSignUp} />
    </div>
  );
}
