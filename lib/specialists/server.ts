import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

/** Marketplace v2 canonical statuses + legacy compatibility during rollout. */
export type SpecialistStatus =
  | "draft"
  | "published_unverified"
  | "featured_verified"
  | "blocked"
  | "approved"
  | "paused"
  | "pending";

export type SpecialistRow = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  name?: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  password_set_at?: string | null;
};

function toSpecialistRow(row: Record<string, unknown> | null): SpecialistRow | null {
  if (!row) return null;
  const first_name = (row.name as string) ?? (row.first_name as string) ?? null;
  return { ...row, first_name } as SpecialistRow;
}

// Table has "name"; some code expects "first_name" — we map name → first_name when returning
const COLS =
  "id, user_id, name, email, phone, status, password_set_at";

export async function getCurrentUserAndSpecialist() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let specialist: SpecialistRow | null = await supabase
    .from("specialists")
    .select(COLS)
    .eq("user_id", user.id)
    .maybeSingle()
    .then((r) => toSpecialistRow(r.data));

  if (!specialist && user.email) {
    const service = createServiceClient();
    const { data: byEmail } = await service
      .from("specialists")
      .select(COLS)
      .eq("email", user.email.trim().toLowerCase())
      .is("user_id", null)
      .maybeSingle();

    const row = toSpecialistRow(byEmail);
    if (row) {
      await service
        .from("specialists")
        .update({ user_id: user.id })
        .eq("id", row.id);
      specialist = { ...row, user_id: user.id };
    }
  }

  if (!specialist) {
    redirect("/specialist/claim/invalid");
  }

  return {
    supabase,
    user,
    specialist,
  };
}
