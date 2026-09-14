import { sendTelegramToOwners } from "@/lib/telegram/sendMessage";

export const FUNNEL_OWNER_NOTIFICATION_EVENTS = [
  "registered",
  "profile_started",
  "checkout_started",
  "paid",
] as const;

export type FunnelOwnerNotificationEvent =
  (typeof FUNNEL_OWNER_NOTIFICATION_EVENTS)[number];

const EVENT_LABELS: Record<FunnelOwnerNotificationEvent, string> = {
  registered: "🔵 Зарегистрировался",
  profile_started: "📝 Начал заполнять профиль",
  checkout_started: "🟠 Перешёл к оплате",
  paid: "✅ Оплатил тариф",
};

export function isFunnelOwnerNotificationEvent(
  value: string,
): value is FunnelOwnerNotificationEvent {
  return (FUNNEL_OWNER_NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

export function formatSpecialistFunnelOwnerMessage(input: {
  eventType: FunnelOwnerNotificationEvent;
  specialistId: string;
  specialistName?: string | null;
  occurredAt?: string | null;
}): string {
  const name = input.specialistName?.trim() || "Без имени";
  const lines = [
    `${EVENT_LABELS[input.eventType]}: ${name}`,
    `Specialist ID: ${input.specialistId}`,
  ];

  if (input.occurredAt) {
    lines.push(`Событие: ${input.occurredAt}`);
  }

  lines.push("Admin: /admin");
  return lines.join("\n");
}

export async function sendSpecialistFunnelOwnerMessage(input: {
  eventType: FunnelOwnerNotificationEvent;
  specialistId: string;
  specialistName?: string | null;
  occurredAt?: string | null;
}): Promise<void> {
  await sendTelegramToOwners(formatSpecialistFunnelOwnerMessage(input));
}
