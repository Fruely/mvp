import type { SupabaseClient } from "@supabase/supabase-js";
import { recordConversationMessage } from "./conversationNotice";
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
): Promise<{ id: string; outboxId: string | null } | { error: "invalid" }> {
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
  const id = String(inserted.data.id);
  const notice = await recordConversationMessage(supabase, {
    conversationId: input.conversationId,
    messageId: id,
    kind: "text",
    actor: input.actor,
    authorUserId: input.authorUserId,
  });
  return { id, outboxId: notice.outboxId };
}
