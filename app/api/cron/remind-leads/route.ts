import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, client_name, client_phone")
    .eq("status", "new")
    .lt("created_at", thirtyMinAgo)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[cron/remind-leads] query failed", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const checked = leads?.length ?? 0;
  let reminded = 0;

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  const appUrl = process.env.APP_URL || "https://freuly.com";

  if (tgToken && tgChatId && leads) {
    for (const lead of leads) {
      const text = `⏰ Напоминание Freuly\n\nУ вас есть непринятая заявка.\n\nИмя: ${lead.client_name || "—"}\nТелефон: ${lead.client_phone || "—"}\n\nОткройте кабинет:\n${appUrl}/ua/specialist/dashboard/leads`;
      try {
        const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChatId,
            text,
            reply_markup: {
              inline_keyboard: [
                [{ text: "Открыть заявку", url: `${appUrl}/ua/specialist/dashboard/leads` }],
              ],
            },
          }),
        });
        if (res.ok) reminded++;
      } catch (tgErr) {
        console.error("[cron/remind-leads] Telegram send failed", tgErr);
      }
    }
  }

  return NextResponse.json({ checked, reminded }, { status: 200 });
}
