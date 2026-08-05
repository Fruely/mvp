import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingEventStatus = "pending" | "processed" | "failed" | "skipped";

export type BillingEventClaimResult =
  | { action: "process"; rowId: string }
  | { action: "noop"; status: BillingEventStatus };

/**
 * Claim a Stripe webhook event for processing (idempotent).
 * Returns noop when the same provider_event_id was already processed/skipped.
 */
export async function claimBillingEvent(
  supabase: SupabaseClient,
  input: {
    providerEventId: string;
    eventType: string;
    provider?: string;
  }
): Promise<BillingEventClaimResult> {
  const provider = input.provider ?? "stripe";
  const ts = new Date().toISOString();

  const { data: existing } = await supabase
    .from("billing_events")
    .select("id, processing_status")
    .eq("provider", provider)
    .eq("provider_event_id", input.providerEventId)
    .maybeSingle();

  if (existing) {
    const status = existing.processing_status as BillingEventStatus;
    if (status === "processed" || status === "skipped") {
      return { action: "noop", status };
    }
    if (status === "pending" || status === "failed") {
      return { action: "process", rowId: existing.id as string };
    }
    return { action: "noop", status };
  }

  const { data: inserted, error } = await supabase
    .from("billing_events")
    .insert({
      provider,
      provider_event_id: input.providerEventId,
      event_type: input.eventType,
      processing_status: "pending",
      created_at: ts,
      updated_at: ts,
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: again } = await supabase
      .from("billing_events")
      .select("id, processing_status")
      .eq("provider", provider)
      .eq("provider_event_id", input.providerEventId)
      .maybeSingle();
    const status = (again?.processing_status as BillingEventStatus) ?? "processed";
    if (status === "processed" || status === "skipped") {
      return { action: "noop", status };
    }
    if (again?.id) return { action: "process", rowId: again.id as string };
    return { action: "noop", status: "processed" };
  }

  if (error || !inserted) {
    throw new Error("billing_event_claim_failed");
  }

  return { action: "process", rowId: inserted.id as string };
}

export async function finishBillingEvent(
  supabase: SupabaseClient,
  rowId: string,
  input: { status: Extract<BillingEventStatus, "processed" | "failed" | "skipped">; error?: string }
): Promise<void> {
  const ts = new Date().toISOString();
  await supabase
    .from("billing_events")
    .update({
      processing_status: input.status,
      processed_at: ts,
      processing_error: input.error?.slice(0, 500) ?? null,
      updated_at: ts,
    })
    .eq("id", rowId);
}
