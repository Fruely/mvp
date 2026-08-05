import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { projectSpecialistPlanFromSubscription } from "@/lib/billing/projectSpecialistPlanFromSubscription";
import { resolveSubscriptionPlanCode } from "@/lib/billing/subscriptionPlanMapping";
import { syncBillingSubscription } from "@/lib/billing/syncBillingSubscription";
import {
  eventCreatedIso,
  resolveSpecialistIdForSubscription,
  SUBSCRIPTION_STRIPE_EVENT_TYPES,
  validateSubscriptionCheckoutSession,
} from "@/lib/billing/subscriptionWebhookValidation";
import { consumePromotedSubscriptionCredit } from "@/lib/billing/consumePromotedSubscriptionCredit";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { stripeId } from "@/lib/billing/stripeInvoiceEligibility";

export type SubscriptionWebhookOutcome =
  | "ignored"
  | "validation_failed"
  | "out_of_order"
  | "unknown_price"
  | "unknown_customer"
  | "specialist_mismatch"
  | "conflict"
  | "retryable_failure"
  | "synced";

export type SubscriptionWebhookResult = {
  outcome: SubscriptionWebhookOutcome;
  logCode: string;
};

const SUBSCRIPTION_EVENT_TYPES = new Set<string>(SUBSCRIPTION_STRIPE_EVENT_TYPES);

async function retrieveSubscription(
  subscription: string | Stripe.Subscription,
): Promise<Stripe.Subscription | null> {
  if (typeof subscription === "object" && subscription?.id) {
    return subscription;
  }

  const subscriptionId = stripeId(subscription);
  if (!subscriptionId) return null;

  const stripe = getStripeClient();
  if (!stripe) return null;

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

async function applySubscriptionLifecycle(
  supabase: SupabaseClient,
  input: {
    subscription: Stripe.Subscription;
    eventCreatedIso: string;
    metadataSpecialistId?: string | null;
  },
): Promise<SubscriptionWebhookResult> {
  const ownership = await resolveSpecialistIdForSubscription(
    supabase,
    input.subscription,
    input.metadataSpecialistId,
  );

  if (!ownership.ok) {
    const logCode =
      ownership.reason === "specialist_mismatch"
        ? "subscription_specialist_mismatch"
        : "subscription_unknown_customer";
    const outcome =
      ownership.reason === "specialist_mismatch" ? "specialist_mismatch" : "unknown_customer";
    console.info("[billing/subscription]", logCode);
    return { outcome, logCode };
  }

  const planResolution = resolveSubscriptionPlanCode(input.subscription);
  if (!planResolution.ok) {
    const logCode =
      planResolution.reason === "unknown_price"
        ? "subscription_unknown_price"
        : "subscription_validation_failed";
    const outcome =
      planResolution.reason === "unknown_price" ? "unknown_price" : "validation_failed";
    console.info("[billing/subscription]", logCode);
    return { outcome, logCode };
  }

  const syncResult = await syncBillingSubscription(supabase, {
    specialistId: ownership.specialistId,
    planCode: planResolution.planCode,
    priceId: planResolution.priceId,
    subscription: input.subscription,
    eventCreatedIso: input.eventCreatedIso,
  });

  if (syncResult.outcome === "out_of_order") {
    console.info("[billing/subscription] subscription_out_of_order");
    return { outcome: "out_of_order", logCode: "subscription_out_of_order" };
  }

  if (syncResult.outcome === "conflict") {
    console.info("[billing/subscription] subscription_conflict");
    return { outcome: "conflict", logCode: "subscription_conflict" };
  }

  if (syncResult.outcome === "retryable_failure") {
    console.info("[billing/subscription] subscription_retryable_failure");
    return { outcome: "retryable_failure", logCode: "subscription_retryable_failure" };
  }

  const projection = await projectSpecialistPlanFromSubscription(supabase, {
    specialistId: ownership.specialistId,
    planCode: planResolution.planCode,
    subscription: input.subscription,
  });

  if (projection === "retryable_failure") {
    console.info("[billing/subscription] subscription_projection_retryable_failure");
    return {
      outcome: "retryable_failure",
      logCode: "subscription_projection_retryable_failure",
    };
  }

  console.info("[billing/subscription] subscription_projection_synced");
  return { outcome: "synced", logCode: "subscription_projection_synced" };
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<SubscriptionWebhookResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const validated = validateSubscriptionCheckoutSession(session);
  if (!validated.ok) {
    console.info("[billing/subscription] subscription_event_ignored");
    return { outcome: "ignored", logCode: "subscription_event_ignored" };
  }

  const subscription = await retrieveSubscription(session.subscription as string | Stripe.Subscription);
  if (!subscription) {
    console.info("[billing/subscription] subscription_retryable_failure");
    return { outcome: "retryable_failure", logCode: "subscription_retryable_failure" };
  }

  const lifecycle = await applySubscriptionLifecycle(supabase, {
    subscription,
    eventCreatedIso: eventCreatedIso(event),
    metadataSpecialistId: validated.specialistId,
  });

  if (lifecycle.outcome !== "synced") {
    return lifecycle;
  }

  const creditResult = await consumePromotedSubscriptionCredit(supabase, {
    session,
    specialistId: validated.specialistId,
    planCode: validated.planCode,
    eventCreatedIso: eventCreatedIso(event),
  });

  if (
    creditResult.outcome === "no_credit_metadata" ||
    creditResult.outcome === "consumed" ||
    creditResult.outcome === "idempotent" ||
    creditResult.outcome === "source_invalid"
  ) {
    return lifecycle;
  }

  if (creditResult.outcome === "conflict") {
    return { outcome: "conflict", logCode: creditResult.logCode };
  }

  return { outcome: "retryable_failure", logCode: creditResult.logCode };
}

async function handleSubscriptionEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<SubscriptionWebhookResult> {
  const subscription = event.data.object as Stripe.Subscription;
  if (!subscription?.id) {
    console.info("[billing/subscription] subscription_validation_failed");
    return { outcome: "validation_failed", logCode: "subscription_validation_failed" };
  }

  return applySubscriptionLifecycle(supabase, {
    subscription,
    eventCreatedIso: eventCreatedIso(event),
  });
}

export async function processStripeWebhookEventForSubscriptions(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<SubscriptionWebhookResult> {
  if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    return { outcome: "ignored", logCode: "subscription_event_ignored" };
  }

  if (event.type === "checkout.session.completed") {
    return handleCheckoutSessionCompleted(supabase, event);
  }

  return handleSubscriptionEvent(supabase, event);
}

export function shouldMarkSubscriptionBillingEventSkipped(
  result: SubscriptionWebhookResult,
): boolean {
  return (
    result.outcome === "ignored" ||
    result.outcome === "validation_failed" ||
    result.outcome === "out_of_order" ||
    result.outcome === "unknown_customer" ||
    result.outcome === "specialist_mismatch" ||
    result.outcome === "unknown_price"
  );
}

export function shouldRetrySubscriptionBillingWebhook(
  result: SubscriptionWebhookResult,
): boolean {
  return result.outcome === "retryable_failure" || result.outcome === "conflict";
}
