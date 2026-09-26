import { notificationLocale } from "@/lib/inbox/policy";
import { renderClientEvent } from "./render";

export type ClientPushContract = {
  title: string;
  body: string;
  event: "specialist_interested" | "connection_ready" | "client_reminder" | "client_selected_you";
  entityId: string;
  link: string;
  locale: string;
  action: string;
};

export function clientEventPushContract(input: {
  locale: string;
  event: ClientPushContract["event"];
  entityId: string;
  link: string;
  count?: number;
  serviceLabel?: string | null;
}): ClientPushContract {
  const text = renderClientEvent(input.locale, input.event, {
    count: input.count,
    serviceLabel: input.serviceLabel,
  });
  return {
    title: text.title,
    body: text.body,
    event: input.event,
    entityId: input.entityId,
    link: input.link,
    locale: notificationLocale(input.locale),
    action: text.action,
  };
}

const PRIVATE_MARKERS = ["client_email", "client_phone", "telegram_chat_id", "notification_locale"];

export function pushContractHasPrivateContact(contract: ClientPushContract, secret: string | null = null): boolean {
  const serialized = JSON.stringify({
    title: contract.title,
    body: contract.body,
    event: contract.event,
    entityId: contract.entityId,
    link: contract.link,
    locale: contract.locale,
  });
  if (secret && secret.length > 3 && serialized.includes(secret)) return true;
  return PRIVATE_MARKERS.some((marker) => serialized.includes(marker));
}
