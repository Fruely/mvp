import type { SupabaseClient } from "@supabase/supabase-js";
import { channelDedupeKey, planExternalChannels } from "@/lib/inbox/policy";
import { isEmailConfigured } from "@/lib/email";
import {
  CLIENT_SELECTION_POLICY,
  clientReminderDue,
  clientReminderKey,
  connectionInboxKey,
  interestDigestKey,
  interestInboxKey,
  nextDigestGeneration,
  selectedSpecialistInboxKey,
} from "./policy";

export type ClientEventName = "specialist_interested" | "connection_ready" | "client_reminder" | "client_selected_you";

export type ClientEventPayload = {
  event: ClientEventName;
  service_request_id: string;
  public_id: string;
  service_label: string;
  match_id: string | null;
  specialist_id: string | null;
  conversation_id: string | null;
};

export function safeClientPayload(input: ClientEventPayload): ClientEventPayload {
  return {
    event: input.event,
    service_request_id: input.service_request_id,
    public_id: input.public_id,
    service_label: input.service_label,
    match_id: input.match_id,
    specialist_id: input.specialist_id,
    conversation_id: input.conversation_id,
  };
}

async function insertClientInbox(
  supabase: SupabaseClient,
  input: {
    dedupeKey: string;
    type: ClientEventName;
    recipientUserId: string | null;
    requestId: string;
    entityId: string;
    payload: ClientEventPayload;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("inbox_items")
    .upsert(
      {
        recipient_user_id: input.recipientUserId,
        service_request_id: input.requestId,
        type: input.type,
        actor_type: "system",
        entity_type: input.type === "client_selected_you" ? "service_request_match" : "service_request",
        entity_id: input.entityId,
        dedupe_key: input.dedupeKey,
        payload: safeClientPayload(input.payload),
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return String(data.id);
  const existing = await supabase.from("inbox_items").select("id").eq("dedupe_key", input.dedupeKey).maybeSingle();
  return existing.data?.id ? String(existing.data.id) : null;
}

async function scheduleChannels(
  supabase: SupabaseClient,
  input: {
    inboxItemId: string;
    dedupeKey: string;
    requestId: string;
    matchId: string | null;
    recipientUserId: string | null;
    email: string | null;
    telegram: boolean;
    dueAt: string;
  },
): Promise<void> {
  const channels = planExternalChannels({
    hasTelegram: input.telegram,
    hasEmail: Boolean(input.email),
    emailConfigured: Boolean(input.email) && isEmailConfigured(),
    pushConfigured: false,
  });
  for (const channel of channels) {
    const { error } = await supabase.from("notification_outbox").upsert(
      {
        inbox_item_id: input.inboxItemId,
        match_id: input.matchId,
        recipient_user_id: input.recipientUserId,
        channel: channel.channel,
        dedupe_key: channelDedupeKey(input.dedupeKey, channel.channel),
        status: channel.status,
        next_attempt_at: input.dueAt,
        last_error_code: channel.errorCode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}

export async function recordSpecialistInterest(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string; requestId: string },
): Promise<void> {
  const request = await supabase
    .from("service_requests")
    .select("id, public_id, client_user_id, locale, requested_service, category_text, client_email, first_specialist_response_at")
    .eq("id", input.requestId)
    .maybeSingle();
  if (request.error || !request.data?.id) return;
  const now = new Date().toISOString();
  if (!request.data.first_specialist_response_at) {
    await supabase
      .from("service_requests")
      .update({ first_specialist_response_at: now })
      .eq("id", input.requestId)
      .is("first_specialist_response_at", null);
  }
  const payload = safeClientPayload({
    event: "specialist_interested",
    service_request_id: input.requestId,
    public_id: String(request.data.public_id ?? ""),
    service_label:
      (typeof request.data.requested_service === "string" && request.data.requested_service) ||
      (typeof request.data.category_text === "string" && request.data.category_text) ||
      "",
    match_id: input.matchId,
    specialist_id: input.specialistId,
    conversation_id: null,
  });
  const inboxId = await insertClientInbox(supabase, {
    dedupeKey: interestInboxKey(input.matchId),
    type: "specialist_interested",
    recipientUserId: typeof request.data.client_user_id === "string" ? request.data.client_user_id : null,
    requestId: input.requestId,
    entityId: input.requestId,
    payload,
  });
  if (!inboxId) return;

  const digestRows = await supabase
    .from("notification_outbox")
    .select("id, dedupe_key, status")
    .like("dedupe_key", `request:${input.requestId}:interest_digest:%`);
  const rows = digestRows.data ?? [];
  const pendingDigest = rows.some((row) => row.status === "pending" || row.status === "retryable" || row.status === "processing");
  const sentCount = rows.filter((row) => String(row.dedupe_key).endsWith(":email") && row.status === "sent").length;
  const generation = nextDigestGeneration({ pending: pendingDigest, sentCount });
  if (generation === null) return;
  const dueAt = new Date(Date.now() + CLIENT_SELECTION_POLICY.interestDigestDelayMs).toISOString();
  await scheduleChannels(supabase, {
    inboxItemId: inboxId,
    dedupeKey: interestDigestKey(input.requestId, generation),
    requestId: input.requestId,
    matchId: null,
    recipientUserId: typeof request.data.client_user_id === "string" ? request.data.client_user_id : null,
    email: typeof request.data.client_email === "string" ? request.data.client_email : null,
    telegram: false,
    dueAt,
  });
}

export async function recordSelectionNotices(
  supabase: SupabaseClient,
  input: {
    requestId: string;
    publicId: string;
    matchId: string;
    specialistId: string;
    specialistUserId: string | null;
    clientUserId: string | null;
    clientEmail: string | null;
    serviceLabel: string;
    conversationId: string;
  },
): Promise<void> {
  const clientPayload = safeClientPayload({
    event: "connection_ready",
    service_request_id: input.requestId,
    public_id: input.publicId,
    service_label: input.serviceLabel,
    match_id: input.matchId,
    specialist_id: input.specialistId,
    conversation_id: input.conversationId,
  });
  const clientInbox = await insertClientInbox(supabase, {
    dedupeKey: connectionInboxKey(input.requestId),
    type: "connection_ready",
    recipientUserId: input.clientUserId,
    requestId: input.requestId,
    entityId: input.requestId,
    payload: clientPayload,
  });
  if (clientInbox) {
    await scheduleChannels(supabase, {
      inboxItemId: clientInbox,
      dedupeKey: connectionInboxKey(input.requestId),
      requestId: input.requestId,
      matchId: input.matchId,
      recipientUserId: input.clientUserId,
      email: input.clientEmail,
      telegram: false,
      dueAt: new Date().toISOString(),
    });
  }
  if (!input.specialistUserId) return;
  const specialistPayload = safeClientPayload({
    event: "client_selected_you",
    service_request_id: input.requestId,
    public_id: input.publicId,
    service_label: input.serviceLabel,
    match_id: input.matchId,
    specialist_id: input.specialistId,
    conversation_id: input.conversationId,
  });
  const specialistInbox = await insertClientInbox(supabase, {
    dedupeKey: selectedSpecialistInboxKey(input.matchId),
    type: "client_selected_you",
    recipientUserId: input.specialistUserId,
    requestId: input.requestId,
    entityId: input.matchId,
    payload: specialistPayload,
  });
  if (!specialistInbox) return;
  const profile = await supabase
    .from("specialists")
    .select("email, telegram_chat_id")
    .eq("id", input.specialistId)
    .maybeSingle();
  await scheduleChannels(supabase, {
    inboxItemId: specialistInbox,
    dedupeKey: selectedSpecialistInboxKey(input.matchId),
    requestId: input.requestId,
    matchId: input.matchId,
    recipientUserId: input.specialistUserId,
    email: typeof profile.data?.email === "string" ? profile.data.email : null,
    telegram: Boolean(profile.data?.telegram_chat_id),
    dueAt: new Date().toISOString(),
  });
}

export async function scheduleClientReminders(supabase: SupabaseClient, now = new Date()): Promise<{ scheduled: number }> {
  const cutoff = new Date(now.getTime() - CLIENT_SELECTION_POLICY.clientReminderMs).toISOString();
  const { data, error } = await supabase
    .from("service_requests")
    .select("id, public_id, client_user_id, client_email, locale, requested_service, category_text, first_specialist_response_at, selected_at")
    .is("selected_at", null)
    .lte("first_specialist_response_at", cutoff)
    .limit(20);
  if (error) throw error;
  let scheduled = 0;
  for (const row of data ?? []) {
    const key = clientReminderKey(String(row.id));
    const existing = await supabase.from("inbox_items").select("id").eq("dedupe_key", key).maybeSingle();
    if (!clientReminderDue({
      firstResponseAt: row.first_specialist_response_at ? new Date(String(row.first_specialist_response_at)) : null,
      selectedAt: row.selected_at ? new Date(String(row.selected_at)) : null,
      alreadySent: Boolean(existing.data?.id),
      now,
    })) continue;
    const inboxId = await insertClientInbox(supabase, {
      dedupeKey: key,
      type: "client_reminder",
      recipientUserId: typeof row.client_user_id === "string" ? row.client_user_id : null,
      requestId: String(row.id),
      entityId: String(row.id),
      payload: safeClientPayload({
        event: "client_reminder",
        service_request_id: String(row.id),
        public_id: String(row.public_id ?? ""),
        service_label:
          (typeof row.requested_service === "string" && row.requested_service) ||
          (typeof row.category_text === "string" && row.category_text) ||
          "",
        match_id: null,
        specialist_id: null,
        conversation_id: null,
      }),
    });
    if (!inboxId) continue;
    await scheduleChannels(supabase, {
      inboxItemId: inboxId,
      dedupeKey: key,
      requestId: String(row.id),
      matchId: null,
      recipientUserId: typeof row.client_user_id === "string" ? row.client_user_id : null,
      email: typeof row.client_email === "string" ? row.client_email : null,
      telegram: false,
      dueAt: now.toISOString(),
    });
    scheduled += 1;
  }
  return { scheduled };
}
