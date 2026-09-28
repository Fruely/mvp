import type { SupabaseClient } from "@supabase/supabase-js";

const LIST_LIMIT = 50;
const REQUEST_COLUMNS = "id, public_id, requested_service, category_text, status, client_budget_text, selected_specialist_id";
const MESSAGE_COLUMNS = "conversation_id, created_at, kind";

export type SpecialistConversationListItem = {
  conversation_id: string;
  service_request_id: string;
  public_id: string;
  service_label: string;
  request_status: string;
  conversation_created_at: string;
  latest_message_at: string | null;
  latest_message_kind: "system" | "text" | "audio" | null;
  client_budget_text: string | null;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function messageKind(value: unknown): SpecialistConversationListItem["latest_message_kind"] {
  if (value === "system" || value === "text" || value === "audio") return value;
  return null;
}

function activityAt(item: SpecialistConversationListItem): string {
  return item.latest_message_at ?? item.conversation_created_at;
}

export function specialistConversationHasPrivateContact(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return ["client_email", "client_phone", "client_name", "client_telegram"].some((marker) => serialized.includes(marker));
}

/** Conversations owned by this specialist. Active matches without a conversation are not included. */
export async function listOwnedSpecialistConversations(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<{ status: "ready"; items: SpecialistConversationListItem[] } | { status: "error" }> {
  if (!specialistId) return { status: "ready", items: [] };
  try {
    const conversations = await supabase
      .from("conversations")
      .select("id, service_request_id, specialist_id, created_at")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (conversations.error) return { status: "error" };
    const rows = conversations.data ?? [];
    if (!rows.length) return { status: "ready", items: [] };

    const requestIds = rows
      .map((row) => text(row.service_request_id))
      .filter((id): id is string => Boolean(id));
    const conversationIds = rows.map((row) => text(row.id)).filter((id): id is string => Boolean(id));
    const requests = await supabase.from("service_requests").select(REQUEST_COLUMNS).in("id", requestIds);
    if (requests.error) return { status: "error" };
    const messages = await supabase
      .from("conversation_messages")
      .select(MESSAGE_COLUMNS)
      .in("conversation_id", conversationIds);
    if (messages.error) return { status: "error" };

    const requestById = new Map((requests.data ?? []).map((row) => [String(row.id), row]));
    const latestByConversation = new Map<string, { at: string; kind: SpecialistConversationListItem["latest_message_kind"] }>();
    for (const message of messages.data ?? []) {
      const conversationId = text(message.conversation_id);
      const at = text(message.created_at);
      if (!conversationId || !at) continue;
      const current = latestByConversation.get(conversationId);
      if (!current || at > current.at) {
        latestByConversation.set(conversationId, { at, kind: messageKind(message.kind) });
      }
    }

    const items: SpecialistConversationListItem[] = [];
    for (const row of rows) {
      const conversationId = text(row.id);
      const requestId = text(row.service_request_id);
      const createdAt = text(row.created_at);
      if (!conversationId || !requestId || !createdAt) continue;
      if (text(row.specialist_id) !== specialistId) continue;
      const request = requestById.get(requestId);
      if (!request || text(request.selected_specialist_id) !== specialistId) continue;
      const latest = latestByConversation.get(conversationId) ?? null;
      items.push({
        conversation_id: conversationId,
        service_request_id: requestId,
        public_id: text(request.public_id) ?? "",
        service_label: text(request.requested_service) ?? text(request.category_text) ?? "",
        request_status: text(request.status) ?? "",
        conversation_created_at: createdAt,
        latest_message_at: latest?.at ?? null,
        latest_message_kind: latest?.kind ?? null,
        client_budget_text: text(request.client_budget_text),
      });
    }
    items.sort((left, right) => (activityAt(left) < activityAt(right) ? 1 : activityAt(left) > activityAt(right) ? -1 : 0));
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}
