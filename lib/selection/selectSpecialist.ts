import type { SupabaseClient } from "@supabase/supabase-js";
import { selectionDecision } from "./policy";
import { recordSelectionNotices } from "./interest";

const SELECT_COLUMNS = "id, public_id, client_user_id, status, selected_specialist_id, selected_at, requested_service, category_text, locale, client_email";

export type SelectionResult =
  | { ok: true; changed: boolean; conversationId: string; matchId: string; selectedAt: string }
  | { ok: false; error: "forbidden" | "not_selectable" | "already_selected" | "not_found" };

async function ensureConversation(
  supabase: SupabaseClient,
  input: { requestId: string; specialistId: string; clientUserId: string | null; serviceLabel: string },
): Promise<string | null> {
  const inserted = await supabase
    .from("conversations")
    .upsert(
      {
        service_request_id: input.requestId,
        specialist_id: input.specialistId,
        client_user_id: input.clientUserId,
        status: "open",
      },
      { onConflict: "service_request_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (inserted.error) throw inserted.error;
  const conversationId = inserted.data?.id
    ? String(inserted.data.id)
    : await supabase
        .from("conversations")
        .select("id")
        .eq("service_request_id", input.requestId)
        .maybeSingle()
        .then((row) => (row.data?.id ? String(row.data.id) : null));
  if (!conversationId) return null;
  const existing = await supabase
    .from("conversation_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("kind", "system")
    .maybeSingle();
  if (!existing.data?.id) {
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      kind: "system",
      actor_type: "system",
      author_user_id: null,
      body: null,
      payload: { event: "connection_ready", service_label: input.serviceLabel },
    });
  }
  return conversationId;
}

export async function selectInterestedSpecialist(
  supabase: SupabaseClient,
  input: { requestId: string; specialistId: string; actorUserId: string | null; anonymousAccess: boolean },
): Promise<SelectionResult> {
  const request = await supabase.from("service_requests").select(SELECT_COLUMNS).eq("id", input.requestId).maybeSingle();
  if (request.error || !request.data?.id) return { ok: false, error: "not_found" };
  const match = await supabase
    .from("service_request_matches")
    .select("id, status, specialist_id")
    .eq("service_request_id", input.requestId)
    .eq("specialist_id", input.specialistId)
    .maybeSingle();
  const decision = selectionDecision({
    requestClientUserId: typeof request.data.client_user_id === "string" ? request.data.client_user_id : null,
    actorUserId: input.actorUserId,
    anonymousAccess: input.anonymousAccess,
    requestStatus: String(request.data.status ?? ""),
    selectedSpecialistId: typeof request.data.selected_specialist_id === "string" ? request.data.selected_specialist_id : null,
    specialistId: input.specialistId,
    matchStatus: match.data?.status ? String(match.data.status) : null,
  });
  if (!decision.ok) return decision;

  const serviceLabel =
    (typeof request.data.requested_service === "string" && request.data.requested_service) ||
    (typeof request.data.category_text === "string" && request.data.category_text) ||
    "";
  const clientUserId = typeof request.data.client_user_id === "string" ? request.data.client_user_id : null;

  if (request.data.selected_specialist_id === input.specialistId) {
    const conversationId = await ensureConversation(supabase, {
      requestId: input.requestId,
      specialistId: input.specialistId,
      clientUserId,
      serviceLabel,
    });
    if (!conversationId) return { ok: false, error: "not_found" };
    return {
      ok: true,
      changed: false,
      conversationId,
      matchId: String(match.data?.id ?? ""),
      selectedAt: String(request.data.selected_at ?? ""),
    };
  }

  const now = new Date().toISOString();
  const claimed = await supabase
    .from("service_requests")
    .update({
      selected_specialist_id: input.specialistId,
      selected_at: now,
      status: "matched",
      updated_at: now,
    })
    .eq("id", input.requestId)
    .is("selected_specialist_id", null)
    .select("id, selected_at")
    .maybeSingle();
  if (claimed.error) throw claimed.error;
  if (!claimed.data?.id) {
    const again = await supabase.from("service_requests").select("selected_specialist_id, selected_at").eq("id", input.requestId).maybeSingle();
    if (again.data?.selected_specialist_id === input.specialistId) {
      const conversationId = await ensureConversation(supabase, {
        requestId: input.requestId,
        specialistId: input.specialistId,
        clientUserId,
        serviceLabel,
      });
      if (!conversationId) return { ok: false, error: "not_found" };
      return {
        ok: true,
        changed: false,
        conversationId,
        matchId: String(match.data?.id ?? ""),
        selectedAt: String(again.data.selected_at ?? now),
      };
    }
    return { ok: false, error: "already_selected" };
  }

  const marked = await supabase
    .from("service_request_matches")
    .update({ status: "selected", updated_at: now })
    .eq("id", match.data?.id)
    .eq("status", "interested")
    .select("id")
    .maybeSingle();
  if (marked.error || !marked.data?.id) {
    await supabase
      .from("service_requests")
      .update({ selected_specialist_id: null, selected_at: null, status: request.data.status, updated_at: now })
      .eq("id", input.requestId)
      .eq("selected_specialist_id", input.specialistId);
    return { ok: false, error: "not_selectable" };
  }

  await supabase
    .from("service_request_matches")
    .update({ status: "not_selected", updated_at: now })
    .eq("service_request_id", input.requestId)
    .in("status", ["active", "interested"]);
  const matches = await supabase
    .from("service_request_matches")
    .select("id")
    .eq("service_request_id", input.requestId);
  for (const row of matches.data ?? []) {
    await supabase
      .from("notification_outbox")
      .update({ status: "cancelled", updated_at: now })
      .eq("match_id", row.id)
      .in("status", ["pending", "retryable"]);
  }

  const conversationId = await ensureConversation(supabase, {
    requestId: input.requestId,
    specialistId: input.specialistId,
    clientUserId,
    serviceLabel,
  });
  if (!conversationId) return { ok: false, error: "not_found" };

  const specialist = await supabase.from("specialists").select("user_id").eq("id", input.specialistId).maybeSingle();
  try {
    await recordSelectionNotices(supabase, {
      requestId: input.requestId,
      publicId: String(request.data.public_id ?? ""),
      matchId: String(match.data?.id),
      specialistId: input.specialistId,
      specialistUserId: typeof specialist.data?.user_id === "string" ? specialist.data.user_id : null,
      clientUserId,
      clientEmail: typeof request.data.client_email === "string" ? request.data.client_email : null,
      serviceLabel,
      conversationId,
    });
  } catch (error) {
    console.error("[selection] notices failed", { name: error instanceof Error ? error.name : "Error" });
  }

  return {
    ok: true,
    changed: true,
    conversationId,
    matchId: String(match.data?.id),
    selectedAt: now,
  };
}
