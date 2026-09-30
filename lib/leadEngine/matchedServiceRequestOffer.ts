import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activeUserIdsWithNativeCapability,
  PAID_REQUEST_ACCESS_CAPABILITY,
} from "@/lib/nativeInstallations/capabilities";
import { buildMatchedServiceRequestOffer } from "@/lib/leadEngine/requestOfferPolicy";
import {
  resolveAcceptedCeilingAccessPrice,
  resolveServiceRequestAccessPrice,
  type ServiceRequestAccessPrice,
} from "@/lib/leadEngine/serviceRequestAccessPricing";
import { nonNegativeIntegerCents } from "@/lib/serviceRequests/clientBudget";

/**
 * Persists the initial matched service-request offer on request_offers.
 *
 * Lives outside requestOffers.ts because that module is the direct-lead shadow
 * writer and imports server-only shadow pricing. Matching must not load or
 * apply that pricing. This file is the only writer for the matched offer.
 */
export const SERVICE_REQUEST_COMMERCIAL_OFFERS_FLAG = "SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED";

export function areServiceRequestCommercialOffersEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[SERVICE_REQUEST_COMMERCIAL_OFFERS_FLAG]?.trim().toLowerCase() === "true";
}

export type EnsureMatchedServiceRequestOffersResult =
  | { ok: true; kind: "disabled" | "ready" }
  | { ok: false; kind: "offer_write_failed" };

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

const EXISTING_OFFER_COLUMNS =
  "idempotency_key, request_kind, service_request_id, specialist_id, offer_reason, billing_model, currency, price_cents";

function positivePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

async function loadClientBudgetBasis(
  supabase: Pick<SupabaseClient, "from">,
  requestId: string,
): Promise<{ text: string | null; acceptedCents: number | null } | { error: true }> {
  const result = await supabase
    .from("service_requests")
    .select("client_budget_text, budget_reconciliation_accepted_cents")
    .eq("id", requestId)
    .maybeSingle();
  if (result.error || !result.data) return { error: true };
  const text = result.data.client_budget_text;
  return {
    text: typeof text === "string" ? text : null,
    acceptedCents: nonNegativeIntegerCents(result.data.budget_reconciliation_accepted_cents),
  };
}

async function loadExistingOffer(
  supabase: Pick<SupabaseClient, "from">,
  idempotencyKey: string,
): Promise<Record<string, unknown> | null | { error: true }> {
  const existing = await supabase
    .from("request_offers")
    .select(EXISTING_OFFER_COLUMNS)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing.error) return { error: true };
  return (existing.data as Record<string, unknown> | null) ?? null;
}

async function reconcileExistingOffer(
  supabase: Pick<SupabaseClient, "from">,
  input: {
    requestId: string;
    specialistId: string;
    idempotencyKey: string;
    pricing: ServiceRequestAccessPrice;
  },
): Promise<boolean> {
  const loaded = await loadExistingOffer(supabase, input.idempotencyKey);
  if (!loaded || "error" in loaded) return false;
  if (
    !existingOfferMatches(loaded, {
      requestId: input.requestId,
      specialistId: input.specialistId,
      idempotencyKey: input.idempotencyKey,
    })
  ) {
    return false;
  }
  if (positivePrice(loaded.price_cents)) return true;
  if (loaded.price_cents != null) return false;

  const updatedAt = new Date().toISOString();
  const updated = await supabase
    .from("request_offers")
    .update({
      price_cents: input.pricing.priceCents,
      estimated_service_value_min_cents: input.pricing.estimatedServiceValueMinCents,
      estimated_service_value_max_cents: input.pricing.estimatedServiceValueMaxCents,
      max_buyers_snapshot: input.pricing.maxBuyersSnapshot,
      updated_at: updatedAt,
    })
    .eq("idempotency_key", input.idempotencyKey)
    .is("price_cents", null);
  if (updated.error) return false;

  const reread = await loadExistingOffer(supabase, input.idempotencyKey);
  if (!reread || "error" in reread) return false;
  return (
    existingOfferMatches(reread, {
      requestId: input.requestId,
      specialistId: input.specialistId,
      idempotencyKey: input.idempotencyKey,
    }) && positivePrice(reread.price_cents) != null
  );
}

