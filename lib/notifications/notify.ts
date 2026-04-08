import { sendTelegramToOwners } from "@/lib/telegram/sendMessage";

export type NotifyEventType = "NEW_SPECIALIST" | "NEW_LEAD" | "SYSTEM_ERROR";

export async function notify(
  eventType: "NEW_SPECIALIST",
  payload: { name: string }
): Promise<void>;
export async function notify(
  eventType: "NEW_LEAD",
  payload: { service: string }
): Promise<void>;
export async function notify(
  eventType: "SYSTEM_ERROR",
  payload: { route: string }
): Promise<void>;
export async function notify(
  eventType: NotifyEventType,
  payload: { name: string } | { service: string } | { route: string }
): Promise<void> {
  let message: string;
  if (eventType === "NEW_SPECIALIST") {
    message = `Новый специалист:\n${(payload as { name: string }).name}`;
  } else if (eventType === "NEW_LEAD") {
    message = `Новая заявка:\n${(payload as { service: string }).service}`;
  } else {
    message = `Ошибка:\n${(payload as { route: string }).route}`;
  }
  await sendTelegramToOwners(message);
}
