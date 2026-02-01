import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

/** Canon: approved = visible + dashboard; paused = hidden + dashboard; pending/email_unverified/etc = no dashboard */
export type SpecialistStatus = "approved" | "paused" | "pending";

export type SpecialistRow = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  password_set_at?: string | null;
};

const COLS =
  "id, user_id, first_name, email, phone, status, password_set_at";

export async function getCurrentUserAndSpecialist() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let specialist = await supabase
    .from("specialists")
    .select(COLS)
    .eq("user_id", user.id)
    .maybeSingle()
    .then((r) => r.data);

  if (!specialist && user.email) {
    const service = createServiceClient();
    const { data: byEmail } = await service
      .from("specialists")
      .select(COLS)
      .eq("email", user.email.trim().toLowerCase())
      .is("user_id", null)
      .maybeSingle();

    if (byEmail) {
      await service
        .from("specialists")
        .update({ user_id: user.id })
        .eq("id", byEmail.id);
      specialist = { ...byEmail, user_id: user.id };
    }
  }

  if (!specialist) {
    redirect("/ua");
  }

  return {
    supabase,
    user,
    specialist: specialist as SpecialistRow,
  };
}
