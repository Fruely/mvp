import type { SupabaseClient } from "@supabase/supabase-js";
import { notificationLocale } from "@/lib/inbox/policy";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  eventClassEnabled,
  isIanaTimeZone,
  type NotificationPreferences,
  type PushEventClass,
} from "./policy";

function fromRow(row: Record<string, unknown> | null): NotificationPreferences {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return {
    pushEnabled: row.push_enabled !== false,
    emailEnabled: row.email_enabled !== false,
    telegramEnabled: row.telegram_enabled !== false,
    matchNotifications: row.match_notifications !== false,
    selectionNotifications: row.selection_notifications !== false,
    reminderNotifications: row.reminder_notifications !== false,
    timeZone: isIanaTimeZone(row.time_zone) ? row.time_zone : null,
    notificationLocale: typeof row.notification_locale === "string" ? notificationLocale(row.notification_locale) : null,
    marketingConsent: false,
  };
}

export async function loadNotificationPreferences(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<NotificationPreferences> {
  if (!userId) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    const row = await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
    if (row.error || !row.data) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return fromRow(row.data);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export function preferenceAllows(
  prefs: NotificationPreferences,
  channel: "push" | "email" | "telegram",
  eventClass: PushEventClass,
): boolean {
  if (!eventClassEnabled(prefs, eventClass)) return false;
  if (channel === "push") return prefs.pushEnabled;
  if (channel === "email") return prefs.emailEnabled;
  return prefs.telegramEnabled;
}

export async function saveNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  input: Partial<NotificationPreferences> & { marketingConsent?: boolean },
): Promise<NotificationPreferences | { error: "invalid" }> {
  if (!userId) return { error: "invalid" };
  const current = await loadNotificationPreferences(supabase, userId);
  const next: NotificationPreferences = {
    pushEnabled: input.pushEnabled ?? current.pushEnabled,
    emailEnabled: input.emailEnabled ?? current.emailEnabled,
    telegramEnabled: input.telegramEnabled ?? current.telegramEnabled,
    matchNotifications: input.matchNotifications ?? current.matchNotifications,
    selectionNotifications: input.selectionNotifications ?? current.selectionNotifications,
    reminderNotifications: input.reminderNotifications ?? current.reminderNotifications,
    timeZone: input.timeZone === undefined ? current.timeZone : isIanaTimeZone(input.timeZone) ? input.timeZone : null,
    notificationLocale:
      input.notificationLocale === undefined
        ? current.notificationLocale
        : input.notificationLocale
          ? notificationLocale(input.notificationLocale)
          : null,
    marketingConsent: false,
  };
  const row = {
    user_id: userId,
    push_enabled: next.pushEnabled,
    email_enabled: next.emailEnabled,
    telegram_enabled: next.telegramEnabled,
    match_notifications: next.matchNotifications,
    selection_notifications: next.selectionNotifications,
    reminder_notifications: next.reminderNotifications,
    time_zone: next.timeZone,
    notification_locale: next.notificationLocale,
    marketing_consent: false,
    updated_at: new Date().toISOString(),
  };
  const saved = await supabase.from("notification_preferences").upsert(row, { onConflict: "user_id" }).select("*").maybeSingle();
  if (saved.error) return { error: "invalid" };
  return fromRow(saved.data ?? row);
}
