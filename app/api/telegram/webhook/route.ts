import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
};

function parseStartSpecialistId(text: string | undefined): string | null {
  if (!text) return null;

  const trimmed = text.trim();

  // убираем /start или /start@bot
  const withoutCommand = trimmed.replace(/^\/start(@[\w_]+)?/, "").trim();

  if (!withoutCommand) return null;

  // берём первый аргумент как ID
  const parts = withoutCommand.split(/\s+/);

  return parts[0] || null;
}

async function sendTelegramChatMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let body: TelegramUpdate;
  try {
    body = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = body.message;
  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const specialistId = parseStartSpecialistId(message.text);

  console.log("TELEGRAM TEXT:", message.text);
  console.log("PARSED ID:", specialistId);
  console.log("CHAT ID:", chatId);

  if (!specialistId) {
    await sendTelegramChatMessage(
      chatId,
      "Откройте бота по кнопке из кабинета (не вручную)"
    );
    return NextResponse.json({ ok: true });
  }

  const supabase = createSupabaseServerClient();

  const { data: updated, error } = await supabase
    .from("specialists")
    .update({ telegram_chat_id: chatId })
    .eq("id", specialistId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    await sendTelegramChatMessage(
      chatId,
      "Специалист не найден. Откройте ссылку заново из кабинета"
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramChatMessage(chatId, "✅ Telegram подключен");

  return NextResponse.json({ ok: true });
}
