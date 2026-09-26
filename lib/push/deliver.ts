import type { SupabaseClient } from "@supabase/supabase-js";
import { countUnreadInbox } from "@/lib/inbox/unread";
import { invalidatePushEndpoint } from "./endpoints";
import { buildLockScreenPush, httpsDeepLink } from "./message";
import { aggregatePushStatuses, notificationEventClass } from "./policy";
import { loadNotificationPreferences, preferenceAllows } from "./preferences";
import { pushLogRecord } from "./token";
import type { PushTransport } from "./transport";

export type PushFanoutEndpoint = {
  id: string;
  platform: string;
  provider: string;
  status: "sent" | "retryable" | "failed" | "skipped";
  errorCode: string | null;
  providerMessageId: string | null;
  invalidate: boolean;
  durationMs: number;
};

export async function deliverPushFanout(
  supabase: SupabaseClient,
  input: {
    userId: string | null;
    locale: string;
    eventType: string;
    entityId: string;
    deepLink: string;
    stage?: "initial" | "reminder" | "final";
    opened?: boolean;
    outboxId?: string | null;
    attempt?: number | null;
  },
  transport: PushTransport,
): Promise<{
  status: "sent" | "retryable" | "failed" | "skipped";
  errorCode: string | null;
  providerMessageId: string | null;
  endpoints: PushFanoutEndpoint[];
}> {
  if (!input.userId) {
    return { status: "skipped", errorCode: "push_unavailable", providerMessageId: null, endpoints: [] };
  }
  const prefs = await loadNotificationPreferences(supabase, input.userId);
  const eventClass = notificationEventClass(input.eventType);
  if (!preferenceAllows(prefs, "push", eventClass)) {
    return { status: "skipped", errorCode: "push_disabled", providerMessageId: null, endpoints: [] };
  }
  const rows = await supabase
    .from("push_endpoints")
    .select("id, token, platform, provider, enabled, invalidated_at, user_id")
    .eq("user_id", input.userId)
    .eq("enabled", true)
    .is("invalidated_at", null);
  const targets = (rows.data ?? []).filter(
    (row) =>
      String(row.user_id) === input.userId &&
      row.enabled !== false &&
      !row.invalidated_at &&
      (row.platform === "ios" || row.platform === "android") &&
      typeof row.token === "string" &&
      row.token.length > 0,
  );
  if (!targets.length) {
    return { status: "skipped", errorCode: "push_unavailable", providerMessageId: null, endpoints: [] };
  }
  const badge = await countUnreadInbox(supabase, input.userId);
  const message = buildLockScreenPush({
    locale: prefs.notificationLocale ?? input.locale,
    eventType: input.eventType,
    entityId: input.entityId,
    deepLink: httpsDeepLink(appOrigin(), input.deepLink.startsWith("http") ? new URL(input.deepLink).pathname : input.deepLink),
    badge,
    stage: input.stage,
    opened: input.opened,
  });
  const endpoints: PushFanoutEndpoint[] = [];
  for (const target of targets) {
    const started = Date.now();
    const result = await transport.deliver(message, {
      id: String(target.id),
      token: String(target.token),
      platform: target.platform,
      provider: "expo",
    });
    const durationMs = Date.now() - started;
    if (result.invalidate) await invalidatePushEndpoint(supabase, String(target.id), input.userId);
    endpoints.push({
      id: String(target.id),
      platform: String(target.platform),
      provider: "expo",
      status: result.status,
      errorCode: result.errorCode,
      providerMessageId: result.providerMessageId,
      invalidate: result.invalidate,
      durationMs,
    });
    console.info("[push] delivery", pushLogRecord({
      outboxId: input.outboxId,
      recipientUserId: input.userId,
      provider: "expo",
      platform: String(target.platform),
      endpointId: String(target.id),
      attempt: input.attempt,
      durationMs,
      outcome: result.status,
      errorCode: result.errorCode,
      token: String(target.token),
    }));
  }
  const status = aggregatePushStatuses(endpoints.map((endpoint) => endpoint.status));
  const firstError = endpoints.find((endpoint) => endpoint.errorCode)?.errorCode ?? null;
  const firstId = endpoints.find((endpoint) => endpoint.providerMessageId)?.providerMessageId ?? null;
  return {
    status,
    errorCode: status === "sent" ? null : firstError,
    providerMessageId: firstId,
    endpoints,
  };
}

function appOrigin(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://freuly.de";
}
