import { NextRequest } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { jsonNoStore } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeTelegramChannelCta,
  sendTelegramChannelPost,
} from "@/lib/telegram/channelPosts";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  const id = params.id;
  if (!UUID_PATTERN.test(id)) {
    return jsonNoStore({ error: "Invalid post id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: post, error: loadError } = await supabase
    .from("telegram_channel_posts")
    .select("id, body_text, cta_label, cta_url, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[admin/telegram/channel-posts/publish] load failed", loadError);
    return jsonNoStore({ error: "Failed to load Telegram post" }, { status: 500 });
  }
  if (!post) {
    return jsonNoStore({ error: "Post not found" }, { status: 404 });
  }
  if (post.status === "published") {
    return jsonNoStore({ error: "Post is already published" }, { status: 409 });
  }

  const cta = normalizeTelegramChannelCta(post.cta_label, post.cta_url);
  const result = await sendTelegramChannelPost(String(post.body_text ?? ""), cta);
  if (!result.ok) {
    await supabase
      .from("telegram_channel_posts")
      .update({
        status: "failed",
        error_message: result.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    return jsonNoStore({ error: result.error }, { status: 502 });
  }

  const publishedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("telegram_channel_posts")
    .update({
      status: "published",
      published_at: publishedAt,
      telegram_message_id: result.messageId,
      error_message: null,
      updated_at: publishedAt,
    })
    .eq("id", id)
    .select(
      "id, title, body_text, cta_label, cta_url, status, scheduled_at, published_at, telegram_message_id, error_message, created_at, updated_at"
    )
    .single();

  if (updateError) {
    console.error("[admin/telegram/channel-posts/publish] update failed", updateError);
    return jsonNoStore(
      { error: "Telegram post was sent, but database update failed" },
      { status: 500 }
    );
  }

  return jsonNoStore({ post: updated });
}
