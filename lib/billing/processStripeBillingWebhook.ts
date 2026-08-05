import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  processStripeWebhookEventForPartners,
  shouldMarkPartnerBillingEventSkipped,
  type StripeWebhookProcessResult,
} from "@/lib/billing/processStripePartnerWebhook";
import {
  processStripeWebhookEventForPromotedAccess,
  type PromotedAccessWebhookResult,
} from "@/lib/billing/processPromotedAccessWebhook";

export type StripeBillingWebhookProcessResult = {
  eventType: string;
  partner: StripeWebhookProcessResult;
  promoted: PromotedAccessWebhookResult;
};

export async function processStripeBillingWebhook(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<StripeBillingWebhookProcessResult> {
  const partner = await processStripeWebhookEventForPartners(supabase, event);
  const promoted = await processStripeWebhookEventForPromotedAccess(supabase, event);
  return { eventType: event.type, partner, promoted };
}

export function shouldMarkBillingEventSkipped(result: StripeBillingWebhookProcessResult): boolean {
  return (
    shouldMarkPartnerBillingEventSkipped(result.partner) &&
    shouldMarkPromotedBillingEventSkipped(result.promoted)
  );
}

export function shouldMarkPromotedBillingEventSkipped(
  promoted: PromotedAccessWebhookResult,
): boolean {
  return (
    promoted.outcome === "ignored" ||
    promoted.outcome === "pending" ||
    promoted.outcome === "validation_failed"
  );
}

export function shouldRetryBillingWebhook(result: StripeBillingWebhookProcessResult): boolean {
  return result.promoted.outcome === "retryable_failure";
}
