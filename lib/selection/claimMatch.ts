import type { SupabaseClient } from "@supabase/supabase-js";
import { recordClaimConnection } from "./interest";

/**
 * Future paid-access decision. Phase C allows an eligible specialist session
 * through. Direct-lead unlock and checkout do not belong here.
 */
export function canClaimAccess(): { allowed: boolean } {
  return { allowed: true };
}

export type ClaimResult =
  | { ok: true; changed: boolean; conversationId: string }
  | { ok: false; error: "not_found" | "forbidden" | "not_claimable" | "already_claimed" | "invariant" };

type MatchRow = {
  id: string;
  specialist_id: string;
  service_request_id: string;
  status: string;
};

type RequestRow = {
  id: string;
  status: string;
  selected_specialist_id: string | null;
  public_id: string;
  client_user_id: string | null;
  client_email: string | null;
  requested_service: string | null;
  category_text: string | null;
};

const MATCH_COLUMNS = "id, specialist_id, service_request_id, status";
const REQUEST_COLUMNS =
  "id, status, selected_specialist_id, public_id, client_user_id, client_email, requested_service, category_text";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadMatch(supabase: SupabaseClient, matchId: string): Promise<MatchRow | null> {
  const match = await supabase.from("service_request_matches").select(MATCH_COLUMNS).eq("id", matchId).maybeSingle();
  if (match.error || !match.data?.id) return null;
  return {
    id: String(match.data.id),
    specialist_id: String(match.data.specialist_id ?? ""),
    service_request_id: String(match.data.service_request_id ?? ""),
    status: String(match.data.status ?? ""),
  };
}

async function loadRequest(supabase: SupabaseClient, requestId: string): Promise<RequestRow | null> {
  const request = await supabase.from("service_requests").select(REQUEST_COLUMNS).eq("id", requestId).maybeSingle();
  if (request.error || !request.data?.id) return null;
  return {
    id: String(request.data.id),
    status: String(request.data.status ?? ""),
    selected_specialist_id: text(request.data.selected_specialist_id),
    public_id: String(request.data.public_id ?? ""),
    client_user_id: text(request.data.client_user_id),
    client_email: text(request.data.client_email),
    requested_service: text(request.data.requested_service),
    category_text: text(request.data.category_text),
  };
}

async function rollbackOwnership(
  supabase: SupabaseClient,
  input: { requestId: string; specialistId: string; previousStatus: string },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("service_requests")
    .update({
      selected_specialist_id: null,
      selected_at: null,
      status: input.previousStatus,
      updated_at: now,
    })
    .eq("id", input.requestId)
    .eq("selected_specialist_id", input.specialistId);
}

async function markWinnerSelected(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string; statuses: string[] },
): Promise<boolean> {
  const now = new Date().toISOString();
  const marked = await supabase
    .from("service_request_matches")
    .update({ status: "selected", updated_at: now })
    .eq("id", input.matchId)
    .eq("specialist_id", input.specialistId)
    .in("status", input.statuses)
    .select("id")
    .maybeSingle();
  if (marked.error) throw marked.error;
  return Boolean(marked.data?.id);
}

async function ensureWinnerConversation(
  supabase: SupabaseClient,
  input: { requestId: string; specialistId: string; clientUserId: string | null; serviceLabel: string },
): Promise<{ id: string } | { error: "mismatch" | "missing" }> {
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
    .select("id, specialist_id")
    .maybeSingle();
  if (inserted.error) throw inserted.error;
  const row = inserted.data?.id
    ? inserted.data
    : await supabase
        .from("conversations")
        .select("id, specialist_id")
        .eq("service_request_id", input.requestId)
        .maybeSingle()
        .then((existing) => existing.data);
  if (!row?.id) return { error: "missing" };
  if (String(row.specialist_id) !== input.specialistId) return { error: "mismatch" };

  const existing = await supabase
    .from("conversation_messages")
    .select("id")
    .eq("conversation_id", row.id)
    .eq("kind", "system")
    .maybeSingle();
  if (!existing.data?.id) {
    await supabase.from("conversation_messages").insert({
      conversation_id: row.id,
      kind: "system",
      actor_type: "system",
      author_user_id: null,
      body: null,
      payload: { event: "connection_ready", service_label: input.serviceLabel },
    });
  }
  return { id: String(row.id) };
}

