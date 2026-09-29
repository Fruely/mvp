import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildMatchedServiceRequestOfferIdempotencyKey,
  PURCHASABLE_SERVICE_REQUEST_OFFER_STATUSES,
} from "@/lib/leadEngine/requestOfferPolicy";

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
  | {
      ok: false;
      error:
        | "not_found"
        | "forbidden"
        | "not_claimable"
        | "already_claimed"
        | "offer_unavailable"
        | "invariant";
    };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(error: string): ReserveResult {
  if (
    error === "not_found" ||
    error === "forbidden" ||
    error === "not_claimable" ||
    error === "already_claimed" ||
    error === "offer_unavailable" ||
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

const PURCHASABLE = new Set<string>(PURCHASABLE_SERVICE_REQUEST_OFFER_STATUSES);

async function currentMatchedOfferId(
  supabase: Pick<SupabaseClient, "from">,
  input: { matchId: string; specialistId: string },
): Promise<string | null> {
  const match = await supabase
    .from("service_request_matches")
    .select("service_request_id, specialist_id")
    .eq("id", input.matchId)
    .maybeSingle();
  if (match.error) throw match.error;
  const requestId =
    match.data && typeof match.data.service_request_id === "string" ? match.data.service_request_id : null;
  const owner = match.data && typeof match.data.specialist_id === "string" ? match.data.specialist_id : null;
  if (!requestId || !UUID.test(requestId) || owner !== input.specialistId) return null;

  const offer = await supabase
    .from("request_offers")
    .select("id, status, request_kind, service_request_id, specialist_id, offer_reason, billing_model")
    .eq("idempotency_key", buildMatchedServiceRequestOfferIdempotencyKey({
      requestId,
      specialistId: input.specialistId,
    }))
    .maybeSingle();
  if (offer.error) throw offer.error;
  const row = offer.data;
  if (!row || typeof row.id !== "string" || !UUID.test(row.id)) return null;
  if (row.request_kind !== "service_request") return null;
  if (row.service_request_id !== requestId || row.specialist_id !== input.specialistId) return null;
  if (row.offer_reason !== "matched" || row.billing_model !== "pay_per_lead") return null;
  if (!PURCHASABLE.has(String(row.status))) return null;
  return row.id;
}

/**
 * Exclusive reservation. Identity is the authenticated specialist passed by the route.
 * The current offer is resolved here and checked again inside the database function.
 * The database function is the only writer. This does not select or open chat.
 */
export async function reserveOwnMatch(
  supabase: Pick<SupabaseClient, "rpc" | "from">,
  input: { matchId: string; specialistId: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReserveResult> {
  if (!isServiceRequestPaidClaimEnabled(env)) return { ok: false, error: "not_found" };
  if (!UUID.test(input.matchId) || !UUID.test(input.specialistId)) return { ok: false, error: "not_found" };

  const requestOfferId = await currentMatchedOfferId(supabase, input);
  const { data, error } = await supabase.rpc("reserve_service_request_claim", {
    p_match_id: input.matchId,
    p_specialist_id: input.specialistId,
    p_request_offer_id: requestOfferId,
  });
  if (error) throw error;
  return readRpc(data);
}
