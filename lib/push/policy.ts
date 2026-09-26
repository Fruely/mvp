import { DEFAULT_MATCH_DELIVERY_POLICY, type PlannedChannel } from "@/lib/inbox/policy";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  pushEnabled: true,
  emailEnabled: true,
  telegramEnabled: true,
  matchNotifications: true,
  selectionNotifications: true,
  reminderNotifications: true,
  timeZone: null as string | null,
  notificationLocale: null as string | null,
  marketingConsent: false,
};

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;

export type PushEventClass = "match" | "selection" | "reminder";

export function notificationEventClass(eventType: string): PushEventClass {
  if (eventType === "match_reminder" || eventType === "client_reminder") return "reminder";
  if (
    eventType === "client_selected_you" ||
    eventType === "connection_ready" ||
    eventType === "specialist_interested"
  ) {
    return "selection";
  }
  return "match";
}

export function eventClassEnabled(prefs: NotificationPreferences, eventClass: PushEventClass): boolean {
  if (eventClass === "reminder") return prefs.reminderNotifications;
  if (eventClass === "selection") return prefs.selectionNotifications;
  return prefs.matchNotifications;
}

export function applyTransportPreferences(
  channels: PlannedChannel[],
  input: { push: boolean; email: boolean; telegram: boolean; eventEnabled: boolean },
): PlannedChannel[] {
  if (!input.eventEnabled) {
    return channels.map((channel) => ({
      channel: channel.channel,
      status: "skipped",
      errorCode: "event_disabled",
    }));
  }
  return channels.map((channel) => {
    if (channel.channel === "push" && !input.push) {
      return { channel: channel.channel, status: "skipped", errorCode: "push_disabled" };
    }
    if (channel.channel === "email" && !input.email) {
      return { channel: channel.channel, status: "skipped", errorCode: "email_disabled" };
    }
    if (channel.channel === "telegram" && !input.telegram) {
      return { channel: channel.channel, status: "skipped", errorCode: "telegram_disabled" };
    }
    return channel;
  });
}

export function isIanaTimeZone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const zone = value.trim();
  if (zone !== "UTC" && !/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveRecipientTimeZone(
  preferenceZone: unknown,
  endpointZone: unknown,
  fallback = DEFAULT_MATCH_DELIVERY_POLICY.defaultTimeZone,
): string {
  if (isIanaTimeZone(preferenceZone)) return preferenceZone;
  if (isIanaTimeZone(endpointZone)) return endpointZone;
  return fallback;
}

export function pushPriority(eventType: string): "normal" | "high" {
  if (
    eventType === "match_available" ||
    eventType === "client_selected_you" ||
    eventType === "connection_ready" ||
    eventType === "specialist_interested"
  ) {
    return "high";
  }
  return "normal";
}

export function aggregatePushStatuses(
  statuses: Array<"sent" | "retryable" | "failed" | "skipped">,
): "sent" | "retryable" | "failed" | "skipped" {
  if (statuses.length === 0) return "skipped";
  if (statuses.some((status) => status === "sent")) return "sent";
  if (statuses.some((status) => status === "retryable")) return "retryable";
  if (statuses.every((status) => status === "skipped")) return "skipped";
  return "failed";
}