async function reconcileWinner(
  supabase: SupabaseClient,
  input: { match: MatchRow; request: RequestRow; specialistId: string; changed: boolean },
): Promise<ClaimResult> {
  const current = await loadMatch(supabase, input.match.id);
  if (!current || current.specialist_id !== input.specialistId) return { ok: false, error: "forbidden" };
  if (current.status === "declined") return { ok: false, error: "not_claimable" };
  if (current.status !== "selected") {
    const repaired = await markWinnerSelected(supabase, {
      matchId: current.id,
      specialistId: input.specialistId,
      statuses: ["active", "interested", "not_selected"],
    });
    if (!repaired) {
      const again = await loadMatch(supabase, current.id);
      if (again?.status === "declined") return { ok: false, error: "not_claimable" };
      if (again?.status !== "selected") {
        console.error("[claim] winner match could not be reconciled", { requestId: input.request.id });
        return { ok: false, error: "invariant" };
      }
    }
  }

  const now = new Date().toISOString();
  await supabase
    .from("service_request_matches")
    .update({ status: "not_selected", updated_at: now })
    .eq("service_request_id", input.request.id)
    .in("status", ["active", "interested"])
    .neq("id", current.id);

  const others = await supabase
    .from("service_request_matches")
    .select("id")
    .eq("service_request_id", input.request.id)
    .neq("id", current.id);
  for (const row of others.data ?? []) {
    await supabase
      .from("notification_outbox")
      .update({ status: "cancelled", updated_at: now })
      .eq("match_id", row.id)
      .in("status", ["pending", "retryable"]);
  }

  const serviceLabel = input.request.requested_service || input.request.category_text || "";
  const conversation = await ensureWinnerConversation(supabase, {
    requestId: input.request.id,
    specialistId: input.specialistId,
    clientUserId: input.request.client_user_id,
    serviceLabel,
  });
  if ("error" in conversation) {
    console.error("[claim] conversation invariant", { requestId: input.request.id });
    return { ok: false, error: "invariant" };
  }

  try {
    await recordClaimConnection(supabase, {
      requestId: input.request.id,
      publicId: input.request.public_id,
      matchId: current.id,
      specialistId: input.specialistId,
      clientUserId: input.request.client_user_id,
      clientEmail: input.request.client_email,
      serviceLabel,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("[claim] connection notice failed", {
      name: error instanceof Error ? error.name : "Error",
    });
  }

  return { ok: true, changed: input.changed, conversationId: conversation.id };
}

export async function claimOwnMatch(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string },
): Promise<ClaimResult> {
  const match = await loadMatch(supabase, input.matchId);
  if (!match) return { ok: false, error: "not_found" };
  if (match.specialist_id !== input.specialistId) return { ok: false, error: "forbidden" };

  const request = await loadRequest(supabase, match.service_request_id);
  if (!request) return { ok: false, error: "not_found" };

  if (request.selected_specialist_id && request.selected_specialist_id !== input.specialistId) {
    return { ok: false, error: "already_claimed" };
  }

  if (!request.selected_specialist_id) {
    if (match.status !== "active") return { ok: false, error: "not_claimable" };
    if (!canClaimAccess().allowed) return { ok: false, error: "not_claimable" };

    const now = new Date().toISOString();
    const claimed = await supabase
      .from("service_requests")
      .update({
        selected_specialist_id: input.specialistId,
        selected_at: now,
        status: "matched",
        updated_at: now,
      })
      .eq("id", request.id)
      .is("selected_specialist_id", null)
      .select("id")
      .maybeSingle();
    if (claimed.error) throw claimed.error;

    if (!claimed.data?.id) {
      const again = await loadRequest(supabase, request.id);
      if (!again) return { ok: false, error: "not_found" };
      if (again.selected_specialist_id === input.specialistId) {
        return reconcileWinner(supabase, { match, request: again, specialistId: input.specialistId, changed: false });
      }
      return { ok: false, error: "already_claimed" };
    }

    const won = await markWinnerSelected(supabase, {
      matchId: match.id,
      specialistId: input.specialistId,
      statuses: ["active"],
    });
    if (!won) {
      const fresh = await loadMatch(supabase, match.id);
      if (!fresh || fresh.status === "declined") {
        await rollbackOwnership(supabase, {
          requestId: request.id,
          specialistId: input.specialistId,
          previousStatus: request.status,
        });
        return { ok: false, error: "not_claimable" };
      }
      if (fresh.status !== "selected") {
        const repaired = await markWinnerSelected(supabase, {
          matchId: match.id,
          specialistId: input.specialistId,
          statuses: ["active", "interested", "not_selected"],
        });
        if (!repaired) {
          const after = await loadMatch(supabase, match.id);
          if (after?.status !== "selected") {
            await rollbackOwnership(supabase, {
              requestId: request.id,
              specialistId: input.specialistId,
              previousStatus: request.status,
            });
            return { ok: false, error: after?.status === "declined" ? "not_claimable" : "invariant" };
          }
        }
      }
    }

    const owned = await loadRequest(supabase, request.id);
    if (!owned || owned.selected_specialist_id !== input.specialistId) {
      return { ok: false, error: "already_claimed" };
    }
    return reconcileWinner(supabase, { match, request: owned, specialistId: input.specialistId, changed: true });
  }

  if (match.status === "declined") return { ok: false, error: "not_claimable" };
  return reconcileWinner(supabase, { match, request, specialistId: input.specialistId, changed: false });
}
