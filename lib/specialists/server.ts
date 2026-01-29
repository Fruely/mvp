import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export type SpecialistStatus = "pending" | "active" | "paused";

type SpecialistRow = {
  id: string;
  user_id: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  status: SpecialistStatus | null;
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
    redirect("/specialist/apply");
  }

  return {
    supabase,
    user,
    specialist: specialist as SpecialistRow,
  };
}
