import { NextRequest, NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { jsonNoStore } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeTelegramChannelCta,
  normalizeTelegramChannelText,
} from "@/lib/telegram/channelPosts";

export const dynamic = "force-dynamic";

type TelegramPostStatus = "draft" | "scheduled";

function parseScheduledAt(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function parseStatus(value: unknown): TelegramPostStatus {
  return value === "scheduled" ? "scheduled" : "draft";
}

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("telegram_channel_posts")
    .select(
      "id, title, body_text, cta_label, cta_url, status, scheduled_at, published_at, telegram_message_id, error_message, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/telegram/channel-posts] list failed", error);
    return jsonNoStore({ error: "Failed to load Telegram posts" }, { status: 500 });
  }

  return jsonNoStore({ posts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyText = normalizeTelegramChannelText(body.body_text);
  if (!bodyText) {
    return jsonNoStore(
      { error: "Post text is required and must be 1-4096 characters" },
      { status: 400 }
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 160)
      : null;
  const status = parseStatus(body.status);
  const scheduledAt = parseScheduledAt(body.scheduled_at);
  const wantsCta = body.cta_enabled === true;
  const cta = wantsCta
    ? normalizeTelegramChannelCta(body.cta_label, body.cta_url)
    : null;

  if (wantsCta && !cta) {
    return jsonNoStore(
      { error: "Button text and a valid HTTP(S) URL are required" },
      { status: 400 }
    );
  }

  if (status === "scheduled" && !scheduledAt) {
    return jsonNoStore(
      { error: "Scheduled posts require a valid scheduled_at value" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("telegram_channel_posts")
    .insert({
      title,
      body_text: bodyText,
      cta_label: cta?.label ?? null,
      cta_url: cta?.url ?? null,
      status,
      scheduled_at: scheduledAt,
    })
    .select(
      "id, title, body_text, cta_label, cta_url, status, scheduled_at, published_at, telegram_message_id, error_message, created_at, updated_at"
    )
    .single();

  if (error) {
    console.error("[admin/telegram/channel-posts] create failed", error);
    return jsonNoStore({ error: "Failed to create Telegram post" }, { status: 500 });
  }

  return jsonNoStore({ post: data }, { status: 201 });
}
