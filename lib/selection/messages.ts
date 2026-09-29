import type { SupabaseClient } from "@supabase/supabase-js";
import { recordConversationMessage } from "./conversationNotice";
import {
  parseConversationPost,
  uploadedAudioMatches,
  uploadedImageMatches,
  type ConversationWriteError,
  type LocationPoint,
} from "./conversationMedia";
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
      created_at: new Date().toISOString(),
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

async function postConversationAudio(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    actor: "client" | "specialist";
    authorUserId: string | null;
    raw: unknown;
  },
): Promise<{ id: string; outboxId: string | null } | { error: ConversationWriteError }> {
  if (!input.authorUserId) return { error: "invalid" };
  const parsed = parseConversationPost(input.conversationId, input.raw);
  if ("error" in parsed) return parsed;
  if (parsed.kind !== "audio") return { error: "invalid" };
  const existing = await supabase
    .from("conversation_message_attachments")
    .select("id")
    .eq("storage_path", parsed.audio.path)
    .maybeSingle();
  if (existing.data?.id) return { error: "wrong_conversation" };
  const uploaded = await uploadedAudioMatches(supabase, parsed.audio);
  if (!uploaded.ok) return { error: uploaded.error };
  const inserted = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: input.conversationId,
      kind: "audio",
      actor_type: input.actor,
      author_user_id: input.authorUserId,
      body: null,
      payload: {},
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (inserted.error || !inserted.data?.id) return { error: "invalid" };
  const id = String(inserted.data.id);
  const attachment = await supabase.from("conversation_message_attachments").insert({
    message_id: id,
    storage_path: parsed.audio.path,
    media_type: "audio",
    mime_type: parsed.audio.mimeType,
    size_bytes: parsed.audio.sizeBytes,
    duration_ms: parsed.audio.durationMs,
  });
  if (attachment.error) return { error: "invalid" };
  const notice = await recordConversationMessage(supabase, {
    conversationId: input.conversationId,
    messageId: id,
    kind: "audio",
    actor: input.actor,
    authorUserId: input.authorUserId,
  });
  return { id, outboxId: notice.outboxId };
}

async function postConversationImage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    actor: "client" | "specialist";
    authorUserId: string | null;
    raw: unknown;
  },
): Promise<{ id: string; outboxId: string | null } | { error: ConversationWriteError }> {
  if (!input.authorUserId) return { error: "invalid" };
  const parsed = parseConversationPost(input.conversationId, input.raw);
  if ("error" in parsed) return parsed;
  if (parsed.kind !== "image") return { error: "invalid" };
  const existing = await supabase
    .from("conversation_message_attachments")
    .select("id")
    .eq("storage_path", parsed.image.path)
    .maybeSingle();
  if (existing.data?.id) return { error: "wrong_conversation" };
  const uploaded = await uploadedImageMatches(supabase, parsed.image);
  if (!uploaded.ok) return { error: uploaded.error };
  const inserted = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: input.conversationId,
      kind: "image",
      actor_type: input.actor,
      author_user_id: input.authorUserId,
      body: null,
      payload: {},
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (inserted.error || !inserted.data?.id) return { error: "invalid" };
  const id = String(inserted.data.id);
  const attachment = await supabase.from("conversation_message_attachments").insert({
    message_id: id,
    storage_path: parsed.image.path,
    media_type: "image",
    mime_type: parsed.image.mimeType,
    size_bytes: parsed.image.sizeBytes,
    duration_ms: null,
  });
  if (attachment.error) return { error: "invalid" };
  const notice = await recordConversationMessage(supabase, {
    conversationId: input.conversationId,
    messageId: id,
    kind: "image",
    actor: input.actor,
    authorUserId: input.authorUserId,
  });
  return { id, outboxId: notice.outboxId };
}

async function postConversationLocation(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    actor: "client" | "specialist";
    authorUserId: string | null;
    location: LocationPoint;
  },
): Promise<{ id: string; outboxId: string | null } | { error: ConversationWriteError }> {
  if (!input.authorUserId) return { error: "invalid" };
  const payload: { latitude: number; longitude: number; label?: string } = {
    latitude: input.location.latitude,
    longitude: input.location.longitude,
  };
  if (input.location.label) payload.label = input.location.label;
  const inserted = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: input.conversationId,
      kind: "location",
      actor_type: input.actor,
      author_user_id: input.authorUserId,
      body: null,
      payload,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (inserted.error || !inserted.data?.id) return { error: "invalid" };
  const id = String(inserted.data.id);
  const notice = await recordConversationMessage(supabase, {
    conversationId: input.conversationId,
    messageId: id,
    kind: "location",
    actor: input.actor,
    authorUserId: input.authorUserId,
  });
  return { id, outboxId: notice.outboxId };
}

export async function postConversationMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    actor: "client" | "specialist";
    authorUserId: string | null;
    raw: unknown;
  },
): Promise<{ id: string; outboxId: string | null } | { error: ConversationWriteError }> {
  const parsed = parseConversationPost(input.conversationId, input.raw);
  if ("error" in parsed) return parsed;
  if (parsed.kind === "text") {
    return postConversationText(supabase, {
      conversationId: input.conversationId,
      actor: input.actor,
      authorUserId: input.authorUserId,
      body: parsed.body,
    });
  }
  if (parsed.kind === "audio") return postConversationAudio(supabase, input);
  if (parsed.kind === "image") return postConversationImage(supabase, input);
  return postConversationLocation(supabase, { ...input, location: parsed.location });
}
