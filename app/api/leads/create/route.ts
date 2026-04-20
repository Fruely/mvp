import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { consumeLeadRateLimit, getLeadRateLimitKey } from "@/lib/leads/rateLimit";
import { notify } from "@/lib/notifications/notify";
import { sendTelegramMessage } from "@/lib/telegram/sendMessage";
import { specialistDashboardPath } from "@/lib/specialists/navigation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      specialist_id,
      client_name,
      client_email,
      client_phone,
      message,
      source,
      source_path,
      hp,
    } = body;

    if (typeof hp === "string" && hp.trim().length > 0) {
      return Response.json({ error: "Spam rejected" }, { status: 400 });
    }

    if (!specialist_id || typeof specialist_id !== "string") {
      return Response.json(
        { error: "specialist_id is required" },
        { status: 400 }
      );
    }

    if (!client_name || typeof client_name !== "string" || !client_name.trim()) {
      return Response.json(
        { error: "client_name is required" },
        { status: 400 }
      );
    }

    if (!client_email || typeof client_email !== "string" || !client_email.trim()) {
      return Response.json(
        { error: "client_email is required" },
        { status: 400 }
      );
    }

    if (!client_phone || typeof client_phone !== "string" || !client_phone.trim()) {
      return Response.json(
        { error: "client_phone is required" },
        { status: 400 }
      );
    }

    if (typeof message === "string" && message.length > 3000) {
      return Response.json({ error: "message is too long" }, { status: 400 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const limit = consumeLeadRateLimit(getLeadRateLimitKey(ip, specialist_id));
    if (!limit.allowed) {
      return Response.json(
        { error: "Too many requests. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec ?? 60) },
        }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("id, telegram_chat_id")
      .eq("id", specialist_id)
      .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("is_active", true)
      .eq("is_visible", true)
      .maybeSingle();

    if (specialistError) {
      return Response.json(
        { error: "Failed to verify specialist" },
        { status: 500 }
      );
    }

    if (!specialist) {
      return Response.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    const insertPayload = {
      specialist_id,
      client_name: client_name || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      message: message || null,
    };

    if (source || source_path) {
      console.info("[leads/create] lead source", {
        specialist_id,
        source: typeof source === "string" ? source : "unknown",
        source_path: typeof source_path === "string" ? source_path : "unknown",
      });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    await notify("NEW_LEAD", {
      lead_id: String(data.id),
      client_name: client_name.trim(),
      client_phone: client_phone.trim(),
      client_email: client_email.trim(),
      message: typeof message === "string" ? message : null,
      source:
        typeof source === "string" && source.trim()
          ? source.trim()
          : null,
      source_path:
        typeof source_path === "string" && source_path.trim()
          ? source_path.trim()
          : null,
    });

    const tgChatId = specialist.telegram_chat_id;
    if (tgChatId != null) {
      const appUrl = process.env.APP_URL || "https://freuly.de";
      const text = `🔔 Новая заявка Freuly\n\nИмя: ${client_name || "—"}\nТелефон: ${client_phone || "—"}\nEmail: ${client_email || "—"}\n\nСообщение:\n${message || "—"}`;
      const ok = await sendTelegramMessage(
        tgChatId,
        text,
        `${appUrl}${specialistDashboardPath("leads")}`
      );
      if (!ok) {
        console.error("[leads/create] Telegram notification failed");
      }
    }

    return Response.json({ data }, { status: 200 });
  } catch (err: any) {
    await notify("SYSTEM_ERROR", { route: "/api/leads/create", error: err });
    return Response.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
