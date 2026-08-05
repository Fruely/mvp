import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";
import { getSignupBindingForCheckout } from "@/lib/billing/promotedAccessData";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  resolvePromotedRequestAccess,
  type PromotedPaymentDisplayState,
  type PromotedRequestAccessDecision,
} from "@/lib/serviceRequests/promotedRequestAccess";
import {
  PROMOTED_REQUEST_GRANT_PAGE_SELECT,
  PROMOTED_REQUEST_PAYMENT_PAGE_SELECT,
  PROMOTED_REQUEST_PROMOTION_PUBLIC_SELECT,
  PROMOTED_REQUEST_PROMOTION_UNLOCK_SELECT,
  PROMOTED_REQUEST_SERVICE_REQUEST_UNLOCK_SELECT,
} from "@/lib/serviceRequests/promotedRequestConstants";

export type PromotedRequestUnlockedDetails = {
  description: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  category_id: string | null;
  urgency: string;
  created_at: string;
  city: string | null;
  postal_code: string | null;
  work_format: string | null;
};

export type PromotedRequestPageModel =
  | { view: "unavailable" }
  | {
      view: "locked" | "closed_locked" | "processing";
      publicTitle: string;
      publicSummary: string;
      promotionStatus: string;
      paymentState: PromotedPaymentDisplayState;
      showPayCta: boolean;
    }
  | {
      view: "unlocked";
      accessSource: "payment" | "subscription";
      publicTitle: string;
      publicSummary: string;
      promotionStatus: string;
      details: PromotedRequestUnlockedDetails;
    };

function promotionSnapshot(row: Record<string, unknown>) {
  return {
    public_title: String(row.public_title ?? ""),
    public_summary: String(row.public_summary ?? ""),
    status: String(row.status ?? ""),
  };
}

async function loadPromotionPublic(
  supabase: SupabaseClient,
  promotionId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("service_request_promotions")
    .select(PROMOTED_REQUEST_PROMOTION_PUBLIC_SELECT)
    .eq("id", promotionId)
    .maybeSingle();

  if (error) {
    throw new Error("promotion_lookup_failed");
  }

  return (data as Record<string, unknown> | null) ?? null;
}

async function loadAccessGrant(
  supabase: SupabaseClient,
  input: { specialistId: string; promotionId: string },
) {
  const { data, error } = await supabase
    .from("promoted_request_access_grants")
    .select(PROMOTED_REQUEST_GRANT_PAGE_SELECT)
    .eq("specialist_id", input.specialistId)
    .eq("promotion_id", input.promotionId)
    .maybeSingle();

  if (error) {
    throw new Error("access_grant_lookup_failed");
  }

  return (data as { revoked_at: string | null } | null) ?? null;
}

async function loadLatestPayment(
  supabase: SupabaseClient,
  input: { specialistId: string; promotionId: string },
) {
  const { data, error } = await supabase
    .from("promoted_request_payments")
    .select(PROMOTED_REQUEST_PAYMENT_PAGE_SELECT)
    .eq("specialist_id", input.specialistId)
    .eq("promotion_id", input.promotionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("payment_lookup_failed");
  }

  return (data as { status: string } | null) ?? null;
}

async function loadUnlockedServiceRequest(
  supabase: SupabaseClient,
  serviceRequestId: string,
): Promise<PromotedRequestUnlockedDetails | null> {
  const { data, error } = await supabase
    .from("service_requests")
    .select(PROMOTED_REQUEST_SERVICE_REQUEST_UNLOCK_SELECT)
    .eq("id", serviceRequestId)
    .maybeSingle();

  if (error) {
    throw new Error("service_request_lookup_failed");
  }

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    description: String(row.description ?? ""),
    client_name: String(row.client_name ?? ""),
    client_email: typeof row.client_email === "string" ? row.client_email : null,
    client_phone: typeof row.client_phone === "string" ? row.client_phone : null,
    category_id: typeof row.category_id === "string" ? row.category_id : null,
    urgency: String(row.urgency ?? ""),
    created_at: String(row.created_at ?? ""),
    city: typeof row.city === "string" ? row.city : null,
    postal_code: typeof row.postal_code === "string" ? row.postal_code : null,
    work_format: typeof row.work_format === "string" ? row.work_format : null,
  };
}

