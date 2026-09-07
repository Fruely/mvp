import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getClientIP,
  hashEmailForRateLimit,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = "freuly.de@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonNoStore({ error: "invalid_json" }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const website = text(input.website, 200);
    if (website) {
      return jsonNoStore({ ok: true }, { status: 200 });
    }

    const name = text(input.name, 100);
    const email = text(input.email, 254).toLowerCase();
    const subject = text(input.subject, 140);
    const message = text(input.message, 5000);
    const lang = text(input.lang, 2);

    if (!name || !EMAIL_RE.test(email) || !subject || message.length < 10) {
      return jsonNoStore({ error: "invalid_fields" }, { status: 400 });
    }

    const ipLimit = await checkRateLimit(request, {
      namespace: "support_contact:ip",
      identifier: getClientIP(request),
      limit: 5,
      windowSeconds: 3600,
    });
    if (!ipLimit.allowed) {
      return jsonNoStore(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec ?? 60) },
        }
      );
    }

    const emailLimit = await checkRateLimit(request, {
      namespace: "support_contact:email",
      identifier: hashEmailForRateLimit(email),
      limit: 3,
      windowSeconds: 86400,
    });
    if (!emailLimit.allowed) {
      return jsonNoStore(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSec ?? 60) },
        }
      );
    }

    if (!isEmailConfigured()) {
      console.error("[api/support/contact] email is not configured");
      return jsonNoStore({ error: "service_unavailable" }, { status: 503 });
    }

    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Freuly contact] ${subject}`,
      html: `
        <h2>Новое обращение через страницу контактов</h2>
        <p><strong>Имя:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p><strong>Язык:</strong> ${escapeHtml(lang || "unknown")}</p>
        <p><strong>Тема:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Сообщение:</strong></p>
        <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
      `,
    });

    return jsonNoStore({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[api/support/contact]", error);
    return jsonNoStore({ error: "internal_error" }, { status: 500 });
  }
}
