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
  processStripeWebhookEventForPromotedReservation,
  type PromotedReservationWebhookResult,
} from "@/lib/billing/processPromotedReservationWebhook";
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
  promotedReservation: PromotedReservationWebhookResult;
  subscription: SubscriptionWebhookResult;
};

export async function processStripeBillingWebhook(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<StripeBillingWebhookProcessResult> {
  const partner = await processStripeWebhookEventForPartners(supabase, event);
  const planPayment = await processStripeWebhookEventForPlanPayments(supabase, event);
  const promoted = await processStripeWebhookEventForPromotedAccess(supabase, event);
  const promotedReservation = await processStripeWebhookEventForPromotedReservation(
    supabase,
    event,
  );
  const subscription = await processStripeWebhookEventForSubscriptions(supabase, event);
  return {
    eventType: event.type,
    partner,
    planPayment,
    promoted,
    promotedReservation,
    subscription,
  };
}

export function shouldMarkBillingEventSkipped(result: StripeBillingWebhookProcessResult): boolean {
  return (
    shouldMarkPartnerBillingEventSkipped(result.partner) &&
    shouldMarkPlanPaymentBillingEventSkipped(result.planPayment) &&
    shouldMarkPromotedBillingEventSkipped(result.promoted) &&
    shouldMarkPromotedReservationBillingEventSkipped(result.promotedReservation) &&
    shouldMarkSubscriptionBillingEventSkipped(result.subscription)
  );
}

export function shouldMarkPromotedReservationBillingEventSkipped(
  promotedReservation: PromotedReservationWebhookResult,
): boolean {
  return (
    promotedReservation.outcome === "ignored" ||
    promotedReservation.outcome === "validation_failed"
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
    result.promotedReservation.outcome === "retryable_failure" ||
    shouldRetrySubscriptionBillingWebhook(result.subscription)
  );
}

export function shouldFinishBillingEventDeferredWithoutHttpRetry(
  result: StripeBillingWebhookProcessResult,
): boolean {
  return shouldFinishPlanPaymentDeferredWithoutHttpRetry(result.planPayment);
}
