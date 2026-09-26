import type { SupabaseClient } from "@supabase/supabase-js";
import { CLIENT_SELECTION_POLICY } from "./policy";

export function normalizeMessageBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.trim();
  if (!body || body.length > CLIENT_SELECTION_POLICY.messageMaxLength) return null;
  return body;
}

export async function postConversationText(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    actor: "client" | "specialist";
    authorUserId: string | null;
    body: string;
  },
): Promise<{ id: string } | { error: "invalid" }> {
  const body = normalizeMessageBody(input.body);
  if (!body) return { error: "invalid" };
  const inserted = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: input.conversationId,
      kind: "text",
      actor_type: input.actor,
      author_user_id: input.authorUserId,
      body,
      payload: {},
    })
    .select("id")
    .maybeSingle();
  if (inserted.error || !inserted.data?.id) return { error: "invalid" };
  return { id: String(inserted.data.id) };
}
