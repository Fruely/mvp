import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
};

function parseStartSpecialistId(text: string | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const m = trimmed.match(/^\/start(?:@[\w_]+)?(?:\s+(.+))?$/);
  if (!m) return null;
  const payload = m[1]?.trim();
  return payload && payload.length > 0 ? payload : null;
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

  if (!specialistId) {
    await sendTelegramChatMessage(
      chatId,
      "Не удалось привязать: откройте ссылку из кабинета специалиста (команда /start с кодом)."
    );
    return NextResponse.json({ ok: true });
  }

  if (!UUID_REGEX.test(specialistId)) {
    await sendTelegramChatMessage(
      chatId,
      "Некорректная ссылка. Откройте бота по кнопке из личного кабинета Freuly."
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
      "Специалист не найден. Проверьте, что вы открыли актуальную ссылку из кабинета."
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramChatMessage(
    chatId,
    "✅ Telegram подключен. Теперь вы будете получать заявки"
  );

  return NextResponse.json({ ok: true });
}
