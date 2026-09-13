const TELEGRAM_API = "https://api.telegram.org";

export type TelegramChannelPostSendResult =
  | { ok: true; messageId: number | null }
  | { ok: false; error: string };

function getTelegramConfig(): { token: string; channelId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const channelId = process.env.TELEGRAM_CHANNEL_ID?.trim();

  if (!token || !channelId) return null;

  return { token, channelId };
}

function extractTelegramError(body: unknown): string {
  if (!body || typeof body !== "object") return "Telegram request failed";
  const description = (body as { description?: unknown }).description;
  return typeof description === "string" && description.trim()
    ? description
    : "Telegram request failed";
}

export function normalizeTelegramChannelText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text || text.length > 4096) return null;

  return text;
}

export async function sendTelegramChannelPost(
  text: string
): Promise<TelegramChannelPostSendResult> {
  const config = getTelegramConfig();
  if (!config) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not configured",
    };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.channelId,
        text,
        disable_web_page_preview: false,
      }),
    });

    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; result?: { message_id?: number } }
      | null;

    if (!res.ok || body?.ok === false) {
      return { ok: false, error: extractTelegramError(body) };
    }

    return {
      ok: true,
      messageId:
        typeof body?.result?.message_id === "number"
          ? body.result.message_id
          : null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Telegram request failed",
    };
  }
}
