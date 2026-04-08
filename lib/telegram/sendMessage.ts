const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  leadsDashboardUrl: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Открыть заявку", url: leadsDashboardUrl }],
          ],
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTelegramToOwners(message: string): Promise<void> {
  const raw = process.env.TELEGRAM_OWNER_CHAT_IDS;
  if (!raw?.trim()) {
    console.log("[FREULY][TG] OWNER_CHAT_IDS пустой");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[FREULY][TG] BOT_TOKEN отсутствует");
    return;
  }

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) {
    console.log("[FREULY][TG] нет chat_id после парсинга");
    return;
  }

  for (const chatId of ids) {
    try {
      console.log("[FREULY][TG] sending to:", chatId);
      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.log("[FREULY][TG][ERROR_RESPONSE]", data);
      } else {
        console.log("[FREULY][TG][SUCCESS]", chatId);
      }
    } catch (err) {
      console.log("[FREULY][TG][EXCEPTION]", err);
    }
  }
}
