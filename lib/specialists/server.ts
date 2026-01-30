import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

/** Canon: approved = visible + dashboard; paused = hidden + dashboard; pending/email_unverified/etc = no dashboard */
export type SpecialistStatus = "approved" | "paused" | "pending";

type SpecialistRow = {
  id: string;
  user_id: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
};

export async function getCurrentUserAndSpecialist() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: specialist } = await supabase
    .from("specialists")
    .select("id, user_id, first_name, email, phone, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!specialist) {
    redirect("/ua");
  }

  return {
    supabase,
    user,
    specialist: specialist as SpecialistRow,
  };
}
