import type { SupabaseClient } from "@supabase/supabase-js";
import { loadNotificationPreferences } from "./preferences";
import { isExpoPushConfigured } from "./transport";

export async function isRecipientPushReady(supabase: SupabaseClient, userId: string | null): Promise<boolean> {
  if (!userId || !isExpoPushConfigured()) return false;
  try {
    const prefs = await loadNotificationPreferences(supabase, userId);
    if (!prefs.pushEnabled) return false;
    const rows = await supabase
      .from("push_endpoints")
      .select("id, enabled, invalidated_at, token")
      .eq("user_id", userId)
      .eq("enabled", true)
      .is("invalidated_at", null)
      .limit(1);
    if (rows.error) return false;
    return (rows.data ?? []).some((row) => row.enabled !== false && !row.invalidated_at && typeof row.token === "string" && row.token.length > 0);
  } catch {
    return false;
  }
}
