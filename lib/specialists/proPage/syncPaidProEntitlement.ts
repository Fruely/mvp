import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProEntitlementSource, SpecialistProEntitlementRow } from "@/lib/specialists/proPage/types";

export type PaidProEntitlementMetadata = {
  plan_code: "premium";
  plan_payment_id: string;
  stripe_checkout_session_id?: string;
  last_recorded_at: string;
};

export type GrantPaidProEntitlementInput = {
  planPaymentId: string;
  stripeCheckoutSessionId?: string | null;
};

export type GrantPaidProEntitlementOutcome =
  | "granted"
  | "reactivated"
  | "already_active"
  | "preserved_non_paid";

export type GrantPaidProEntitlementResult =
  | { ok: true; outcome: GrantPaidProEntitlementOutcome }
  | { ok: false; retryable: boolean; code: string };

export type DeactivatePaidProEntitlementResult =
  | { ok: true; outcome: "deactivated" | "noop" }
  | { ok: false; retryable: boolean; code: string };

const ENTITLEMENT_SELECT = "specialist_id, source, is_active, granted_at, metadata";

function parseEntitlementSource(value: unknown): ProEntitlementSource | null {
  return value === "paid" || value === "gifted" || value === "admin_granted" ? value : null;
}

function mapEntitlementRow(row: Record<string, unknown>): SpecialistProEntitlementRow | null {
  const specialistId = typeof row.specialist_id === "string" ? row.specialist_id : null;
  const source = parseEntitlementSource(row.source);
  if (!specialistId || !source) return null;
  return {
    specialist_id: specialistId,
    source,
    is_active: row.is_active === true,
    granted_at: typeof row.granted_at === "string" ? row.granted_at : new Date(0).toISOString(),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
  };
}

export function buildPaidProEntitlementMetadata(
  input: GrantPaidProEntitlementInput,
  recordedAt: string,
): PaidProEntitlementMetadata {
  return {
    plan_code: "premium",
    plan_payment_id: input.planPaymentId,
    ...(input.stripeCheckoutSessionId
      ? { stripe_checkout_session_id: input.stripeCheckoutSessionId }
      : {}),
    last_recorded_at: recordedAt,
  };
}

export function mergeNonDestructivePremiumPaymentMetadata(
  existing: Record<string, unknown> | null,
  payment: PaidProEntitlementMetadata,
): Record<string, unknown> {
  const base = existing ? { ...existing } : {};
  const history = Array.isArray(base.premium_payment_history)
    ? [...(base.premium_payment_history as unknown[])]
    : [];
  history.push(payment);
  return {
    ...base,
    last_premium_payment: payment,
    premium_payment_history: history.slice(-10),
  };
}

export function mergePaidProEntitlementMetadata(
  existing: Record<string, unknown> | null,
  payment: PaidProEntitlementMetadata,
): Record<string, unknown> {
  const base = existing ? { ...existing } : {};
  return {
    ...base,
    plan_code: payment.plan_code,
    plan_payment_id: payment.plan_payment_id,
    ...(payment.stripe_checkout_session_id
      ? { stripe_checkout_session_id: payment.stripe_checkout_session_id }
      : {}),
    last_premium_payment: payment,
    last_recorded_at: payment.last_recorded_at,
  };
}

async function loadEntitlementRow(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<SpecialistProEntitlementRow | null> {
  const { data, error } = await supabase
    .from("specialist_pro_entitlements")
    .select(ENTITLEMENT_SELECT)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error?.code === "42P01" || error?.message?.includes("specialist_pro_entitlements")) {
    return null;
  }
  if (error) {
    console.error("[proPage/paid-sync] entitlement lookup failed", error);
    throw error;
  }

  return data ? mapEntitlementRow(data as Record<string, unknown>) : null;
}

