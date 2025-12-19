import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseServerClient: SupabaseClient | null = null;

export function createSupabaseServerClient(): SupabaseClient {
  if (!supabaseServerClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase server environment variables');
    }

    supabaseServerClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseServerClient;
}
