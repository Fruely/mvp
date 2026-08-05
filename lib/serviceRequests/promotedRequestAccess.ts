import type { PromotionStatus } from "@/lib/serviceRequests/promotionConstants";

export type PromotedPaymentDisplayState =
  | "none"
  | "pending"
  | "failed"
  | "expired"
  | "refunded"
  | "disputed"
  | "processing";

export type PromotedRequestPromotionSnapshot = {
  public_title: string;
  public_summary: string;
  status: PromotionStatus | string;
};

export type PromotedRequestAccessGrantSnapshot = {
  revoked_at: string | null;
} | null;

export type PromotedRequestPaymentSnapshot = {
  status: string;
} | null;

export type PromotedRequestAccessDecision =
  | { kind: "unavailable" }
  | {
      kind: "unlocked";
      source: "payment" | "subscription";
      promotion: PromotedRequestPromotionSnapshot;
    }
  | {
      kind: "processing";
      promotion: PromotedRequestPromotionSnapshot;
    }
  | {
      kind: "locked" | "closed_locked";
      promotion: PromotedRequestPromotionSnapshot;
      paymentState: PromotedPaymentDisplayState;
      showPayCta: boolean;
    };

export function mapPromotedPaymentDisplayState(
  status: string | null | undefined,
): PromotedPaymentDisplayState {
  if (!status) return "none";
  if (status === "pending") return "pending";
  if (status === "failed") return "failed";
  if (status === "expired") return "expired";
  if (status === "refunded") return "refunded";
  if (status === "disputed") return "disputed";
  if (status === "paid") return "processing";
  return "none";
}

const PAY_CTA_BLOCKED_STATES = new Set<PromotedPaymentDisplayState>([
  "processing",
  "pending",
  "refunded",
  "disputed",
]);

/** Pure server-authoritative access decision — no query params or payment status alone as proof. */
export function resolvePromotedRequestAccess(input: {
  bindingPresent: boolean;
  promotion: PromotedRequestPromotionSnapshot | null;
  grant: PromotedRequestAccessGrantSnapshot;
  effectivePaidPlan: string | null;
  latestPayment: PromotedRequestPaymentSnapshot;
}): PromotedRequestAccessDecision {
  if (!input.bindingPresent || !input.promotion) {
    return { kind: "unavailable" };
  }

  const hasActiveGrant = Boolean(input.grant && input.grant.revoked_at == null);

  if (hasActiveGrant) {
    return { kind: "unlocked", source: "payment", promotion: input.promotion };
  }

  if (input.effectivePaidPlan !== null) {
    return { kind: "unlocked", source: "subscription", promotion: input.promotion };
  }

  const isClosed = input.promotion.status === "closed";
  const paymentState = mapPromotedPaymentDisplayState(input.latestPayment?.status);

  if (paymentState === "processing") {
    return { kind: "processing", promotion: input.promotion };
  }

  if (isClosed) {
    return {
      kind: "closed_locked",
      promotion: input.promotion,
      paymentState,
      showPayCta: false,
    };
  }

  const showPayCta = !PAY_CTA_BLOCKED_STATES.has(paymentState);

  return {
    kind: "locked",
    promotion: input.promotion,
    paymentState,
    showPayCta,
  };
}
