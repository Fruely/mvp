import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MATCH_DELIVERY_POLICY } from "@/lib/inbox/policy";
import { resolveRecipientTimeZone } from "./policy";
import { loadNotificationPreferences } from "./preferences";

export async function lookupRecipientTimeZone(supabase: SupabaseClient, userId: string | null): Promise<string> {
  if (!userId) return DEFAULT_MATCH_DELIVERY_POLICY.defaultTimeZone;
  try {
    const prefs = await loadNotificationPreferences(supabase, userId);
    const endpoints = await supabase
      .from("push_endpoints")
      .select("time_zone")
      .eq("user_id", userId)
      .eq("enabled", true)
      .is("invalidated_at", null)
      .limit(1);
    const endpointZone = endpoints.error ? null : endpoints.data?.[0]?.time_zone;
    return resolveRecipientTimeZone(prefs.timeZone, endpointZone);
  } catch {
    return DEFAULT_MATCH_DELIVERY_POLICY.defaultTimeZone;
  }
}
