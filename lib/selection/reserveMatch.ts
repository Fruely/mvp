import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only switch for the paid service-request reservation API.
 * Default off. Legacy POST /claim does not read this flag.
 */
export const SERVICE_REQUEST_PAID_CLAIM_FLAG = "SERVICE_REQUEST_PAID_CLAIM_ENABLED";

export function isServiceRequestPaidClaimEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_REQUEST_PAID_CLAIM_FLAG]?.trim().toLowerCase() === "true";
}

export type ReserveResult =
  | { ok: true; claimId: string; changed: boolean }
  | { ok: false; error: "not_found" | "forbidden" | "not_claimable" | "already_claimed" | "invariant" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error: string): ReserveResult {
  if (
    error === "not_found" ||
    error === "forbidden" ||
    error === "not_claimable" ||
    error === "already_claimed" ||
    error === "invariant"
  ) {
    return { ok: false, error };
  }
  return { ok: false, error: "invariant" };
}

function readRpc(data: unknown): ReserveResult {
  if (!data || typeof data !== "object") return { ok: false, error: "invariant" };
  const row = data as Record<string, unknown>;
  if (row.ok === true && typeof row.claim_id === "string" && UUID.test(row.claim_id)) {
    return { ok: true, claimId: row.claim_id, changed: row.changed === true };
  }
  if (row.ok === false && typeof row.error === "string") return failure(row.error);
  return { ok: false, error: "invariant" };
}

/**
 * Exclusive reservation. Identity is the authenticated specialist passed by the route.
 * The database function is the only writer. This does not select or open chat.
 */
export async function reserveOwnMatch(
  supabase: Pick<SupabaseClient, "rpc">,
  input: { matchId: string; specialistId: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReserveResult> {
  if (!isServiceRequestPaidClaimEnabled(env)) return { ok: false, error: "not_found" };
  if (!UUID.test(input.matchId) || !UUID.test(input.specialistId)) return { ok: false, error: "not_found" };

  const { data, error } = await supabase.rpc("reserve_service_request_claim", {
    p_match_id: input.matchId,
    p_specialist_id: input.specialistId,
  });
  if (error) throw error;
  return readRpc(data);
}
