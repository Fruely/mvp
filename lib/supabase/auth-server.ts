import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return { supabaseUrl, anonKey };
}

/**
 * Supabase client with the user session from cookies, read-only cookie adapter.
 * Use in Server Components, layouts, and any server code where Next.js does not
 * allow `cookies().set` (only Route Handlers and Server Actions may mutate cookies).
 *
 * If Supabase refreshes the session during a call, the new tokens are not persisted
 * here — API routes that use {@link createSupabaseServerClient} can persist them.
 */
export function createSupabaseServerComponentClient() {
  const { supabaseUrl, anonKey } = getSupabaseEnv();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* RSC / layout: cookie writes are forbidden; omit refresh persistence. */
      },
    },
  });
}

/**
 * Supabase client configured with user session from Next.js cookies, with cookie writes.
 * Use in Route Handlers and Server Actions so refreshed sessions can be saved.
 *
 * Do not use in Server Components — prefer {@link createSupabaseServerComponentClient}.
 */
export function createSupabaseServerClient() {
  const { supabaseUrl, anonKey } = getSupabaseEnv();
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
            "[supabase/auth-server] Failed to persist auth cookies.",
            err
          );
        }
      },
    },
  });
}
