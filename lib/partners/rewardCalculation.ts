export type BillingInterval = "month" | "year";

export type PaymentFinancialFacts = {
  /** Gross amount Freuly actually received for this payment (integer cents). */
  grossAmountCents: number;
  /** Applicable Umsatzsteuer included in this payment; 0 under Kleinunternehmer. */
  vatAmountCents: number;
  /** Actual payment-provider transaction fee for this payment. */
  providerFeeCents: number;
  billingInterval: BillingInterval;
};

export type ComputedPartnerReward = {
  amountCents: number;
  grossAmountCents: number;
  vatAmountCents: number;
  providerFeeCents: number;
  billingInterval: BillingInterval;
};

export type PartnerRewardCalcResult =
  | { ok: true; reward: ComputedPartnerReward }
  | { ok: false; code: string; status?: number };

/**
 * Agreement v1.0 partner reward:
 * gross first monthly tariff received − applicable USt − actual provider fee.
 * Does not deduct Einkommensteuer, Gewerbesteuer, or operating costs.
 */
export function computePartnerRewardCents(input: PaymentFinancialFacts): PartnerRewardCalcResult {
  const { grossAmountCents, vatAmountCents, providerFeeCents, billingInterval } = input;

  if (billingInterval === "year") {
    return { ok: false, code: "annual_plan_not_eligible", status: 409 };
  }
  if (billingInterval !== "month") {
    return { ok: false, code: "invalid_billing_interval" };
  }

  for (const [label, value] of [
    ["gross", grossAmountCents],
    ["vat", vatAmountCents],
    ["fee", providerFeeCents],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      return { ok: false, code: `invalid_${label}_amount` };
    }
  }

  if (grossAmountCents <= 0) {
    return { ok: false, code: "invalid_gross_amount" };
  }
  if (vatAmountCents + providerFeeCents >= grossAmountCents) {
    return { ok: false, code: "reward_not_positive", status: 409 };
  }

  const amountCents = grossAmountCents - vatAmountCents - providerFeeCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, code: "reward_not_positive", status: 409 };
  }

  return {
    ok: true,
    reward: {
      amountCents,
      grossAmountCents,
      vatAmountCents,
      providerFeeCents,
      billingInterval,
    },
  };
}
