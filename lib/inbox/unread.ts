import type { SupabaseClient } from "@supabase/supabase-js";

/** Missing tables (migration not applied yet) show zero rather than breaking the dashboard. */
export async function countUnreadInbox(supabase: SupabaseClient, userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("inbox_items")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null);
    if (error || typeof count !== "number") return 0;
    return count;
  } catch {
    return 0;
  }
}
