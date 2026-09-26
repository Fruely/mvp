import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient as createSessionClient } from "@/lib/supabase/auth-server";

export async function requirePushUser(request: Request): Promise<{ userId: string } | { status: 401 }> {
  const bearer = await resolveBearerAuthUser(request);
  if (bearer.kind === "invalid") return { status: 401 };
  if (bearer.kind === "authenticated") return { userId: bearer.userId };
  const session = await createSessionClient().auth.getUser();
  if (!session.data.user?.id) return { status: 401 };
  return { userId: session.data.user.id };
}
