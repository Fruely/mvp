import type { PaidPlanCode } from "./plans";
import { isPurchasablePlanCode } from "./planCatalog";

export const PLAN_PAYMENT_HISTORY_SELECT =
  "id, plan_code, status, provider, currency, gross_amount_cents, discount_amount_cents, net_amount_cents, period_months, paid_at, created_at, period_end_at";

export const PLAN_PAYMENT_HISTORY_LIMIT = 50;

export type PlanPaymentHistoryRow = {
  id: string;
  plan_code: string;
  status: string;
  provider: string;
  currency: string;
  gross_amount_cents: number;
  discount_amount_cents: number;
  net_amount_cents: number;
  period_months: number;
  paid_at: string | null;
  created_at: string;
  period_end_at: string | null;
};

export type PlanPaymentHistoryItem = {
  id: string;
  plan_code: PaidPlanCode;
  status: string;
  provider: string;
  currency: string;
  amount_cents: number;
  gross_amount_cents: number;
  discount_amount_cents: number;
  period_months: number;
  paid_at: string | null;
  created_at: string;
  period_end_at: string | null;
  invoice_available: false;
};

/**
 * Specialist invoices are not stored. plan_payments is the payment ledger.
 * Never synthesize a PDF/document from these rows.
 */
export function mapPlanPaymentHistoryItem(
  row: PlanPaymentHistoryRow,
): PlanPaymentHistoryItem | null {
  if (!row?.id || typeof row.id !== "string") {
    return null;
  }
  if (!isPurchasablePlanCode(row.plan_code)) {
    return null;
  }
  if (typeof row.created_at !== "string" || !row.created_at) {
    return null;
  }

  return {
    id: row.id,
    plan_code: row.plan_code,
    status: typeof row.status === "string" ? row.status : "pending",
    provider: typeof row.provider === "string" ? row.provider : "stripe",
    currency: typeof row.currency === "string" ? row.currency : "eur",
    amount_cents: Number(row.net_amount_cents) || 0,
    gross_amount_cents: Number(row.gross_amount_cents) || 0,
    discount_amount_cents: Number(row.discount_amount_cents) || 0,
    period_months: Number(row.period_months) || 1,
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    created_at: row.created_at,
    period_end_at: typeof row.period_end_at === "string" ? row.period_end_at : null,
    invoice_available: false,
  };
}

export function mapPlanPaymentHistoryItems(rows: unknown): PlanPaymentHistoryItem[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row) => mapPlanPaymentHistoryItem(row as PlanPaymentHistoryRow))
    .filter((item): item is PlanPaymentHistoryItem => item !== null);
}
