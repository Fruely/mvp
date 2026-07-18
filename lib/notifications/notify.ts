import { sendTelegramToOwners } from "@/lib/telegram/sendMessage";
import { buildNewSpecialistTelegramMessage } from "@/lib/notifications/specialistPublishNotify";

const errorCooldown = new Map<string, { last: number; count: number }>();

export type NotifyEventType = "NEW_SPECIALIST" | "NEW_LEAD" | "SYSTEM_ERROR";

export type NewSpecialistNotifyPayload = {
  name: string;
  details?: string | null;
};

/** Owner Telegram text for a new lead (from /api/leads/create). */
export type NewLeadOwnerPayload = {
  lead_id: string;
  specialist_name: string | null;
  category_title: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  message: string | null;
  source?: string | null;
  source_path?: string | null;
  referrer?: string | null;
};

function formatNewLeadOwnerMessage(p: NewLeadOwnerPayload): string {
  const lines: string[] = ["Новая заявка Freuly", "", `ID: ${p.lead_id}`];
  const specName = p.specialist_name?.trim();
  if (specName) lines.push(`Специалист: ${specName}`);
  const catTitle = p.category_title?.trim();
  if (catTitle) lines.push(`Категория: ${catTitle}`);
  lines.push("");
  const name = p.client_name?.trim();
  if (name) lines.push(`Имя: ${name}`);
  const phone = p.client_phone?.trim();
  if (phone) lines.push(`Телефон: ${phone}`);
  const email = p.client_email?.trim();
  if (email) lines.push(`Email: ${email}`);
  lines.push("");
  lines.push("Сообщение:");
  const msg = p.message?.trim();
  lines.push(msg ? msg : "—");
  const src = typeof p.source === "string" ? p.source.trim() : "";
  const path = typeof p.source_path === "string" ? p.source_path.trim() : "";
  const ref = typeof p.referrer === "string" ? p.referrer.trim() : "";
  if (src || path || ref) {
    lines.push("");
    if (src) lines.push(`Источник: ${src}`);
    if (path) lines.push(`Страница: ${path}`);
    if (ref) lines.push(`Реферер: ${ref}`);
  }
  return lines.join("\n");
}

function formatErrorForMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function notify(
  eventType: "NEW_SPECIALIST",
  payload: NewSpecialistNotifyPayload
): Promise<void>;
export async function notify(
  eventType: "NEW_LEAD",
  payload: NewLeadOwnerPayload
): Promise<void>;
export async function notify(
  eventType: "SYSTEM_ERROR",
  payload: { route: string; error?: unknown }
): Promise<void>;
export async function notify(
  eventType: NotifyEventType,
  payload:
    | NewSpecialistNotifyPayload
    | NewLeadOwnerPayload
    | { route: string; error?: unknown }
): Promise<void> {
  console.log("[FREULY][EVENT]", eventType);
  let message: string;
  if (eventType === "NEW_SPECIALIST") {
    const p = payload as NewSpecialistNotifyPayload;
    message = buildNewSpecialistTelegramMessage({
      name: p.name,
      details: p.details,
    });
  } else if (eventType === "NEW_LEAD") {
    message = formatNewLeadOwnerMessage(payload as NewLeadOwnerPayload);
  } else {
    const p = payload as { route: string; error?: unknown };
    const key = `${p.route}:${formatErrorForMessage(p.error)}`;
    const now = Date.now();
    const entry = errorCooldown.get(key);
    if (entry && now - entry.last < 5 * 60 * 1000) {
      entry.count += 1;
      return;
    }
    if (entry && entry.count >= 3) {
      message = `🚨 Ошибка повторяется\n\n${p.route}\nповторений: ${entry.count}`;
    } else {
      message = `Ошибка:\n${p.route}`;
      if (p.error !== undefined) {
        message += `\n${formatErrorForMessage(p.error)}`;
      }
    }
    await sendTelegramToOwners(message);
    const cutoff = now - 10 * 60 * 1000;
    errorCooldown.forEach((e, k) => {
      if (e.last < cutoff) {
        errorCooldown.delete(k);
      }
    });
    errorCooldown.set(key, {
      last: now,
      count: entry ? entry.count : 1,
    });
    return;
  }
  await sendTelegramToOwners(message);
}