function existingOfferMatches(
  row: Record<string, unknown> | null,
  input: { requestId: string; specialistId: string; idempotencyKey: string },
): boolean {
  if (!row) return false;
  return (
    row.idempotency_key === input.idempotencyKey &&
    row.request_kind === "service_request" &&
    row.service_request_id === input.requestId &&
    row.specialist_id === input.specialistId &&
    row.offer_reason === "matched" &&
    row.billing_model === "pay_per_lead" &&
    row.currency === "eur"
  );
}

/**
 * Capability gates only the introduction of a new paid offer.
 * An existing positive offer is left untouched when the specialist is no longer capable.
 */
async function specialistsEligibleForNewPaidOffer(
  supabase: Pick<SupabaseClient, "from">,
  specialistIds: readonly string[],
): Promise<Set<string> | { error: true }> {
  if (specialistIds.length === 0) return new Set();
  const listed = await supabase.from("specialists").select("id, user_id").in("id", [...specialistIds]);
  if (listed.error) return { error: true };
  const specialistUsers = new Map<string, string>();
  const userIds: string[] = [];
  for (const row of listed.data ?? []) {
    const specialistId = typeof row.id === "string" ? row.id : "";
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    if (!specialistId || !userId) continue;
    specialistUsers.set(specialistId, userId);
    if (!userIds.includes(userId)) userIds.push(userId);
  }
  const capableUsers = await activeUserIdsWithNativeCapability(
    supabase,
    userIds,
    PAID_REQUEST_ACCESS_CAPABILITY,
  );
  if ("error" in capableUsers) return { error: true };
  const eligible = new Set<string>();
  specialistUsers.forEach((userId, specialistId) => {
    if (capableUsers.has(userId)) eligible.add(specialistId);
  });
  return eligible;
}

export async function ensureMatchedServiceRequestOffers(
  supabase: Pick<SupabaseClient, "from">,
  input: { requestId: string; specialistIds: readonly string[] },
  env: NodeJS.ProcessEnv = process.env,
): Promise<EnsureMatchedServiceRequestOffersResult> {
  if (!areServiceRequestCommercialOffersEnabled(env)) {
    return { ok: true, kind: "disabled" };
  }

  const specialistIds: string[] = [];
  for (const id of input.specialistIds) {
    if (id.length > 0 && !specialistIds.includes(id)) specialistIds.push(id);
  }
  try {
    const budget = await loadClientBudgetBasis(supabase, input.requestId);
    if ("error" in budget) return { ok: false, kind: "offer_write_failed" };
    const pricing = budget.acceptedCents != null
      ? resolveAcceptedCeilingAccessPrice(budget.acceptedCents)
      : resolveServiceRequestAccessPrice(budget.text);
    const eligible = await specialistsEligibleForNewPaidOffer(supabase, specialistIds);
    if ("error" in eligible) return { ok: false, kind: "offer_write_failed" };
    for (const specialistId of specialistIds) {
      if (!eligible.has(specialistId)) continue;
      const payload = buildMatchedServiceRequestOffer({
        requestId: input.requestId,
        specialistId,
        pricing,
      });
      const { error } = await supabase.from("request_offers").insert(payload);
      if (!error) continue;
      if (isUniqueViolation(error)) {
        const reconciled = await reconcileExistingOffer(supabase, {
          requestId: input.requestId,
          specialistId,
          idempotencyKey: payload.idempotency_key,
          pricing,
        });
        if (!reconciled) return { ok: false, kind: "offer_write_failed" };
        continue;
      }
      console.error("[lead-engine/matched-offer] write failed", {
        code: error.code ?? "unknown",
      });
      return { ok: false, kind: "offer_write_failed" };
    }
    return { ok: true, kind: "ready" };
  } catch (error) {
    console.error("[lead-engine/matched-offer] write threw", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, kind: "offer_write_failed" };
  }
}
