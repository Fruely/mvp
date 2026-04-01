import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client configured with user session from Next.js cookies.
 * Uses @supabase/ssr so authenticated server queries pass RLS checks.
 *
 * This helper is intended for user-facing flows (e.g. specialist dashboard),
 * not for admin or service-role operations.
 */
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch (err) {
          console.error(
            "[supabase/auth-server] Failed to persist auth cookies (Server Components may forbid cookie writes in this context). Session refresh might not be saved.",
            err
          );
        }
      },
    },
  });
}
