import { createClient } from "@supabase/supabase-js";

export type BearerAuthResolution =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "authenticated"; userId: string };

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

function getSupabasePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return { supabaseUrl, anonKey };
}

export async function resolveBearerAuthUser(request: Request): Promise<BearerAuthResolution> {
  const token = readBearerToken(request);
  if (!token) {
    return { kind: "absent" };
  }

  const { supabaseUrl, anonKey } = getSupabasePublicEnv();
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.id) {
    return { kind: "invalid" };
  }

  return { kind: "authenticated", userId: user.id };
}