function lockedModelFromDecision(
  decision: Extract<
    PromotedRequestAccessDecision,
    { kind: "locked" | "closed_locked" | "processing" }
  >,
): PromotedRequestPageModel {
  return {
    view: decision.kind === "processing" ? "processing" : decision.kind,
    publicTitle: decision.promotion.public_title,
    publicSummary: decision.promotion.public_summary,
    promotionStatus: decision.promotion.status,
    paymentState: decision.kind === "processing" ? "processing" : decision.paymentState,
    showPayCta: decision.kind === "processing" ? false : decision.showPayCta,
  };
}

export async function loadPromotedRequestPageData(
  supabase: SupabaseClient,
  input: { specialistId: string; userId: string },
): Promise<PromotedRequestPageModel> {
  let binding;
  try {
    binding = await getSignupBindingForCheckout(supabase, input.specialistId);
  } catch {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  if (!binding || binding.user_id !== input.userId || binding.specialist_id !== input.specialistId) {
    console.info("[promoted-request] promoted_request_not_found");
    return { view: "unavailable" };
  }

  let promotionRow: Record<string, unknown> | null;
  try {
    promotionRow = await loadPromotionPublic(supabase, binding.promotion_id);
  } catch {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  if (!promotionRow) {
    console.info("[promoted-request] promoted_request_not_found");
    return { view: "unavailable" };
  }

  const plan = await getSpecialistPlanForDashboard(supabase, input.specialistId);
  const entitlements = resolveSpecialistEntitlements(plan);

  let grant;
  let latestPayment;
  try {
    [grant, latestPayment] = await Promise.all([
      loadAccessGrant(supabase, {
        specialistId: input.specialistId,
        promotionId: binding.promotion_id,
      }),
      loadLatestPayment(supabase, {
        specialistId: input.specialistId,
        promotionId: binding.promotion_id,
      }),
    ]);
  } catch {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion: promotionSnapshot(promotionRow),
    grant,
    effectivePaidPlan: entitlements.effectivePaidPlan,
    latestPayment,
  });

  if (decision.kind === "unavailable") {
    console.info("[promoted-request] promoted_request_not_found");
    return { view: "unavailable" };
  }

  if (decision.kind === "locked" || decision.kind === "closed_locked" || decision.kind === "processing") {
    if (decision.kind === "closed_locked") {
      console.info("[promoted-request] promoted_request_closed");
    } else {
      console.info("[promoted-request] promoted_request_locked");
    }
    return lockedModelFromDecision(decision);
  }

  const { data: promotionUnlock, error: promotionUnlockError } = await supabase
    .from("service_request_promotions")
    .select(PROMOTED_REQUEST_PROMOTION_UNLOCK_SELECT)
    .eq("id", binding.promotion_id)
    .maybeSingle();

  if (promotionUnlockError || !promotionUnlock?.service_request_id) {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  let details: PromotedRequestUnlockedDetails | null;
  try {
    details = await loadUnlockedServiceRequest(
      supabase,
      promotionUnlock.service_request_id as string,
    );
  } catch {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  if (!details) {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  if (decision.kind !== "unlocked") {
    console.info("[promoted-request] promoted_request_data_error");
    return { view: "unavailable" };
  }

  if (decision.source === "payment") {
    console.info("[promoted-request] promoted_request_unlocked_payment");
  } else {
    console.info("[promoted-request] promoted_request_unlocked_subscription");
  }

  return {
    view: "unlocked",
    accessSource: decision.source,
    publicTitle: decision.promotion.public_title,
    publicSummary: decision.promotion.public_summary,
    promotionStatus: decision.promotion.status,
    details,
  };
}
