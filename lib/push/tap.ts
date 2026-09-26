import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordPushTap(
  supabase: SupabaseClient,
  input: { inboxId: string; userId: string },
): Promise<{ tapped: true; read: false } | { error: "not_found" | "forbidden" }> {
  const row = await supabase
    .from("inbox_items")
    .select("id, recipient_user_id, read_at, push_tapped_at")
    .eq("id", input.inboxId)
    .maybeSingle();
  if (row.error || !row.data?.id) return { error: "not_found" };
  if (String(row.data.recipient_user_id) !== input.userId) return { error: "forbidden" };
  if (!row.data.push_tapped_at) {
    await supabase
      .from("inbox_items")
      .update({ push_tapped_at: new Date().toISOString() })
      .eq("id", input.inboxId)
      .eq("recipient_user_id", input.userId);
  }
  return { tapped: true, read: false };
}
