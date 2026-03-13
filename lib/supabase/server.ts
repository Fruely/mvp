import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server-only use (admin APIs, bypass RLS).
 * Do NOT use for auth.getSession() or any user session checks — use
 * createSupabaseServerClient from @/lib/supabase/auth-server instead.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" as RequestCache }),
    },
  });
}
