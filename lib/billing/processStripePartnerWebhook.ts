import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  handleStripeInvoicePaidForPartnerCommission,
  handleStripeInvoicePaymentSucceededReconcile,
  reversePartnerCommissionForCharge,
  reversePartnerCommissionForStripeInvoice,
  type PartnerCommissionWebhookResult,
} from "@/lib/billing/stripePartnerCommission";

export type StripeWebhookProcessResult = {
  eventType: string;
  partnerCommission: PartnerCommissionWebhookResult | null;
  skippedReason?: string;
};

/** Canonical event: invoice.paid — creates pending commission on first monthly payment. */
const COMMISSION_CREATE_EVENT = "invoice.paid";

/** Reconciliation only — delegates to invoice.paid logic if commission missing. */
const COMMISSION_RECONCILE_EVENT = "invoice.payment_succeeded";

const REVERSAL_EVENTS: Record<string, "refunded" | "disputed" | "cancelled"> = {
  "charge.refunded": "refunded",
  "charge.dispute.created": "disputed",
  "invoice.voided": "cancelled",
};

export async function processStripeWebhookEventForPartners(
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<StripeWebhookProcessResult> {
  const type = event.type;

  if (type === COMMISSION_CREATE_EVENT) {
    const invoice = event.data.object as Stripe.Invoice;
    const partnerCommission = await handleStripeInvoicePaidForPartnerCommission(
      supabase,
      invoice
    );
    return { eventType: type, partnerCommission };
  }

  if (type === COMMISSION_RECONCILE_EVENT) {
    const invoice = event.data.object as Stripe.Invoice;
    const partnerCommission = await handleStripeInvoicePaymentSucceededReconcile(
      supabase,
      invoice
    );
    return { eventType: type, partnerCommission };
  }

  const reversalStatus = REVERSAL_EVENTS[type];
  if (reversalStatus) {
    if (type === "invoice.voided") {
      const invoice = event.data.object as Stripe.Invoice;
      const partnerCommission = await reversePartnerCommissionForStripeInvoice(
        supabase,
        invoice.id,
        reversalStatus
      );
      return { eventType: type, partnerCommission };
    }

    const charge = event.data.object as Stripe.Charge;
    const partnerCommission = await reversePartnerCommissionForCharge(
      supabase,
      charge,
      reversalStatus === "disputed" ? "disputed" : "refunded"
    );
    return { eventType: type, partnerCommission };
  }

  return {
    eventType: type,
    partnerCommission: null,
    skippedReason: "event_type_not_handled_for_partners",
  };
}

/** Event types this webhook handler understands for partner commission side-effects. */
export const PARTNER_COMMISSION_STRIPE_EVENT_TYPES = [
  COMMISSION_CREATE_EVENT,
  COMMISSION_RECONCILE_EVENT,
  "charge.refunded",
  "charge.dispute.created",
  "invoice.voided",
] as const;

export function shouldMarkBillingEventSkipped(result: StripeWebhookProcessResult): boolean {
  return shouldMarkPartnerBillingEventSkipped(result);
}

export function shouldMarkPartnerBillingEventSkipped(
  result: StripeWebhookProcessResult,
): boolean {
  if (!result.partnerCommission) return true;
  if (result.partnerCommission.outcome === "skipped") return true;
  if (result.partnerCommission.outcome === "no_commission") return true;
  return false;
}
