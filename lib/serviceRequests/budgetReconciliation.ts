import type { SupabaseClient } from "@supabase/supabase-js";
import { matchPersistedServiceRequest } from "@/lib/matching/matchAfterCreate";
import { nonNegativeIntegerCents } from "@/lib/serviceRequests/clientBudget";

export type BudgetReconciliationClientOffer = {
  required: true;
  minimum_budget_cents: number;
  currency: "eur";
};

export type ClientBudgetReconciliationState = {
  required: boolean;
  minimum_budget_cents: number | null;
  currency: "eur";
  accepted_cents: number | null;
  declined: boolean;
};

const REQUEST_COLUMNS =
  "id, public_id, client_user_id, budget_reconciliation_required_cents, budget_reconciliation_accepted_cents, budget_reconciliation_accepted_at, budget_reconciliation_declined_at";

export function parseBudgetAction(body: unknown): "accept" | "decline" | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "action") return null;
  if (record.action === "accept" || record.action === "decline") return record.action;
  return null;
}

/** Open client prompt. Omitted after decline or when no unresolved floor exists. */
export function openBudgetReconciliationOffer(row: {
  budget_reconciliation_required_cents?: unknown;
  budget_reconciliation_declined_at?: unknown;
}): BudgetReconciliationClientOffer | null {
  const cents = nonNegativeIntegerCents(row.budget_reconciliation_required_cents);
  if (cents == null || row.budget_reconciliation_declined_at != null) return null;
  return { required: true, minimum_budget_cents: cents, currency: "eur" };
}

/** Owner-visible state. Null when this request has no reconciliation history. */
export function clientBudgetReconciliationState(row: {
  budget_reconciliation_required_cents?: unknown;
  budget_reconciliation_accepted_cents?: unknown;
  budget_reconciliation_declined_at?: unknown;
}): ClientBudgetReconciliationState | null {
  const requiredCents = nonNegativeIntegerCents(row.budget_reconciliation_required_cents);
  const acceptedCents = nonNegativeIntegerCents(row.budget_reconciliation_accepted_cents);
  const declinedAt = row.budget_reconciliation_declined_at != null;
  if (requiredCents == null && acceptedCents == null && !declinedAt) return null;
  return {
    required: requiredCents != null && !declinedAt,
    minimum_budget_cents: requiredCents,
    currency: "eur",
    accepted_cents: acceptedCents,
    declined: declinedAt && requiredCents != null,
  };
}

export type BudgetReconciliationActionResult =
  | {
      ok: true;
      action: "accept" | "decline";
      public_id: string;
      accepted_cents: number | null;
      declined: boolean;
      matches: number;
      budget_reconciliation: BudgetReconciliationClientOffer | null;
    }
  | { ok: false; error: "not_found" | "reconciliation_unavailable" };

/**
 * Accept uses the persisted required cents. The client cannot supply a ceiling.
 * A repeated accept reruns matching on the same request and does not allocate a
 * new public id. A repeated decline does not distribute.
 *
 * If supply changes after the offered floor, accept still stores that offered
 * floor. Rematching may open a new reconciliation for a different floor. It does
 * not silently raise the accepted ceiling.
 */
export async function applyClientBudgetReconciliation(input: {
  supabase: SupabaseClient;
  publicId: string;
  clientUserId: string;
  action: "accept" | "decline";
  nowIso?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<BudgetReconciliationActionResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const { data, error } = await input.supabase
    .from("service_requests")
    .select(REQUEST_COLUMNS)
    .eq("public_id", input.publicId)
    .maybeSingle();
  if (error || !data?.id || data.client_user_id !== input.clientUserId) {
    return { ok: false, error: "not_found" };
  }

  const requestId = String(data.id);
  const publicId = String(data.public_id);
  const requiredCents = nonNegativeIntegerCents(data.budget_reconciliation_required_cents);
  const acceptedCents = nonNegativeIntegerCents(data.budget_reconciliation_accepted_cents);
  const declinedAt =
    typeof data.budget_reconciliation_declined_at === "string"
      ? data.budget_reconciliation_declined_at
      : null;

  if (input.action === "decline") {
    if (requiredCents == null) {
      if (declinedAt) {
        return {
          ok: true,
          action: "decline",
          public_id: publicId,
          accepted_cents: acceptedCents,
          declined: true,
          matches: 0,
          budget_reconciliation: null,
        };
      }
      return { ok: false, error: "reconciliation_unavailable" };
    }
    if (!declinedAt) {
      const updated = await input.supabase
        .from("service_requests")
        .update({ budget_reconciliation_declined_at: nowIso })
        .eq("id", requestId)
        .eq("client_user_id", input.clientUserId);
      if (updated.error) return { ok: false, error: "reconciliation_unavailable" };
    }
    return {
      ok: true,
      action: "decline",
      public_id: publicId,
      accepted_cents: acceptedCents,
      declined: true,
      matches: 0,
      budget_reconciliation: null,
    };
  }

  let nextAccepted = acceptedCents;
  if (requiredCents != null) {
    const updated = await input.supabase
      .from("service_requests")
      .update({
        budget_reconciliation_accepted_cents: requiredCents,
        budget_reconciliation_accepted_at: nowIso,
        budget_reconciliation_declined_at: null,
        budget_reconciliation_required_cents: null,
      })
      .eq("id", requestId)
      .eq("client_user_id", input.clientUserId);
    if (updated.error) return { ok: false, error: "reconciliation_unavailable" };
    nextAccepted = requiredCents;
  } else if (acceptedCents == null) {
    return { ok: false, error: "reconciliation_unavailable" };
  }

  const matched = await matchPersistedServiceRequest(input.supabase, requestId, input.env);
  return {
    ok: true,
    action: "accept",
    public_id: publicId,
    accepted_cents: nextAccepted,
    declined: false,
    matches: matched.matches,
    budget_reconciliation: matched.budgetReconciliation,
  };
}
