import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/sendMessage";
import { specialistDashboardPath } from "@/lib/specialists/navigation";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, client_name, client_phone, specialist_id")
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

  const appUrl = process.env.APP_URL || "https://freuly.de";
  const leadsUrl = `${appUrl}${specialistDashboardPath("leads")}`;

  const specialistIds = Array.from(
    new Set(
      (leads ?? [])
        .map((l) => l.specialist_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  let chatBySpecialistId = new Map<string, number | string | null>();
  if (specialistIds.length > 0) {
    const { data: specialists } = await supabase
      .from("specialists")
      .select("id, telegram_chat_id")
      .in("id", specialistIds);
    chatBySpecialistId = new Map(
      (specialists ?? []).map((s) => [s.id as string, s.telegram_chat_id])
    );
  }

  if (leads?.length) {
    for (const lead of leads) {
      const sid = typeof lead.specialist_id === "string" ? lead.specialist_id : null;
      const tgChatId = sid ? chatBySpecialistId.get(sid) : undefined;
      if (tgChatId == null) continue;

      const text = `⏰ Напоминание Freuly\n\nУ вас есть непринятая заявка.\n\nИмя: ${lead.client_name || "—"}\nТелефон: ${lead.client_phone || "—"}\n\nОткройте кабинет:\n${leadsUrl}`;
      const ok = await sendTelegramMessage(tgChatId, text, leadsUrl);
      if (ok) reminded++;
      else console.error("[cron/remind-leads] Telegram send failed");
    }
  }

  return NextResponse.json({ checked, reminded }, { status: 200 });
}
