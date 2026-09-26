import { matchDeepLink } from "./policy";
import { renderMatchNotice, type InboxNotice } from "./render";

/** Future APNs / FCM / Expo payload. Nothing here is sent in this phase. */
export type PushNotificationContract = {
  title: string;
  body: string;
  eventType: "match_available" | "match_reminder";
  matchId: string;
  deepLink: string;
  recipientUserId: string;
  locale: string;
};

export function buildPushContract(input: {
  locale: string;
  matchId: string;
  recipientUserId: string;
  notice: InboxNotice;
}): PushNotificationContract {
  const text = renderMatchNotice(input.locale, input.notice);
  return {
    title: text.title,
    body: text.body,
    eventType: input.notice.stage === "initial" ? "match_available" : "match_reminder",
    matchId: input.matchId,
    deepLink: matchDeepLink(input.locale, input.matchId),
    recipientUserId: input.recipientUserId,
    locale: input.locale,
  };
}

export function deliverPush(): { status: "skipped"; errorCode: "push_not_configured" } {
  return { status: "skipped", errorCode: "push_not_configured" };
}
