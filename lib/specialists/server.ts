import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { specialistLangBecomePath } from "@/lib/specialists/navigation";

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
  category_id?: string | null;
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
  "id, user_id, name, email, phone, category_id, status, password_set_at";

export async function getCurrentUserAndSpecialist() {
  const supabase = createSupabaseServerClient();
  const service = createServiceClient();

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      redirect("/login");
    }

    user = data.user;
  } catch (e) {
    console.error("[auth] getUser crash", e);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  const { data: specRow, error: specError } = await service
    .from("specialists")
    .select(COLS)
    .eq("user_id", user.id)
    .neq("status", "blocked")
    .maybeSingle();

  if (specError) {
    console.error("[specialists/server] failed to load specialist", specError);
  }

  let specialist: SpecialistRow | null = toSpecialistRow(specRow);

  if (!specialist) {
    const normalizedEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : null;
    const { data: created, error: createError } = await service
      .from("specialists")
      .insert({
        user_id: user.id,
        name: null,
        email: normalizedEmail,
        status: "draft",
        is_active: false,
        is_visible: false,
      })
      .select(COLS)
      .maybeSingle();

    if (createError) {
      console.error("[specialists/server] failed to auto-create draft specialist", createError);
    }
    specialist = toSpecialistRow(created);
  }

  if (!specialist) {
    redirect(specialistLangBecomePath());
  }

  return {
    user,
    specialist,
  };
}
