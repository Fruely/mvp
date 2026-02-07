import { SupabaseClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/** Redirect path for the specialist office (cabinet). Used after auth so specialists land in dashboard. */
export const SPECIALIST_OFFICE_PATH = '/specialist/dashboard';

/**
 * Browser Supabase client. Uses createClientComponentClient so session is stored in cookies —
 * then the server (auth-server) can read the same session after magic link.
 * Do NOT use createClient() from @supabase/supabase-js here (it uses localStorage; server would not see session).
 *
 * In Supabase Dashboard → Authentication → URL Configuration, add to Redirect URLs:
 * - {NEXT_PUBLIC_SITE_URL}/specialist/dashboard
 * - {NEXT_PUBLIC_SITE_URL}/specialist/claim
 */
export function getSupabase(): SupabaseClient {
  return createClientComponentClient() as unknown as SupabaseClient;
}

// Export supabase instance that works both client and server-side
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabase();
    return (client as any)[prop];
  },
});
