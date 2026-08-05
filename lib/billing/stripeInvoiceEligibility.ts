/** Minimal Stripe invoice shape for pure eligibility tests (no SDK import). */
export type StripeInvoiceLike = {
  id: string;
  status?: string | null;
  amount_paid?: number | null;
  billing_reason?: string | null;
  currency?: string | null;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  charge?: string | { id?: string } | null;
  lines?: {
    data?: Array<{
      price?: {
        recurring?: { interval?: string | null } | null;
      } | null;
    }>;
  } | null;
  total_tax_amounts?: Array<{ amount?: number | null }> | null;
  metadata?: Record<string, string> | null;
};

export type InvoiceEligibilityResult =
  | { eligible: true; billingInterval: "month" }
  | { eligible: false; reason: string };

const INELIGIBLE_BILLING_REASONS = new Set([
  "subscription_update",
  "subscription_threshold_warning",
  "manual",
  "upcoming",
  "quote_accept",
]);

/** Pure pre-check before async first-paid-invoice counting. */
export function precheckStripeInvoiceForCommission(
  invoice: StripeInvoiceLike
): InvoiceEligibilityResult | { eligible: false; reason: string; needsFirstPaidCheck: true } {
  if (invoice.status !== "paid") {
    return { eligible: false, reason: "invoice_not_paid" };
  }

  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) {
    return { eligible: false, reason: "zero_amount_paid" };
  }

  const reason = invoice.billing_reason ?? "unknown";
  if (INELIGIBLE_BILLING_REASONS.has(reason)) {
    return { eligible: false, reason: `billing_reason_${reason}` };
  }

  const interval = invoice.lines?.data?.[0]?.price?.recurring?.interval ?? null;
  if (interval === "year") {
    return { eligible: false, reason: "annual_interval" };
  }
  if (interval && interval !== "month") {
    return { eligible: false, reason: `interval_${interval}` };
  }

  if (reason === "subscription_create") {
    return { eligible: true, billingInterval: "month" };
  }

  // Post-trial first paid invoice may arrive as subscription_cycle — verify async.
  if (reason === "subscription_cycle") {
    return { eligible: false, reason: "needs_first_paid_check", needsFirstPaidCheck: true };
  }

  return { eligible: false, reason: `billing_reason_${reason}` };
}

/** After counting paid invoices for subscription: only first paid invoice qualifies. */
export function confirmFirstPaidSubscriptionInvoice(
  paidInvoiceCountForSubscription: number
): InvoiceEligibilityResult {
  if (paidInvoiceCountForSubscription <= 0) {
    return { eligible: false, reason: "no_paid_invoices" };
  }
  if (paidInvoiceCountForSubscription > 1) {
    return { eligible: false, reason: "renewal_not_first_payment" };
  }
  return { eligible: true, billingInterval: "month" };
}

export function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  return value.id?.trim() || null;
}

export function extractSpecialistIdFromMetadata(
  ...sources: Array<Record<string, string> | null | undefined>
): string | null {
  for (const meta of sources) {
    const id = meta?.specialist_id?.trim() || meta?.specialistId?.trim();
    if (id) return id;
  }
  return null;
}

export function sumInvoiceTaxCents(invoice: StripeInvoiceLike): number {
  const amounts = invoice.total_tax_amounts ?? [];
  let sum = 0;
  for (const row of amounts) {
    const n = row?.amount ?? 0;
    if (Number.isInteger(n) && n > 0) sum += n;
  }
  return sum;
}
