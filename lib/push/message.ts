import { notificationLocale } from "@/lib/inbox/policy";
import { renderMatchNotice } from "@/lib/inbox/render";
import { matchDeepLink } from "@/lib/inbox/policy";
import { clientRequestPath, conversationPath } from "@/lib/selection/policy";
import { renderClientEvent } from "@/lib/selection/render";
import { pushPriority } from "./policy";

export type LockScreenPush = {
  title: string;
  body: string;
  eventType: string;
  entityId: string;
  deepLink: string;
  locale: string;
  badge: number | null;
  priority: "normal" | "high";
};

const PRIVATE = ["client_email", "client_phone", "telegram_chat_id", "access_token", "token="];

export function httpsDeepLink(origin: string, path: string): string {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${base}/`);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function pushPathForEvent(input: {
  locale: string;
  eventType: string;
  matchId?: string | null;
  publicId?: string | null;
  conversationId?: string | null;
}): string {
  const locale = notificationLocale(input.locale);
  if (input.eventType === "client_selected_you" && input.conversationId) {
    return conversationPath(locale, input.conversationId, "specialist");
  }
  if (input.eventType === "connection_ready" && input.publicId) {
    return conversationPath(locale, input.conversationId ?? "", "client", input.publicId);
  }
  if ((input.eventType === "specialist_interested" || input.eventType === "client_reminder") && input.publicId) {
    return clientRequestPath(locale, input.publicId);
  }
  if (input.matchId) return matchDeepLink(locale, input.matchId);
  return `/${locale}/specialist/dashboard/inbox`;
}

export function buildLockScreenPush(input: {
  locale: string;
  eventType: string;
  entityId: string;
  deepLink: string;
  badge?: number | null;
  serviceLabel?: string | null;
  stage?: "initial" | "reminder" | "final";
  opened?: boolean;
}): LockScreenPush {
  const locale = notificationLocale(input.locale);
  const clientEvent =
    input.eventType === "specialist_interested" ||
    input.eventType === "connection_ready" ||
    input.eventType === "client_reminder" ||
    input.eventType === "client_selected_you"
      ? input.eventType
      : null;
  const text = clientEvent
    ? renderClientEvent(locale, clientEvent, { serviceLabel: null, count: 1 })
    : renderMatchNotice(locale, {
        stage: input.stage === "final" || input.stage === "reminder" ? input.stage : "initial",
        opened: Boolean(input.opened),
        serviceLabel: "",
        workFormat: null,
        city: null,
        serviceLanguages: [],
      });
  return {
    title: "Freuly",
    body: text.title,
    eventType: input.eventType,
    entityId: input.entityId,
    deepLink: input.deepLink,
    locale,
    badge: typeof input.badge === "number" ? input.badge : null,
    priority: pushPriority(input.eventType),
  };
}

export function pushHasPrivateContent(message: LockScreenPush, secret: string | null = null): boolean {
  const serialized = JSON.stringify(message);
  if (secret && secret.length > 4 && serialized.includes(secret)) return true;
  return PRIVATE.some((marker) => serialized.includes(marker));
}
