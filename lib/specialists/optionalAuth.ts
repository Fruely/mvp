import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import type { SpecialistRow } from "@/lib/specialists/server";

const COLS = "id, user_id, name, email, phone, category_id, status, password_set_at";

function toSpecialistRow(row: Record<string, unknown> | null): SpecialistRow | null {
  if (!row) return null;
  const first_name = (row.name as string) ?? (row.first_name as string) ?? null;
  return { ...row, first_name } as SpecialistRow;
}

/** Non-throwing auth lookup for public pages (e.g. pricing). Does not auto-create specialists. */
export async function getOptionalAuthenticatedSpecialist(): Promise<{
  specialist: SpecialistRow | null;
  isAuthenticated: boolean;
}> {
  const authClient = createSupabaseServerComponentClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { specialist: null, isAuthenticated: false };
  }

  const { data: specRow } = await service
    .from("specialists")
    .select(COLS)
    .eq("user_id", user.id)
    .neq("status", "blocked")
    .maybeSingle();

  return {
    specialist: toSpecialistRow(specRow as Record<string, unknown> | null),
    isAuthenticated: true,
  };
}
