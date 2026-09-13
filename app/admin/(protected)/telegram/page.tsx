import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import TelegramChannelPostsClient from "./TelegramChannelPostsClient";

type TelegramChannelPost = {
  id: string;
  title: string | null;
  body_text: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  telegram_message_id: number | null;
  error_message: string | null;
  created_at: string;
};

export default async function AdminTelegramPage() {
  let posts: TelegramChannelPost[] = [];

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("telegram_channel_posts")
      .select(
        "id, title, body_text, status, scheduled_at, published_at, telegram_message_id, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    posts = (data ?? []) as TelegramChannelPost[];
  } catch {
    posts = [];
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Telegram channel</h1>
            <p className="mt-1 text-sm text-gray-600">
              Draft, schedule, and publish posts to the business Telegram channel.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>

        <TelegramChannelPostsClient initialPosts={posts} />
      </div>
    </div>
  );
}
