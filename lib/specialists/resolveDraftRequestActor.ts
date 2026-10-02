import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient as createCookieClient } from "@/lib/supabase/auth-server";

export type DraftRequestActor =
  | { kind: "unauthorized" }
  | { kind: "ok"; userId: string; email: string | null };

export function normalizeDraftActorEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

/**
 * The actor is the verified session. Email comes from that user, never from the request body.
 */
export async function resolveDraftRequestActor(request: Request): Promise<DraftRequestActor> {
  const token = readBearerToken(request);
  if (request.headers.get("authorization") && !token) {
    return { kind: "unauthorized" };
  }

  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error("Missing Supabase public environment variables");
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) {
      return { kind: "unauthorized" };
    }
    return {
      kind: "ok",
      userId: data.user.id,
      email: normalizeDraftActorEmail(data.user.email),
    };
  }

  const cookieClient = createCookieClient();
  const { data, error } = await cookieClient.auth.getUser();
  if (error || !data.user?.id) {
    return { kind: "unauthorized" };
  }

  return {
    kind: "ok",
    userId: data.user.id,
    email: normalizeDraftActorEmail(data.user.email),
  };
}
