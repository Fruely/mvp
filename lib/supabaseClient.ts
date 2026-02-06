import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

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
      authOptions.redirectTo = `${siteUrl}/specialist/dashboard`;
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
