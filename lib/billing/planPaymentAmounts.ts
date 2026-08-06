import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  PLAN_PAYMENT_GROSS_CENTS,
  PLAN_PAYMENT_PROMOTED_DISCOUNT_CENTS,
} from "@/lib/billing/planPaymentConstants";

export type PlanPaymentAmounts = {
  grossAmountCents: number;
  discountAmountCents: number;
  netAmountCents: number;
};

export function computePlanPaymentAmounts(input: {
  planCode: PaidPlanCode;
  applyPromotedCredit: boolean;
}): PlanPaymentAmounts {
  const grossAmountCents = PLAN_PAYMENT_GROSS_CENTS[input.planCode];
  const discountAmountCents = input.applyPromotedCredit
    ? PLAN_PAYMENT_PROMOTED_DISCOUNT_CENTS
    : 0;

  return {
    grossAmountCents,
    discountAmountCents,
    netAmountCents: grossAmountCents - discountAmountCents,
  };
}
