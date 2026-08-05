import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  createCommissionFromStripeInvoice,
  reverseCommissionForInvalidPayment,
} from "@/lib/partners/commissions";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  confirmFirstPaidSubscriptionInvoice,
  extractSpecialistIdFromMetadata,
  precheckStripeInvoiceForCommission,
  stripeId,
  sumInvoiceTaxCents,
  type StripeInvoiceLike,
} from "@/lib/billing/stripeInvoiceEligibility";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type PartnerCommissionWebhookResult =
  | { outcome: "commission_created"; commissionId: string }
  | { outcome: "commission_exists" }
  | { outcome: "skipped"; reason: string }
  | { outcome: "no_commission"; reason: string };

async function resolveSpecialistId(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<string | null> {
  const fromInvoice = extractSpecialistIdFromMetadata(invoice.metadata ?? undefined);
  if (fromInvoice) return fromInvoice;

  const customerId = stripeId(invoice.customer);
  if (customerId) {
    const { data: row } = await supabase
      .from("billing_customers")
      .select("specialist_id")
      .eq("provider", "stripe")
      .eq("provider_customer_id", customerId)
      .maybeSingle();
    if (row?.specialist_id) return row.specialist_id as string;
  }

  const stripe = getStripeClient();
  if (!stripe) return null;

  const subId = stripeId(invoice.subscription);
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const fromSub = extractSpecialistIdFromMetadata(sub.metadata ?? undefined);
      if (fromSub) return fromSub;
    } catch {
      // fall through
    }
  }

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        const fromCustomer = extractSpecialistIdFromMetadata(customer.metadata ?? undefined);
        if (fromCustomer) return fromCustomer;
      }
    } catch {
      // fall through
    }
  }

  return null;
}

async function resolveProviderFeeCents(chargeId: string): Promise<number | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ["balance_transaction"],
  });

  const bt = charge.balance_transaction;
  if (!bt || typeof bt === "string") return null;
  const fee = bt.fee;
  return Number.isInteger(fee) && fee >= 0 ? fee : null;
}

async function countPaidInvoicesForSubscription(subscriptionId: string): Promise<number> {
  const stripe = getStripeClient();
  if (!stripe) return 0;

  const list = await stripe.invoices.list({
    subscription: subscriptionId,
    status: "paid",
    limit: 2,
  });
  return list.data.length;
}

async function evaluateInvoiceEligibility(
  invoice: Stripe.Invoice
): Promise<{ eligible: true; billingInterval: "month" } | { eligible: false; reason: string }> {
  const pre = precheckStripeInvoiceForCommission(invoice as StripeInvoiceLike);
  if ("needsFirstPaidCheck" in pre && pre.needsFirstPaidCheck) {
    const subId = stripeId(invoice.subscription);
    if (!subId) return { eligible: false, reason: "missing_subscription_id" };
    const count = await countPaidInvoicesForSubscription(subId);
    return confirmFirstPaidSubscriptionInvoice(count);
  }
  if (pre.eligible === true) return pre;
  if (pre.eligible === false) return pre;
  return { eligible: false, reason: "unknown_precheck" };
}

/**
 * Canonical partner commission path for first paid monthly subscription invoice.
 * Called from invoice.paid webhook handler only.
 */
export async function handleStripeInvoicePaidForPartnerCommission(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<PartnerCommissionWebhookResult> {
  const eligibility = await evaluateInvoiceEligibility(invoice);
  if (!eligibility.eligible) {
    return { outcome: "skipped", reason: eligibility.reason };
  }

  const specialistId = await resolveSpecialistId(supabase, invoice);
  if (!specialistId) {
    return { outcome: "skipped", reason: "specialist_id_not_resolved" };
  }

  const chargeId = stripeId(invoice.charge);
  if (!chargeId) {
    return { outcome: "skipped", reason: "missing_charge_id" };
  }

  const providerFeeCents = await resolveProviderFeeCents(chargeId);
  if (providerFeeCents === null) {
    throw new PartnerDomainError("provider_fee_not_available", 503);
  }

  const grossAmountCents = invoice.amount_paid ?? 0;
  const vatAmountCents = sumInvoiceTaxCents(invoice as StripeInvoiceLike);
  const paidAtUnix = invoice.status_transitions?.paid_at;
  const paidAt = paidAtUnix
    ? new Date(paidAtUnix * 1000).toISOString()
    : new Date().toISOString();

  try {
    const result = await createCommissionFromStripeInvoice(supabase, {
      specialistId,
      externalPaymentReference: invoice.id,
      paidAt,
      grossAmountCents,
      vatAmountCents,
      providerFeeCents,
      billingInterval: "month",
      currency: (invoice.currency ?? "eur").toUpperCase(),
    });

    if (result.created) {
      return { outcome: "commission_created", commissionId: result.commission.id };
    }
    return { outcome: "commission_exists" };
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      if (err.code === "attribution_not_found") {
        return { outcome: "skipped", reason: "attribution_not_found" };
      }
      if (err.code === "commission_already_exists") {
        return { outcome: "commission_exists" };
      }
      if (err.code === "self_referral") {
        return { outcome: "skipped", reason: "self_referral" };
      }
      if (err.code === "annual_plan_not_eligible") {
        return { outcome: "skipped", reason: "annual_plan_not_eligible" };
      }
      throw err;
    }
    throw err;
  }
}

/** invoice.payment_succeeded reconciliation — no-op if invoice.paid already processed commission. */
export async function handleStripeInvoicePaymentSucceededReconcile(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<PartnerCommissionWebhookResult> {
  const { data: existing } = await supabase
    .from("partner_commissions")
    .select("id")
    .eq("source_type", "stripe_invoice_payment_succeeded")
    .eq("source_event_id", invoice.id)
    .maybeSingle();

  if (existing?.id) {
    return { outcome: "commission_exists" };
  }

  return handleStripeInvoicePaidForPartnerCommission(supabase, invoice);
}

export async function reversePartnerCommissionForStripeInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
  paymentStatus: "refunded" | "reversed" | "disputed" | "cancelled",
  actorLabel = "stripe_webhook"
): Promise<PartnerCommissionWebhookResult> {
  const { data: commission } = await supabase
    .from("partner_commissions")
    .select("id, status")
    .eq("source_type", "stripe_invoice_payment_succeeded")
    .eq("source_event_id", invoiceId)
    .maybeSingle();

  if (!commission) {
    return { outcome: "no_commission", reason: "commission_not_found_for_invoice" };
  }

  if (commission.status === "reversed") {
    return { outcome: "commission_exists" };
  }

  await reverseCommissionForInvalidPayment(supabase, {
    commissionId: commission.id as string,
    paymentStatus,
    actorLabel,
    reason: `stripe_${paymentStatus}_before_or_at_validation`,
  });

  return { outcome: "commission_created", commissionId: commission.id as string };
}

export async function reversePartnerCommissionForCharge(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  paymentStatus: "refunded" | "disputed"
): Promise<PartnerCommissionWebhookResult> {
  const invoiceId =
    typeof charge.invoice === "string"
      ? charge.invoice
      : charge.invoice && typeof charge.invoice === "object"
        ? charge.invoice.id
        : null;

  if (!invoiceId) {
    return { outcome: "no_commission", reason: "charge_without_invoice" };
  }

  return reversePartnerCommissionForStripeInvoice(supabase, invoiceId, paymentStatus);
}