export async function grantPaidProEntitlement(
  supabase: SupabaseClient,
  specialistId: string,
  input: GrantPaidProEntitlementInput,
): Promise<GrantPaidProEntitlementResult> {
  const now = new Date().toISOString();
  const paymentMetadata = buildPaidProEntitlementMetadata(input, now);

  try {
    const existing = await loadEntitlementRow(supabase, specialistId);

    if (!existing) {
      const { error } = await supabase.from("specialist_pro_entitlements").insert({
        specialist_id: specialistId,
        source: "paid",
        is_active: true,
        granted_at: now,
        metadata: paymentMetadata,
        created_at: now,
        updated_at: now,
      });
      if (error) {
        console.error("[proPage/paid-sync] grant insert failed", error);
        return { ok: false, retryable: true, code: "pro_entitlement_grant_failed" };
      }
      return { ok: true, outcome: "granted" };
    }

    if (existing.source === "gifted" || existing.source === "admin_granted") {
      if (!existing.is_active) {
        console.error(
          "[proPage/paid-sync] premium_payment_conflicts_with_inactive_administrative_entitlement",
          {
            specialistId,
            source: existing.source,
            planPaymentId: input.planPaymentId,
            stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
          },
        );
        return {
          ok: false,
          retryable: false,
          code: "pro_entitlement_administrative_inactive_conflict",
        };
      }

      const mergedMetadata = mergeNonDestructivePremiumPaymentMetadata(
        existing.metadata,
        paymentMetadata,
      );
      const metadataChanged = JSON.stringify(mergedMetadata) !== JSON.stringify(existing.metadata ?? {});
      if (metadataChanged) {
        const { error } = await supabase
          .from("specialist_pro_entitlements")
          .update({ metadata: mergedMetadata, updated_at: now })
          .eq("specialist_id", specialistId)
          .in("source", ["gifted", "admin_granted"]);
        if (error) {
          console.error("[proPage/paid-sync] non-paid metadata merge failed", error);
          return { ok: false, retryable: true, code: "pro_entitlement_grant_failed" };
        }
      }
      return { ok: true, outcome: "preserved_non_paid" };
    }

    if (existing.source === "paid") {
      if (existing.is_active) {
        const mergedMetadata = mergePaidProEntitlementMetadata(existing.metadata, paymentMetadata);
        const metadataChanged =
          JSON.stringify(mergedMetadata) !== JSON.stringify(existing.metadata ?? {});
        if (metadataChanged) {
          const { error } = await supabase
            .from("specialist_pro_entitlements")
            .update({ metadata: mergedMetadata, updated_at: now })
            .eq("specialist_id", specialistId)
            .eq("source", "paid");
          if (error) {
            console.error("[proPage/paid-sync] paid metadata refresh failed", error);
            return { ok: false, retryable: true, code: "pro_entitlement_grant_failed" };
          }
        }
        return { ok: true, outcome: "already_active" };
      }

      const { error } = await supabase
        .from("specialist_pro_entitlements")
        .update({
          is_active: true,
          granted_at: now,
          metadata: mergePaidProEntitlementMetadata(existing.metadata, paymentMetadata),
          updated_at: now,
        })
        .eq("specialist_id", specialistId)
        .eq("source", "paid");

      if (error) {
        console.error("[proPage/paid-sync] paid reactivation failed", error);
        return { ok: false, retryable: true, code: "pro_entitlement_grant_failed" };
      }
      return { ok: true, outcome: "reactivated" };
    }

    return { ok: false, retryable: false, code: "pro_entitlement_invalid_source" };
  } catch {
    return { ok: false, retryable: true, code: "pro_entitlement_grant_failed" };
  }
}

export async function deactivatePaidProEntitlement(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<DeactivatePaidProEntitlementResult> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("specialist_pro_entitlements")
    .update({ is_active: false, updated_at: now })
    .eq("specialist_id", specialistId)
    .eq("source", "paid")
    .eq("is_active", true)
    .select("specialist_id")
    .maybeSingle();

  if (error?.code === "42P01" || error?.message?.includes("specialist_pro_entitlements")) {
    return { ok: true, outcome: "noop" };
  }
  if (error) {
    console.error("[proPage/paid-sync] deactivate failed", error);
    return { ok: false, retryable: true, code: "pro_entitlement_deactivate_failed" };
  }

  return { ok: true, outcome: data ? "deactivated" : "noop" };
}
