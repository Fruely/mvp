/** Delivery timing lives here so the domain does not hard-code clock rules. */
export const DEFAULT_MATCH_DELIVERY_POLICY = {
  firstReminderMs: 20 * 60 * 1000,
  finalReminderMs: 60 * 60 * 1000,
  maxReminders: 2,
  quietStartHour: 22,
  quietEndHour: 8,
  maxDeliveryAttempts: 3,
  /** Used only when the specialist has no stored zone. Never the client's zone. */
  defaultTimeZone: "Europe/Berlin",
} as const;

export type MatchDeliveryPolicy = {
  firstReminderMs: number;
  finalReminderMs: number;
  maxReminders: number;
  quietStartHour: number;
  quietEndHour: number;
  maxDeliveryAttempts: number;
  defaultTimeZone: string;
};

export type MatchResponseStatus = "active" | "interested" | "declined" | "expired" | "selected" | "not_selected";

export function initialInboxKey(matchId: string): string {
  return `match:${matchId}:initial`;
}

export function reminderInboxKey(matchId: string, index: 1 | 2): string {
  return `match:${matchId}:reminder:${index}`;
}

export function channelDedupeKey(inboxKey: string, channel: string): string {
  return `${inboxKey}:${channel}`;
}

export function matchDeepLink(locale: string, matchId: string): string {
  const safeLocale = /^[a-z]{2,3}$/.test(locale) ? locale : "ru";
  return `/${safeLocale}/specialist/dashboard/requests/matched/${matchId}`;
}

/**
 * The first acknowledgement wins. A later opposite click does not overwrite it.
 * Repeating the same click is a no-op.
 */
export function applyMatchResponse(
  current: MatchResponseStatus,
  next: "interested" | "declined",
): { status: MatchResponseStatus; changed: boolean } {
  if (current === "interested" || current === "declined" || current === "expired" || current === "selected" || current === "not_selected") {
    return { status: current, changed: false };
  }
  return { status: next, changed: true };
}

export function dueReminderIndex(input: {
  matchedAt: Date;
  now: Date;
  sentReminders: number;
  responded: boolean;
  policy?: MatchDeliveryPolicy;
}): 1 | 2 | null {
  const policy = input.policy ?? DEFAULT_MATCH_DELIVERY_POLICY;
  if (input.responded) return null;
  if (input.sentReminders >= policy.maxReminders) return null;
  const elapsed = input.now.getTime() - input.matchedAt.getTime();
  if (input.sentReminders === 0 && elapsed >= policy.firstReminderMs) return 1;
  if (input.sentReminders === 1 && elapsed >= policy.finalReminderMs) return 2;
  return null;
}

function hourInTimeZone(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(hour);
}

export type ExternalDeliveryDecision =
  | { action: "deliver_now" }
  | { action: "defer_until"; until: string }
  | { action: "skip_channel"; reason: string };

/** Inbox is created immediately. This decision applies only to external transports. */
export function externalDeliveryDecision(
  now: Date,
  timeZone: string,
  policy: MatchDeliveryPolicy = DEFAULT_MATCH_DELIVERY_POLICY,
): ExternalDeliveryDecision {
  let hour = 12;
  try {
    hour = hourInTimeZone(now, timeZone);
  } catch {
    hour = hourInTimeZone(now, policy.defaultTimeZone);
  }
  const quiet =
    hour >= policy.quietStartHour || hour < policy.quietEndHour;
  if (!quiet) return { action: "deliver_now" };
  const until = new Date(now.getTime() + 60 * 60 * 1000);
  return { action: "defer_until", until: until.toISOString() };
}

export function nextAttemptStatus(input: {
  result: "sent" | "retryable" | "failed" | "skipped";
  attempt: number;
  policy?: MatchDeliveryPolicy;
}): "sent" | "retryable" | "failed" | "skipped" | "cancelled" {
  const policy = input.policy ?? DEFAULT_MATCH_DELIVERY_POLICY;
  if (input.result === "retryable" && input.attempt >= policy.maxDeliveryAttempts) return "failed";
  return input.result;
}

export type PlannedChannel = {
  channel: "push" | "telegram" | "email";
  status: "pending" | "skipped";
  errorCode: string | null;
};

/** Records which transports can be used. A missing channel is skipped, not a match failure. */
export function planExternalChannels(input: {
  hasTelegram: boolean;
  hasEmail: boolean;
  emailConfigured: boolean;
  pushConfigured: boolean;
}): PlannedChannel[] {
  return [
    {
      channel: "push",
      status: input.pushConfigured ? "pending" : "skipped",
      errorCode: input.pushConfigured ? null : "push_not_configured",
    },
    {
      channel: "telegram",
      status: input.hasTelegram ? "pending" : "skipped",
      errorCode: input.hasTelegram ? null : "telegram_unavailable",
    },
    {
      channel: "email",
      status: input.hasEmail && input.emailConfigured ? "pending" : "skipped",
      errorCode: input.hasEmail && input.emailConfigured ? null : "email_unavailable",
    },
  ];
}

/** First wave is push plus one external channel. A reminder can use the held channel. */
export function stageInitialChannels(channels: PlannedChannel[], stage: "initial" | "reminder" = "initial"): PlannedChannel[] {
  if (stage !== "initial") return channels;
  const push = channels.find((channel) => channel.channel === "push");
  const telegram = channels.find((channel) => channel.channel === "telegram");
  const email = channels.find((channel) => channel.channel === "email");
  if (push?.status !== "pending" || telegram?.status !== "pending" || email?.status !== "pending") return channels;
  return channels.map((channel) =>
    channel.channel === "email" ? { channel: "email", status: "skipped", errorCode: "escalation_held" } : channel,
  );
}

export function unsupportedChannelResult(): { status: "skipped"; errorCode: "channel_unsupported" } {
  return { status: "skipped", errorCode: "channel_unsupported" };
}

/** Recipient locale only. Client locale, source language and service languages are not inputs. */
export function notificationLocale(recipientLocale: string | null | undefined): string {
  const value = recipientLocale?.trim().toLowerCase().replace(/_/g, "-") ?? "";
  if (value === "ua" || value === "uk" || value === "uk-ua") return "ua";
  const primary = value.split("-")[0] ?? "";
  if (primary === "uk") return "ua";
  if (/^[a-z]{2,3}$/.test(primary)) return primary;
  return "ru";
}
