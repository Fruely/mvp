import type { SupabaseClient } from "@supabase/supabase-js";
import { channelDedupeKey } from "@/lib/inbox/policy";
import { loadNotificationPreferences, preferenceAllows } from "@/lib/push/preferences";
import { isRecipientPushReady } from "@/lib/push/readiness";

export type ConversationMessageKind = "text" | "audio" | "system";
export type ConversationMessageActor = "client" | "specialist" | "system";

export function conversationMessageInboxKey(conversationId: string, messageId: string): string {
  return `conversation:${conversationId}:message:${messageId}`;
}

/** User text and future audio share one event. System rows keep their own flows. */
export function shouldNotifyUserMessage(input: { kind: string; actor: string }): boolean {
  return (input.kind === "text" || input.kind === "audio") && (input.actor === "client" || input.actor === "specialist");
}

export function resolveConversationMessageRecipient(input: {
  actor: "client" | "specialist";
  authorUserId: string | null;
  conversationClientUserId: string | null;
  requestClientUserId: string | null;
  conversationSpecialistId: string;
  specialistId: string;
  specialistUserId: string | null;
}): { userId: string } | { error: "inconsistent" } {
  if (!input.conversationSpecialistId || input.conversationSpecialistId !== input.specialistId) {
    return { error: "inconsistent" };
  }
  if (input.conversationClientUserId !== input.requestClientUserId) return { error: "inconsistent" };
  if (input.actor === "specialist") {
    if (!input.authorUserId || !input.specialistUserId || input.authorUserId !== input.specialistUserId) {
      return { error: "inconsistent" };
    }
    if (!input.requestClientUserId || input.requestClientUserId === input.authorUserId) return { error: "inconsistent" };
    return { userId: input.requestClientUserId };
  }
  if (input.authorUserId !== input.conversationClientUserId) return { error: "inconsistent" };
  if (!input.specialistUserId || input.specialistUserId === input.authorUserId) return { error: "inconsistent" };
  return { userId: input.specialistUserId };
}

export function conversationMessagePayload(input: {
  conversationId: string;
  serviceRequestId: string;
  publicId: string;
}): {
  event: "conversation_message";
  conversation_id: string;
  service_request_id: string;
  public_id: string;
} {
  return {
    event: "conversation_message",
    conversation_id: input.conversationId,
    service_request_id: input.serviceRequestId,
    public_id: input.publicId,
  };
}

export async function recordConversationMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    messageId: string;
    kind: ConversationMessageKind;
    actor: ConversationMessageActor;
    authorUserId: string | null;
  },
): Promise<void> {
  if (!shouldNotifyUserMessage(input)) return;
  const actor = input.actor === "specialist" ? "specialist" : "client";
  const conversation = await supabase
    .from("conversations")
    .select("id, service_request_id, specialist_id, client_user_id")
    .eq("id", input.conversationId)
    .maybeSingle();
  if (conversation.error || !conversation.data?.id) return;
  const requestId = typeof conversation.data.service_request_id === "string" ? conversation.data.service_request_id : "";
  const specialistId = typeof conversation.data.specialist_id === "string" ? conversation.data.specialist_id : "";
  const request = await supabase
    .from("service_requests")
    .select("id, public_id, client_user_id")
    .eq("id", requestId)
    .maybeSingle();
  if (request.error || !request.data?.id) return;
  const specialist = await supabase
    .from("specialists")
    .select("id, user_id")
    .eq("id", specialistId)
    .maybeSingle();
  if (specialist.error || !specialist.data?.id) return;
  const recipient = resolveConversationMessageRecipient({
    actor,
    authorUserId: input.authorUserId,
    conversationClientUserId: typeof conversation.data.client_user_id === "string" ? conversation.data.client_user_id : null,
    requestClientUserId: typeof request.data.client_user_id === "string" ? request.data.client_user_id : null,
    conversationSpecialistId: specialistId,
    specialistId: String(specialist.data.id),
    specialistUserId: typeof specialist.data.user_id === "string" ? specialist.data.user_id : null,
  });
  if ("error" in recipient) return;

  const dedupeKey = conversationMessageInboxKey(input.conversationId, input.messageId);
  const payload = conversationMessagePayload({
    conversationId: input.conversationId,
    serviceRequestId: requestId,
    publicId: typeof request.data.public_id === "string" ? request.data.public_id : "",
  });
  const inserted = await supabase
    .from("inbox_items")
    .upsert(
      {
        recipient_user_id: recipient.userId,
        service_request_id: requestId,
        type: "conversation_message",
        actor_type: actor,
        entity_type: "conversation_message",
        entity_id: input.messageId,
        dedupe_key: dedupeKey,
        payload,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (inserted.error) throw inserted.error;
  const inboxId = inserted.data?.id
    ? String(inserted.data.id)
    : await supabase
        .from("inbox_items")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle()
        .then((row) => (row.data?.id ? String(row.data.id) : null));
  if (!inboxId) return;

  const prefs = await loadNotificationPreferences(supabase, recipient.userId);
  const allowed = preferenceAllows(prefs, "push", "message");
  const ready = allowed && (await isRecipientPushReady(supabase, recipient.userId));
  const { error } = await supabase.from("notification_outbox").upsert(
    {
      inbox_item_id: inboxId,
      match_id: null,
      recipient_user_id: recipient.userId,
      channel: "push",
      dedupe_key: channelDedupeKey(dedupeKey, "push"),
      status: ready ? "pending" : "skipped",
      next_attempt_at: new Date().toISOString(),
      last_error_code: ready ? null : allowed ? "push_not_configured" : "push_disabled",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );
  if (error) throw error;
}
