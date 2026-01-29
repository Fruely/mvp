import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Supabase client configured with user session from cookies.
 * Uses @supabase/auth-helpers-nextjs and respects RLS policies.
 *
 * This helper is intended for user-facing flows (e.g. specialist dashboard),
 * not for admin or service-role operations.
 */
export function createSupabaseServerClient() {
  return createServerComponentClient({
    cookies,
  });
}
