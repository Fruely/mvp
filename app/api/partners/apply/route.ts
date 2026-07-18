import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  getClientIP,
  hashEmailForRateLimit,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";
import { createApplication } from "@/lib/partners/applications";
import { PartnerDomainError } from "@/lib/partners/errors";
import { sendTelegramToOwners } from "@/lib/telegram/sendMessage";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    const email =
      typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email.trim().toLowerCase()
        : "";

    const ip = getClientIP(request);
    const ipLimit = await checkRateLimit(request, {
      namespace: "partner_apply:ip",
      identifier: ip,
      limit: 8,
      windowSeconds: 3600,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": String(ipLimit.retryAfterSec ?? 60) },
        }
      );
    }

    if (email) {
      const emailLimit = await checkRateLimit(request, {
        namespace: "partner_apply:email",
        identifier: hashEmailForRateLimit(email),
        limit: 3,
        windowSeconds: 86400,
      });
      if (!emailLimit.allowed) {
        return NextResponse.json(
          { error: RATE_LIMIT_PUBLIC_MESSAGE },
          {
            status: 429,
            headers: { ...NO_STORE, "Retry-After": String(emailLimit.retryAfterSec ?? 60) },
          }
        );
      }
    }

    const supabase = createSupabaseServerClient();
    const b = body as Record<string, unknown>;
    const result = await createApplication(supabase, {
      name: typeof b.name === "string" ? b.name : "",
      email: typeof b.email === "string" ? b.email : "",
      channel_name: typeof b.channel_name === "string" ? b.channel_name : "",
      channel_url: typeof b.channel_url === "string" ? b.channel_url : "",
      extra_links: b.extra_links,
      platform: typeof b.platform === "string" ? b.platform : null,
      topic: typeof b.topic === "string" ? b.topic : null,
      audience_lang: typeof b.audience_lang === "string" ? b.audience_lang : null,
      audience_geo: typeof b.audience_geo === "string" ? b.audience_geo : null,
      subscribers_approx:
        typeof b.subscribers_approx === "string" ? b.subscribers_approx : null,
      reach_approx: typeof b.reach_approx === "string" ? b.reach_approx : null,
      comment: typeof b.comment === "string" ? b.comment : null,
      privacy_accepted: b.privacy_accepted === true,
    });

    // Best-effort owner alert — no secrets
    void sendTelegramToOwners(
      `Новая заявка в Partner Program\nID: ${result.id}\nКанал: ${String(b.channel_name ?? "").slice(0, 80)}`
    ).catch(() => undefined);

    return NextResponse.json(
      { ok: true, id: result.id },
      { status: 201, headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partners/apply]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
