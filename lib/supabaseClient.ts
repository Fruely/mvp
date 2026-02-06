import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Redirect path for the specialist office (cabinet). Used after auth so specialists land in dashboard. */
export const SPECIALIST_OFFICE_PATH = '/specialist/dashboard';

let supabaseInstance: SupabaseClient | null = null;

/**
 * In Supabase Dashboard → Authentication → URL Configuration, add to Redirect URLs:
 * - {NEXT_PUBLIC_SITE_URL}/specialist/dashboard
 * - {NEXT_PUBLIC_SITE_URL}/specialist/claim
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    if (!siteUrl) {
      console.warn('[supabaseClient] NEXT_PUBLIC_SITE_URL is not set. Auth redirects may fail.');
    }

    const authOptions: any = {};
    if (siteUrl) {
      authOptions.redirectTo = `${siteUrl}${SPECIALIST_OFFICE_PATH}`;
      authOptions.site = siteUrl;
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: authOptions,
    });
  }
  return supabaseInstance;
}

// Export supabase instance that works both client and server-side
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabase();
    return (client as any)[prop];
  },
});
