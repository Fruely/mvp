import type { SupabaseClient } from "@supabase/supabase-js";
import { recordSpecialistInterest } from "@/lib/selection/interest";
import { applyMatchResponse, type MatchResponseStatus } from "./policy";

export type MatchActionResult = {
  status: MatchResponseStatus;
  changed: boolean;
  respondedAt: string | null;
  openedAt: string | null;
};

function asStatus(value: unknown): MatchResponseStatus {
  if (
    value === "interested" ||
    value === "declined" ||
    value === "expired" ||
    value === "active" ||
    value === "selected" ||
    value === "not_selected"
  ) return value;
  return "active";
}

export async function openOwnMatch(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string; userId: string },
): Promise<{ openedAt: string } | { error: "not_found" | "forbidden" }> {
  const match = await supabase
    .from("service_request_matches")
    .select("id, specialist_id, opened_at")
    .eq("id", input.matchId)
    .maybeSingle();
  if (match.error || !match.data?.id) return { error: "not_found" };
  if (String(match.data.specialist_id) !== input.specialistId) return { error: "forbidden" };

  const now = new Date().toISOString();
  if (!match.data.opened_at) {
    await supabase
      .from("service_request_matches")
      .update({ opened_at: now, updated_at: now })
      .eq("id", input.matchId)
      .eq("specialist_id", input.specialistId)
      .is("opened_at", null);
  }
  await supabase
    .from("inbox_items")
    .update({ read_at: now, opened_at: now })
    .eq("entity_id", input.matchId)
    .eq("recipient_user_id", input.userId)
    .is("read_at", null);

  return { openedAt: typeof match.data.opened_at === "string" ? match.data.opened_at : now };
}

/**
 * First acknowledgement wins. interested-after-declined stays declined.
 * declined-after-interested stays interested. Repeating the same response is a no-op.
 * Contacts are never selected or returned.
 */
export async function respondToOwnMatch(
  supabase: SupabaseClient,
  input: {
    matchId: string;
    specialistId: string;
    userId: string;
    response: "interested" | "declined";
  },
): Promise<MatchActionResult | { error: "not_found" | "forbidden" }> {
  const match = await supabase
    .from("service_request_matches")
    .select("id, specialist_id, service_request_id, status, responded_at, opened_at")
    .eq("id", input.matchId)
    .maybeSingle();
  if (match.error || !match.data?.id) return { error: "not_found" };
  if (String(match.data.specialist_id) !== input.specialistId) return { error: "forbidden" };

  const decision = applyMatchResponse(asStatus(match.data.status), input.response);
  if (!decision.changed) {
    return {
      status: decision.status,
      changed: false,
      respondedAt: typeof match.data.responded_at === "string" ? match.data.responded_at : null,
      openedAt: typeof match.data.opened_at === "string" ? match.data.opened_at : null,
    };
  }

  const now = new Date().toISOString();
  const updated = await supabase
    .from("service_request_matches")
    .update({ status: decision.status, responded_at: now, updated_at: now })
    .eq("id", input.matchId)
    .eq("specialist_id", input.specialistId)
    .eq("status", "active")
    .select("status, responded_at, opened_at")
    .maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) {
    const again = await supabase
      .from("service_request_matches")
      .select("status, responded_at, opened_at")
      .eq("id", input.matchId)
      .eq("specialist_id", input.specialistId)
      .maybeSingle();
    return {
      status: asStatus(again.data?.status),
      changed: false,
      respondedAt: typeof again.data?.responded_at === "string" ? again.data.responded_at : null,
      openedAt: typeof again.data?.opened_at === "string" ? again.data.opened_at : null,
    };
  }

  await supabase
    .from("notification_outbox")
    .update({ status: "cancelled", updated_at: now })
    .eq("match_id", input.matchId)
    .in("status", ["pending", "retryable"]);
  await supabase
    .from("inbox_items")
    .update({ actioned_at: now, read_at: now })
    .eq("entity_id", input.matchId)
    .eq("recipient_user_id", input.userId)
    .is("actioned_at", null);

  if (input.response === "interested" && match.data.service_request_id) {
    try {
      await recordSpecialistInterest(supabase, {
        matchId: input.matchId,
        specialistId: input.specialistId,
        requestId: String(match.data.service_request_id),
      });
    } catch (error) {
      console.error("[selection] interest event failed", {
        name: error instanceof Error ? error.name : "Error",
      });
    }
  }

  return {
    status: decision.status,
    changed: true,
    respondedAt: now,
    openedAt: typeof updated.data.opened_at === "string" ? updated.data.opened_at : null,
  };
}

export async function markOwnInboxRead(
  supabase: SupabaseClient,
  input: { inboxId: string; userId: string },
): Promise<{ read: true } | { error: "not_found" | "forbidden" }> {
  const row = await supabase
    .from("inbox_items")
    .select("id, recipient_user_id, read_at")
    .eq("id", input.inboxId)
    .maybeSingle();
  if (row.error || !row.data?.id) return { error: "not_found" };
  if (String(row.data.recipient_user_id) !== input.userId) return { error: "forbidden" };
  if (!row.data.read_at) {
    await supabase
      .from("inbox_items")
      .update({ read_at: new Date().toISOString() })
      .eq("id", input.inboxId)
      .eq("recipient_user_id", input.userId);
  }
  return { read: true };
}
