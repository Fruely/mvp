import { resolveBearerAuthUser, type BearerAuthResolution } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient as createSessionClient } from "@/lib/supabase/auth-server";

export function decideInstallationUser(
  bearer: BearerAuthResolution,
  cookieUserId: string | null,
): { userId: string } | { status: 401 } {
  if (bearer.kind === "invalid") return { status: 401 };
  if (bearer.kind === "authenticated") return { userId: bearer.userId };
  if (!cookieUserId) return { status: 401 };
  return { userId: cookieUserId };
}

export async function requireInstallationUser(request: Request): Promise<{ userId: string } | { status: 401 }> {
  const bearer = await resolveBearerAuthUser(request);
  if (bearer.kind === "invalid") return { status: 401 };
  if (bearer.kind === "authenticated") return { userId: bearer.userId };
  const session = await createSessionClient().auth.getUser();
  return decideInstallationUser(bearer, session.data.user?.id ?? null);
}
