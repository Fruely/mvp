import { NextResponse, type NextRequest } from "next/server";
import { loadNotificationPreferences, saveNotificationPreferences } from "@/lib/push/preferences";
import { requirePushUser } from "@/lib/push/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function flag(body: Record<string, unknown>, key: string): boolean | undefined {
  return typeof body[key] === "boolean" ? body[key] : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await requirePushUser(request);
  if ("status" in auth) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const preferences = await loadNotificationPreferences(createSupabaseServerClient(), auth.userId);
  return NextResponse.json({ preferences }, { status: 200, headers: NO_STORE });
}

export async function PUT(request: NextRequest) {
  const auth = await requirePushUser(request);
  if ("status" in auth) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const saved = await saveNotificationPreferences(createSupabaseServerClient(), auth.userId, {
    pushEnabled: flag(record, "pushEnabled"),
    emailEnabled: flag(record, "emailEnabled"),
    telegramEnabled: flag(record, "telegramEnabled"),
    matchNotifications: flag(record, "matchNotifications"),
    selectionNotifications: flag(record, "selectionNotifications"),
    reminderNotifications: flag(record, "reminderNotifications"),
    timeZone: typeof record.timeZone === "string" ? record.timeZone : record.timeZone === null ? null : undefined,
    notificationLocale: typeof record.notificationLocale === "string" ? record.notificationLocale : record.notificationLocale === null ? null : undefined,
    marketingConsent: false,
  });
  if ("error" in saved) return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  return NextResponse.json({ preferences: saved }, { status: 200, headers: NO_STORE });
}
