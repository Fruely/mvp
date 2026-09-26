import type { SupabaseClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import type { MatchRequest } from "@/lib/matching/eligibility";
import { sendTelegramMessage } from "@/lib/telegram/sendMessage";
import { safeMatchPayload, type MatchInboxPayload } from "./payload";
import { deliverPush } from "./pushContract";
import {
  channelDedupeKey,
  matchDeepLink,
  DEFAULT_MATCH_DELIVERY_POLICY,
  dueReminderIndex,
  externalDeliveryDecision,
  initialInboxKey,
  nextAttemptStatus,
  notificationLocale,
  planExternalChannels,
  stageInitialChannels,
  reminderInboxKey,
  unsupportedChannelResult,
  type MatchDeliveryPolicy,
} from "./policy";
import { renderActions, renderMatchNotice } from "./render";
import { issueAccessToken } from "@/lib/selection/accessGrant";
import { clientRequestPath, conversationPath } from "@/lib/selection/policy";
import { clientEventPushContract } from "@/lib/selection/pushContract";
import { deliverPushFanout } from "@/lib/push/deliver";
import { applyTransportPreferences, eventClassEnabled, type PushEventClass } from "@/lib/push/policy";
import { loadNotificationPreferences } from "@/lib/push/preferences";
import { isRecipientPushReady } from "@/lib/push/readiness";
import { lookupRecipientTimeZone } from "@/lib/push/timeZone";
import { createExpoPushTransport, type PushTransport } from "@/lib/push/transport";

type TransportStatus = "sent" | "retryable" | "failed" | "skipped";

function appOrigin(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://freuly.de";
}

async function insertInbox(
  supabase: SupabaseClient,
  input: {
    recipientUserId: string;
    matchId: string;
    dedupeKey: string;
    type: "match_available" | "match_reminder";
    payload: MatchInboxPayload;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("inbox_items")
    .upsert(
      {
        recipient_user_id: input.recipientUserId,
        type: input.type,
        actor_type: "system",
        entity_type: "service_request_match",
        entity_id: input.matchId,
        dedupe_key: input.dedupeKey,
        payload: safeMatchPayload(input.payload),
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return String(data.id);
  const existing = await supabase
    .from("inbox_items")
    .select("id")
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle();
  return existing.data?.id ? String(existing.data.id) : null;
}

async function ensureOutbox(
  supabase: SupabaseClient,
  input: {
    inboxItemId: string;
    matchId: string;
    recipientUserId: string;
    inboxKey: string;
    telegramChatId: string | number | null;
    email: string | null;
    emailConfigured: boolean;
    policy?: MatchDeliveryPolicy;
    stage?: "initial" | "reminder";
    eventClass?: PushEventClass;
  },
): Promise<void> {
  const policy = input.policy ?? DEFAULT_MATCH_DELIVERY_POLICY;
  const zone = await lookupRecipientTimeZone(supabase, input.recipientUserId);
  const decision = externalDeliveryDecision(new Date(), zone, policy);
  const when = decision.action === "defer_until" ? decision.until : new Date().toISOString();
  const prefs = await loadNotificationPreferences(supabase, input.recipientUserId);
  const eventClass = input.eventClass ?? "match";
  const channels = stageInitialChannels(
    applyTransportPreferences(
      planExternalChannels({
        hasTelegram: Boolean(input.telegramChatId),
        hasEmail: Boolean(input.email),
        emailConfigured: input.emailConfigured,
        pushConfigured: await isRecipientPushReady(supabase, input.recipientUserId),
      }),
      {
        push: prefs.pushEnabled,
        email: prefs.emailEnabled,
        telegram: prefs.telegramEnabled,
        eventEnabled: eventClassEnabled(prefs, eventClass),
      },
    ),
    input.stage ?? "initial",
  );
  for (const channel of channels) {
    const { error } = await supabase.from("notification_outbox").upsert(
      {
        inbox_item_id: input.inboxItemId,
        match_id: input.matchId,
        recipient_user_id: input.recipientUserId,
        channel: channel.channel,
        dedupe_key: channelDedupeKey(input.inboxKey, channel.channel),
        status: channel.status,
        next_attempt_at: when,
        last_error_code: channel.errorCode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}

export async function enqueueMatchNotifications(
  supabase: SupabaseClient,
  request: MatchRequest & { serviceLabel?: string | null },
  options?: { policy?: MatchDeliveryPolicy; emailConfigured?: boolean },
): Promise<void> {
  const policy = options?.policy ?? DEFAULT_MATCH_DELIVERY_POLICY;
  const emailConfigured = options?.emailConfigured ?? isEmailConfigured();
  const { data: matches, error } = await supabase
    .from("service_request_matches")
    .select("id, specialist_id, status, opened_at")
    .eq("service_request_id", request.id);
  if (error) throw error;
  const rows = matches ?? [];
  if (!rows.length) return;

  const specialistIds = rows.map((row) => String(row.specialist_id));
  const [{ data: specialists }, { data: requestRow }] = await Promise.all([
    supabase.from("specialists").select("id, user_id, email, telegram_chat_id").in("id", specialistIds),
    supabase
      .from("service_requests")
      .select("requested_service, category_text, city, work_format, service_languages")
      .eq("id", request.id)
      .maybeSingle(),
  ]);
  const byId = new Map((specialists ?? []).map((row) => [String(row.id), row]));
  const serviceLabel =
    (typeof requestRow?.requested_service === "string" && requestRow.requested_service) ||
    (typeof requestRow?.category_text === "string" && requestRow.category_text) ||
    request.serviceLabel ||
    "Request";
  const languages = Array.isArray(requestRow?.service_languages)
    ? requestRow.service_languages.filter((item: unknown): item is string => typeof item === "string")
    : [...request.serviceLanguages];

  for (const match of rows) {
    const specialist = byId.get(String(match.specialist_id));
    const userId = typeof specialist?.user_id === "string" ? specialist.user_id : null;
    if (!userId) {
      console.info("[inbox] skipped", { matchId: String(match.id), outcome: "recipient_unavailable" });
      continue;
    }
    const payload = safeMatchPayload({
      match_id: String(match.id),
      service_request_id: request.id,
      stage: "initial",
      reminder_index: 0,
      service_label: serviceLabel,
      work_format: typeof requestRow?.work_format === "string" ? requestRow.work_format : request.workFormat,
      city: request.workFormat === "online" ? null : typeof requestRow?.city === "string" ? requestRow.city : request.city,
      service_languages: languages,
      opened: Boolean(match.opened_at),
    });
    const dedupeKey = initialInboxKey(String(match.id));
    const inboxId = await insertInbox(supabase, {
      recipientUserId: userId,
      matchId: String(match.id),
      dedupeKey,
      type: "match_available",
      payload,
    });
    if (!inboxId) continue;
    await supabase
      .from("service_request_matches")
      .update({ first_notified_at: new Date().toISOString() })
      .eq("id", match.id)
      .is("first_notified_at", null);
    await ensureOutbox(supabase, {
      inboxItemId: inboxId,
      matchId: String(match.id),
      recipientUserId: userId,
      inboxKey: dedupeKey,
      telegramChatId: specialist?.telegram_chat_id ?? null,
      email: typeof specialist?.email === "string" ? specialist.email : null,
      emailConfigured,
      policy,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Provider acceptance is `sent`. It is not proof that the specialist read the message. */
export function buildMatchEmail(input: { title: string; body: string; link: string; action: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: input.title,
    html: `<p>${escapeHtml(input.title)}</p><p>${escapeHtml(input.body)}</p><p><a href="${escapeHtml(input.link)}">${escapeHtml(input.action)}</a></p>`,
  };
}

export function buildTelegramNotice(title: string, body: string): string {
  return `${title}\n${body}`;
}

export type ChannelSendResult = {
  status: TransportStatus;
  providerMessageId: string | null;
  errorCode: string | null;
};

export type PreparedNotice = { title: string; body: string; link: string; action: string };

export type ChannelTransport = (input: {
  locale: string;
  payload: MatchInboxPayload;
  telegramChatId: string | number | null;
  email: string | null;
  link: string;
  prepared?: PreparedNotice | null;
}) => Promise<ChannelSendResult>;

export type DeliveryTransports = {
  push: ChannelTransport;
  telegram: ChannelTransport;
  email: ChannelTransport;
};

export const defaultDeliveryTransports: DeliveryTransports = {
  push: async () => {
    const skipped = deliverPush();
    return { status: skipped.status, providerMessageId: null, errorCode: skipped.errorCode };
  },
  telegram: async (input) => {
    if (!process.env.TELEGRAM_BOT_TOKEN || !input.telegramChatId) {
      return { status: "skipped", providerMessageId: null, errorCode: "telegram_unavailable" };
    }
    const text = input.prepared ?? renderMatchNotice(input.locale, {
      stage: input.payload.stage,
      opened: input.payload.opened,
      serviceLabel: input.payload.service_label,
      workFormat: input.payload.work_format,
      city: input.payload.city,
      serviceLanguages: input.payload.service_languages,
    });
    const actions = input.prepared ?? renderActions(input.locale);
    const ok = await sendTelegramMessage(
      input.telegramChatId,
      buildTelegramNotice(text.title, text.body),
      input.link,
      "action" in actions ? actions.action : actions.view,
    );
    return ok
      ? { status: "sent", providerMessageId: null, errorCode: null }
      : { status: "retryable", providerMessageId: null, errorCode: "telegram_failed" };
  },
  email: async (input) => {
    if (!input.email || !isEmailConfigured()) {
      return { status: "skipped", providerMessageId: null, errorCode: "email_unavailable" };
    }
    const text = input.prepared ?? renderMatchNotice(input.locale, {
      stage: input.payload.stage,
      opened: input.payload.opened,
      serviceLabel: input.payload.service_label,
      workFormat: input.payload.work_format,
      city: input.payload.city,
      serviceLanguages: input.payload.service_languages,
    });
    const actions = input.prepared ?? renderActions(input.locale);
    const message = buildMatchEmail({
      title: text.title,
      body: text.body,
      link: input.link,
      action: "action" in actions ? actions.action : actions.view,
    });
    try {
      const data = await sendEmail({ to: input.email, subject: message.subject, html: message.html });
      const id = data && typeof data === "object" && "id" in data ? String(data.id) : null;
      return { status: "sent", providerMessageId: id, errorCode: null };
    } catch {
      return { status: "retryable", providerMessageId: null, errorCode: "email_failed" };
    }
  },
};

async function sendChannel(
  channel: string,
  input: {
    locale: string;
    payload: MatchInboxPayload;
    telegramChatId: string | number | null;
    email: string | null;
    link: string;
    prepared?: PreparedNotice | null;
  },
  transports: DeliveryTransports,
): Promise<ChannelSendResult> {
  if (channel === "push" || channel === "telegram" || channel === "email") {
    return transports[channel](input);
  }
  const skipped = unsupportedChannelResult();
  return { status: skipped.status, providerMessageId: null, errorCode: skipped.errorCode };
}

export async function deliverPendingOutbox(
  supabase: SupabaseClient,
  policy: MatchDeliveryPolicy = DEFAULT_MATCH_DELIVERY_POLICY,
  transports: DeliveryTransports = defaultDeliveryTransports,
  clock: Date = new Date(),
  pushTransport: PushTransport = createExpoPushTransport(),
): Promise<{ processed: number }> {
  const now = clock.toISOString();
  const { data, error } = await supabase
    .from("notification_outbox")
    .select("id, inbox_item_id, channel, status, attempt_count, recipient_user_id, match_id")
    .in("status", ["pending", "retryable"])
    .lte("next_attempt_at", now)
    .limit(30);
  if (error) throw error;

  let processed = 0;
  for (const row of data ?? []) {
    const claim = await supabase
      .from("notification_outbox")
      .update({ status: "processing", updated_at: now })
      .eq("id", row.id)
      .in("status", ["pending", "retryable"])
      .select("id")
      .maybeSingle();
    if (claim.error || !claim.data?.id) continue;

    const quietZone = await lookupRecipientTimeZone(supabase, typeof row.recipient_user_id === "string" ? row.recipient_user_id : null);
    const quiet = externalDeliveryDecision(clock, quietZone, policy);
    if (quiet.action === "defer_until") {
      await supabase
        .from("notification_outbox")
        .update({ status: "pending", next_attempt_at: quiet.until, updated_at: now })
        .eq("id", row.id);
      continue;
    }

    const inbox = await supabase
      .from("inbox_items")
      .select("payload")
      .eq("id", row.inbox_item_id)
      .maybeSingle();
    const payload = inbox.data?.payload as (MatchInboxPayload & {
      event?: "specialist_interested" | "connection_ready" | "client_reminder" | "client_selected_you";
      service_request_id?: string;
      public_id?: string;
      service_label?: string;
      conversation_id?: string | null;
    }) | undefined;
    const clientEvent = payload?.event && payload.event !== "client_selected_you";
    const request = payload?.service_request_id
      ? await supabase
          .from("service_requests")
          .select("id, public_id, locale, client_user_id, client_email, requested_service, category_text")
          .eq("id", payload.service_request_id)
          .maybeSingle()
      : { data: null };
    const specialist = !clientEvent && row.match_id
      ? await supabase
          .from("service_request_matches")
          .select("specialist_id")
          .eq("id", row.match_id)
          .maybeSingle()
      : { data: null };
    const profile = !clientEvent && specialist.data?.specialist_id
      ? await supabase
          .from("specialists")
          .select("email, telegram_chat_id, notification_locale")
          .eq("id", specialist.data.specialist_id)
          .maybeSingle()
      : { data: null };

    const attempt = Number(row.attempt_count ?? 0) + 1;
    const recipientUserId = typeof row.recipient_user_id === "string" ? row.recipient_user_id : null;
    const prefs = await loadNotificationPreferences(supabase, recipientUserId);
    const accountLocale = clientEvent
      ? typeof request.data?.locale === "string"
        ? request.data.locale
        : null
      : typeof profile.data?.notification_locale === "string"
        ? profile.data.notification_locale
        : null;
    const locale = notificationLocale(prefs.notificationLocale ?? accountLocale);
    let prepared: PreparedNotice | null = null;
    let link = payload && "match_id" in payload && payload.match_id
      ? `${appOrigin()}${matchDeepLink(locale, payload.match_id)}`
      : appOrigin();
    if (payload?.event) {
      let count = 1;
      if (payload.event === "specialist_interested" && payload.service_request_id) {
        const interested = await supabase
          .from("service_request_matches")
          .select("id")
          .eq("service_request_id", payload.service_request_id)
          .eq("status", "interested");
        count = interested.data?.length ?? 1;
      }
      if (payload.event === "client_selected_you" && payload.conversation_id) {
        link = `${appOrigin()}${conversationPath(locale, payload.conversation_id, "specialist")}`;
      } else if (request.data?.public_id) {
        const publicId = String(request.data.public_id);
        link = `${appOrigin()}${clientRequestPath(locale, publicId)}`;
        if (!request.data.client_user_id && payload.service_request_id) {
          const token = await issueAccessToken(supabase, payload.service_request_id);
          if (token) link = `${appOrigin()}/${locale}/requests/access?token=${encodeURIComponent(token)}`;
        }
      }
      const contract = clientEventPushContract({
        locale,
        event: payload.event,
        entityId: payload.event === "client_selected_you" ? String(payload.match_id ?? payload.service_request_id ?? "") : String(payload.service_request_id ?? ""),
        link,
        count,
        serviceLabel: payload.service_label ?? null,
      });
      link = contract.link;
      prepared = { title: contract.title, body: contract.body, link: contract.link, action: contract.action };
    }
    const noticePayload: MatchInboxPayload = payload && payload.match_id && payload.stage
      ? payload
      : {
          match_id: payload?.match_id ?? "",
          service_request_id: payload?.service_request_id ?? "",
          stage: "initial",
          reminder_index: 0,
          service_label: payload?.service_label ?? "",
          work_format: null,
          city: null,
          service_languages: [],
          opened: false,
        };
    let result: ChannelSendResult;
    let pushEndpoints: Array<{ id: string; platform: string; provider: string; status: string; errorCode: string | null; providerMessageId: string | null }> = [];
    const eventType = payload?.event
      ? payload.event
      : noticePayload.stage === "initial"
        ? "match_available"
        : "match_reminder";
    try {
      if (String(row.channel) === "email" && !prefs.emailEnabled) {
        result = { status: "skipped", providerMessageId: null, errorCode: "email_disabled" };
      } else if (String(row.channel) === "telegram" && !prefs.telegramEnabled) {
        result = { status: "skipped", providerMessageId: null, errorCode: "telegram_disabled" };
      } else if (String(row.channel) === "push" && payload) {
        const fanout = await deliverPushFanout(supabase, {
          userId: recipientUserId,
          locale,
          eventType,
          entityId: payload.event === "client_selected_you"
            ? String(payload.match_id ?? payload.service_request_id ?? "")
            : String(payload.match_id || payload.service_request_id || ""),
          deepLink: link,
          stage: noticePayload.stage,
          opened: noticePayload.opened,
          outboxId: String(row.id),
          attempt,
        }, pushTransport);
        result = { status: fanout.status, providerMessageId: fanout.providerMessageId, errorCode: fanout.errorCode };
        pushEndpoints = fanout.endpoints;
      } else {
      result = payload
        ? await sendChannel(
            String(row.channel),
            {
              locale,
              payload: noticePayload,
              telegramChatId: clientEvent ? null : profile.data?.telegram_chat_id ?? null,
              email: clientEvent
                ? typeof request.data?.client_email === "string"
                  ? request.data.client_email
                  : null
                : typeof profile.data?.email === "string"
                  ? profile.data.email
                  : null,
              link,
              prepared,
            },
            transports,
          )
        : { status: "failed", providerMessageId: null, errorCode: "missing_payload" };
      }
    } catch {
      result = { status: "retryable", providerMessageId: null, errorCode: "transport_failed" };
    }
    const status = nextAttemptStatus({ result: result.status, attempt, policy });
    if (pushEndpoints.length > 0) {
      for (const endpoint of pushEndpoints) {
        await supabase.from("notification_delivery_attempts").insert({
          outbox_id: row.id,
          attempt,
          status: endpoint.status,
          provider_message_id: endpoint.providerMessageId,
          error_code: endpoint.errorCode,
          endpoint_id: endpoint.id,
          provider: endpoint.provider,
          platform: endpoint.platform,
        });
      }
    } else {
      await supabase.from("notification_delivery_attempts").insert({
        outbox_id: row.id,
        attempt,
        status,
        provider_message_id: result.providerMessageId,
        error_code: result.errorCode,
      });
    }
    const retryAt = new Date(Date.now() + attempt * 5 * 60 * 1000).toISOString();
    await supabase
      .from("notification_outbox")
      .update({
        status,
        attempt_count: attempt,
        last_error_code: result.errorCode,
        next_attempt_at: status === "retryable" ? retryAt : now,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    console.info("[inbox] delivery", {
      outboxId: String(row.id),
      matchId: row.match_id ? String(row.match_id) : null,
      channel: String(row.channel),
      attempt,
      outcome: status,
      errorCode: result.errorCode,
    });
    processed += 1;
  }
  return { processed };
}

export async function scheduleDueReminders(
  supabase: SupabaseClient,
  now = new Date(),
  policy: MatchDeliveryPolicy = DEFAULT_MATCH_DELIVERY_POLICY,
  emailConfigured = isEmailConfigured(),
): Promise<{ scheduled: number }> {
  const cutoff = new Date(now.getTime() - policy.firstReminderMs).toISOString();
  const { data: matches, error } = await supabase
    .from("service_request_matches")
    .select("id, specialist_id, service_request_id, status, matched_at, opened_at, responded_at")
    .eq("status", "active")
    .is("responded_at", null)
    .lte("matched_at", cutoff)
    .limit(30);
  if (error) throw error;

  let scheduled = 0;
  for (const match of matches ?? []) {
    const first = await supabase.from("inbox_items").select("id").eq("dedupe_key", reminderInboxKey(String(match.id), 1)).maybeSingle();
    const second = await supabase.from("inbox_items").select("id").eq("dedupe_key", reminderInboxKey(String(match.id), 2)).maybeSingle();
    const sentReminders = (first.data?.id ? 1 : 0) + (second.data?.id ? 1 : 0);
    const index = dueReminderIndex({
      matchedAt: new Date(String(match.matched_at)),
      now,
      sentReminders,
      responded: false,
      policy,
    });
    if (!index) continue;
    const specialist = await supabase
      .from("specialists")
      .select("user_id, email, telegram_chat_id")
      .eq("id", match.specialist_id)
      .maybeSingle();
    const userId = typeof specialist.data?.user_id === "string" ? specialist.data.user_id : null;
    if (!userId) continue;
    const request = await supabase
      .from("service_requests")
      .select("requested_service, category_text, city, work_format, service_languages")
      .eq("id", match.service_request_id)
      .maybeSingle();
    const stage = index === 2 ? "final" : "reminder";
    const payload = safeMatchPayload({
      match_id: String(match.id),
      service_request_id: String(match.service_request_id),
      stage,
      reminder_index: index,
      service_label:
        (typeof request.data?.requested_service === "string" && request.data.requested_service) ||
        (typeof request.data?.category_text === "string" && request.data.category_text) ||
        "Request",
      work_format: typeof request.data?.work_format === "string" ? request.data.work_format : null,
      city: request.data?.work_format === "online" ? null : typeof request.data?.city === "string" ? request.data.city : null,
      service_languages: Array.isArray(request.data?.service_languages)
        ? request.data.service_languages.filter((item: unknown): item is string => typeof item === "string")
        : [],
      opened: Boolean(match.opened_at),
    });
    const dedupeKey = reminderInboxKey(String(match.id), index);
    const inboxId = await insertInbox(supabase, {
      recipientUserId: userId,
      matchId: String(match.id),
      dedupeKey,
      type: "match_reminder",
      payload,
    });
    if (!inboxId) continue;
    await ensureOutbox(supabase, {
      inboxItemId: inboxId,
      matchId: String(match.id),
      recipientUserId: userId,
      inboxKey: dedupeKey,
      telegramChatId: specialist.data?.telegram_chat_id ?? null,
      email: typeof specialist.data?.email === "string" ? specialist.data.email : null,
      emailConfigured,
      policy,
      stage: "reminder",
      eventClass: "reminder",
    });
    scheduled += 1;
  }
  return { scheduled };
}
