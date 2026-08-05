import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";
import { notify } from "@/lib/notifications/notify";
import { sendTelegramMessage } from "@/lib/telegram/sendMessage";
import { specialistDashboardPath } from "@/lib/specialists/navigation";
import { SPECIALIST_LEAD_TELEGRAM_TEXT } from "@/lib/leads/contactUnlock";

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
      referrer,
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

    const ip = getClientIP(request);

    const perSpecialist = await checkRateLimit(request, {
      namespace: "lead:specialist",
      identifier: `${ip}:${specialist_id}`,
      limit: 5,
      windowSeconds: 600,
    });
    if (!perSpecialist.allowed) {
      return Response.json(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: {
            "Retry-After": String(perSpecialist.retryAfterSec ?? 60),
          },
        }
      );
    }

    const perIp = await checkRateLimit(request, {
      namespace: "lead:ip",
      identifier: ip,
      limit: 30,
      windowSeconds: 3600,
    });
    if (!perIp.allowed) {
      return Response.json(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: {
            "Retry-After": String(perIp.retryAfterSec ?? 60),
          },
        }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("id, telegram_chat_id, name, category_id")
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

    const specRow = specialist as {
      id: string;
      telegram_chat_id: unknown;
      name: string | null;
      category_id: string | null;
    };

    let category_title: string | null = null;
    if (specRow.category_id) {
      const { data: catRow } = await supabase
        .from("categories")
        .select("title")
        .eq("id", specRow.category_id)
        .maybeSingle();
      const title = (catRow as { title?: string | null } | null)?.title;
      if (typeof title === "string" && title.trim()) {
        category_title = title.trim();
      }
    }

    const insertPayload = {
      specialist_id,
      client_name: client_name || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      message: message || null,
      source:
        typeof source === "string" && source.trim() ? source.trim() : null,
      source_path:
        typeof source_path === "string" && source_path.trim()
          ? source_path.trim()
          : null,
      referrer:
        typeof referrer === "string" && referrer.trim()
          ? referrer.trim()
          : null,
    };

    if (source || source_path || referrer) {
      console.info("[leads/create] lead source", {
        specialist_id,
        source: typeof source === "string" ? source : "unknown",
        source_path: typeof source_path === "string" ? source_path : "unknown",
        referrer: typeof referrer === "string" ? referrer : "unknown",
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

    const specialistName =
      typeof specRow.name === "string" && specRow.name.trim()
        ? specRow.name.trim()
        : null;

    await notify("NEW_LEAD", {
      lead_id: String(data.id),
      specialist_name: specialistName,
      category_title,
      source:
        typeof source === "string" && source.trim()
          ? source.trim()
          : null,
      source_path:
        typeof source_path === "string" && source_path.trim()
          ? source_path.trim()
          : null,
      referrer:
        typeof referrer === "string" && referrer.trim()
          ? referrer.trim()
          : null,
    });

    const tgRaw = specRow.telegram_chat_id;
    if (
      tgRaw != null &&
      (typeof tgRaw === "string" || typeof tgRaw === "number")
    ) {
      const appUrl = process.env.APP_URL || "https://freuly.de";
      const ok = await sendTelegramMessage(
        tgRaw,
        SPECIALIST_LEAD_TELEGRAM_TEXT,
        `${appUrl}${specialistDashboardPath("leads")}`,
      );
      if (!ok) {
        console.error("[leads/create] Telegram notification failed");
      }
    }

    return Response.json(
      { data: { id: String(data.id), created_at: data.created_at ?? null } },
      { status: 200 },
    );
  } catch (err: any) {
    await notify("SYSTEM_ERROR", { route: "/api/leads/create", error: err });
    return Response.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
