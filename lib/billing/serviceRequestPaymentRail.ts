import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which payment sequence owns one reserved claim.
 * Store provider (Apple or Google) is chosen later by a verified transaction.
 */
export type ServiceRequestPaymentRail = "stripe" | "store";

export const SERVICE_REQUEST_STORE_PAYMENT_FLAG = "SERVICE_REQUEST_STORE_PAYMENT_ENABLED";

export function isServiceRequestStorePaymentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_REQUEST_STORE_PAYMENT_FLAG]?.trim().toLowerCase() === "true";
}

export type BindServiceRequestPaymentRailResult =
  | { ok: true; paymentRail: ServiceRequestPaymentRail }
  | { ok: false; error: "not_found" | "forbidden" | "not_claimable" | "retryable" };

type ClaimRailRow = {
  id?: string;
  status?: string;
  specialist_id?: string;
  payment_rail?: string | null;
};

export function paymentProvesStripeRail(payment: {
  provider?: string | null;
  stripe_payment_intent_id?: string | null;
}): boolean {
  if (payment.provider === "stripe") return true;
  return typeof payment.stripe_payment_intent_id === "string" && payment.stripe_payment_intent_id.trim().length > 0;
}

function knownRail(value: unknown): ServiceRequestPaymentRail | null {
  return value === "stripe" || value === "store" ? value : null;
}

/**
 * Compare-and-set the claim rail. NULL binds once. The same rail is idempotent.
 * A different rail fails closed. The update matches only a still-reserved NULL rail.
 */
export async function bindServiceRequestPaymentRail(input: {
  supabase: SupabaseClient;
  claimId: string;
  specialistId: string;
  rail: ServiceRequestPaymentRail;
}): Promise<BindServiceRequestPaymentRailResult> {
  const loaded = await loadClaimRail(input.supabase, input.claimId);
  if (!loaded.ok) return loaded;
  const decision = railDecision(loaded.claim, input.specialistId, input.rail);
  if (decision !== "bind") return decision;

  const updatedAt = new Date().toISOString();
  const updated = await input.supabase
    .from("service_request_claims")
    .update({ payment_rail: input.rail, updated_at: updatedAt })
    .eq("id", input.claimId)
    .eq("specialist_id", input.specialistId)
    .eq("status", "reserved")
    .is("payment_rail", null)
    .select("id, status, specialist_id, payment_rail");
  if (updated.error) return { ok: false, error: "retryable" };

  const reread = await loadClaimRail(input.supabase, input.claimId);
  if (!reread.ok) return reread;
  const after = railDecision(reread.claim, input.specialistId, input.rail);
  if (after === "bind") return { ok: false, error: "not_claimable" };
  return after;
}

async function loadClaimRail(
  supabase: SupabaseClient,
  claimId: string,
): Promise<{ ok: true; claim: ClaimRailRow } | { ok: false; error: "not_found" | "retryable" }> {
  const result = await supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, payment_rail")
    .eq("id", claimId)
    .maybeSingle();
  if (result.error) return { ok: false, error: "retryable" };
  const claim = result.data as ClaimRailRow | null;
  if (!claim?.id) return { ok: false, error: "not_found" };
  return { ok: true, claim };
}

function railDecision(
  claim: ClaimRailRow,
  specialistId: string,
  rail: ServiceRequestPaymentRail,
): BindServiceRequestPaymentRailResult | "bind" {
  if (claim.specialist_id !== specialistId) return { ok: false, error: "forbidden" };
  if (claim.status !== "reserved") return { ok: false, error: "not_claimable" };
  if (claim.payment_rail == null || claim.payment_rail === "") return "bind";
  const current = knownRail(claim.payment_rail);
  if (current === rail) return { ok: true, paymentRail: rail };
  return { ok: false, error: "not_claimable" };
}
