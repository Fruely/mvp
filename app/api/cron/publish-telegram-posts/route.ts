import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTelegramChannelPost } from "@/lib/telegram/channelPosts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: posts, error } = await supabase
    .from("telegram_channel_posts")
    .select("id, body_text")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[cron/publish-telegram-posts] query failed", error);
    return jsonNoStore({ error: "Query failed" }, { status: 500 });
  }

  let published = 0;
  let failed = 0;

  for (const post of posts ?? []) {
    const result = await sendTelegramChannelPost(String(post.body_text ?? ""));
    const updatedAt = new Date().toISOString();

    if (result.ok) {
      const { error: updateError } = await supabase
        .from("telegram_channel_posts")
        .update({
          status: "published",
          published_at: updatedAt,
          telegram_message_id: result.messageId,
          error_message: null,
          updated_at: updatedAt,
        })
        .eq("id", post.id);

      if (updateError) {
        failed++;
        console.error("[cron/publish-telegram-posts] update failed", updateError);
      } else {
        published++;
      }
    } else {
      failed++;
      await supabase
        .from("telegram_channel_posts")
        .update({
          status: "failed",
          error_message: result.error,
          updated_at: updatedAt,
        })
        .eq("id", post.id);
    }
  }

  return jsonNoStore({ checked: posts?.length ?? 0, published, failed });
}
