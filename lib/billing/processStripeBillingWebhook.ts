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
import {
  processStripeWebhookEventForPlanPayments,
  shouldFinishPlanPaymentDeferredWithoutHttpRetry,
  shouldMarkPlanPaymentBillingEventSkipped,
  shouldRetryPlanPaymentWebhook,
  type PlanPaymentWebhookResult,
} from "@/lib/billing/processPlanPaymentWebhook";
import {
  processStripeWebhookEventForSubscriptions,
  shouldMarkSubscriptionBillingEventSkipped,
  shouldRetrySubscriptionBillingWebhook,
  type SubscriptionWebhookResult,
} from "@/lib/billing/processStripeSubscriptionWebhook";

export type StripeBillingWebhookProcessResult = {
  eventType: string;
  partner: StripeWebhookProcessResult;
  planPayment: PlanPaymentWebhookResult;
  promoted: PromotedAccessWebhookResult;
  subscription: SubscriptionWebhookResult;
};

export async function processStripeBillingWebhook(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<StripeBillingWebhookProcessResult> {
  const partner = await processStripeWebhookEventForPartners(supabase, event);
  const planPayment = await processStripeWebhookEventForPlanPayments(supabase, event);
  const promoted = await processStripeWebhookEventForPromotedAccess(supabase, event);
  const subscription = await processStripeWebhookEventForSubscriptions(supabase, event);
  return { eventType: event.type, partner, planPayment, promoted, subscription };
}

export function shouldMarkBillingEventSkipped(result: StripeBillingWebhookProcessResult): boolean {
  return (
    shouldMarkPartnerBillingEventSkipped(result.partner) &&
    shouldMarkPlanPaymentBillingEventSkipped(result.planPayment) &&
    shouldMarkPromotedBillingEventSkipped(result.promoted) &&
    shouldMarkSubscriptionBillingEventSkipped(result.subscription)
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
  return (
    shouldRetryPlanPaymentWebhook(result.planPayment) ||
    result.promoted.outcome === "retryable_failure" ||
    shouldRetrySubscriptionBillingWebhook(result.subscription)
  );
}

export function shouldFinishBillingEventDeferredWithoutHttpRetry(
  result: StripeBillingWebhookProcessResult,
): boolean {
  return shouldFinishPlanPaymentDeferredWithoutHttpRetry(result.planPayment);
}
