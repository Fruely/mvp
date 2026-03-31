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
