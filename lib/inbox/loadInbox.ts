import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchInboxPayload } from "./payload";

export type InboxListItem = {
  id: string;
  type: string;
  createdAt: string;
  readAt: string | null;
  entityId: string;
  payload: (MatchInboxPayload & { event?: string; conversation_id?: string | null; public_id?: string }) | null;
};

export type InboxListModel =
  | { status: "ready"; items: InboxListItem[] }
  | { status: "empty" }
  | { status: "error" };

function asPayload(value: unknown): InboxListItem["payload"] {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.service_label !== "string" && typeof row.event !== "string") return null;
  return {
    match_id: typeof row.match_id === "string" ? row.match_id : "",
    event: typeof row.event === "string" ? row.event : undefined,
    conversation_id: typeof row.conversation_id === "string" ? row.conversation_id : null,
    public_id: typeof row.public_id === "string" ? row.public_id : undefined,
    service_request_id: typeof row.service_request_id === "string" ? row.service_request_id : "",
    stage: row.stage === "reminder" || row.stage === "final" ? row.stage : "initial",
    reminder_index: typeof row.reminder_index === "number" ? row.reminder_index : 0,
    service_label: typeof row.service_label === "string" ? row.service_label : "",
    work_format: typeof row.work_format === "string" ? row.work_format : null,
    city: typeof row.city === "string" ? row.city : null,
    service_languages: Array.isArray(row.service_languages)
      ? row.service_languages.filter((item): item is string => typeof item === "string")
      : [],
    opened: Boolean(row.opened),
  };
}

export async function loadInbox(supabase: SupabaseClient, userId: string): Promise<InboxListModel> {
  try {
    const { data, error } = await supabase
      .from("inbox_items")
      .select("id, type, payload, created_at, read_at, entity_id")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { status: "error" };
    if (!data?.length) return { status: "empty" };
    const items = data.map((row) => ({
      id: String(row.id),
      type: String(row.type),
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
      readAt: typeof row.read_at === "string" ? row.read_at : null,
      entityId: String(row.entity_id),
      payload: asPayload(row.payload),
    }));
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}
