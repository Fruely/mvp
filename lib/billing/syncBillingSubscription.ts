import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  CURRENT_BILLING_SUBSCRIPTION_STATUSES,
  isOutOfOrderProviderEvent,
  unixToIso,
} from "@/lib/billing/subscriptionWebhookValidation";
import { stripeId } from "@/lib/billing/stripeInvoiceEligibility";

export type BillingSubscriptionRow = {
  id: string;
  specialist_id: string;
  provider: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  provider_price_id: string;
  plan_code: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  last_provider_event_created_at: string | null;
};

export type SyncBillingSubscriptionResult =
  | { outcome: "inserted" | "updated" }
  | { outcome: "out_of_order" }
  | { outcome: "conflict" }
  | { outcome: "retryable_failure" };

function buildSubscriptionRowPayload(
  input: {
    specialistId: string;
    planCode: PaidPlanCode;
    priceId: string;
    subscription: Stripe.Subscription;
    eventCreatedIso: string;
  },
  preserveCreatedAt?: string,
) {
  const customerId = stripeId(input.subscription.customer);
  if (!customerId) return null;

  const ts = new Date().toISOString();
  return {
    specialist_id: input.specialistId,
    provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: input.subscription.id,
    provider_price_id: input.priceId,
    plan_code: input.planCode,
    status: input.subscription.status,
    cancel_at_period_end: input.subscription.cancel_at_period_end === true,
    current_period_start: unixToIso(input.subscription.current_period_start),
    current_period_end: unixToIso(input.subscription.current_period_end),
    trial_start: unixToIso(input.subscription.trial_start),
    trial_end: unixToIso(input.subscription.trial_end),
    canceled_at: unixToIso(input.subscription.canceled_at),
    ended_at: unixToIso(input.subscription.ended_at),
    updated_at: ts,
    last_provider_event_created_at: input.eventCreatedIso,
    ...(preserveCreatedAt ? { created_at: preserveCreatedAt } : { created_at: ts }),
  };
}

async function loadBillingSubscriptionByProviderId(
  supabase: SupabaseClient,
  providerSubscriptionId: string,
): Promise<BillingSubscriptionRow | null> {
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select(
      "id, specialist_id, provider, provider_customer_id, provider_subscription_id, provider_price_id, plan_code, status, cancel_at_period_end, current_period_start, current_period_end, trial_start, trial_end, canceled_at, ended_at, created_at, updated_at, last_provider_event_created_at",
    )
    .eq("provider", "stripe")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BillingSubscriptionRow;
}

async function findConflictingCurrentSubscription(
  supabase: SupabaseClient,
  specialistId: string,
  providerSubscriptionId: string,
  incomingStatus: string,
): Promise<BillingSubscriptionRow | null> {
  if (!CURRENT_BILLING_SUBSCRIPTION_STATUSES.has(incomingStatus)) return null;

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("id, provider_subscription_id, status, specialist_id")
    .eq("specialist_id", specialistId)
    .neq("provider_subscription_id", providerSubscriptionId);

  if (error || !data?.length) return null;

  for (const row of data as BillingSubscriptionRow[]) {
    if (CURRENT_BILLING_SUBSCRIPTION_STATUSES.has(row.status)) {
      return row as BillingSubscriptionRow;
    }
  }
  return null;
}

export async function syncBillingSubscription(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    planCode: PaidPlanCode;
    priceId: string;
    subscription: Stripe.Subscription;
    eventCreatedIso: string;
  },
): Promise<SyncBillingSubscriptionResult> {
  const existing = await loadBillingSubscriptionByProviderId(supabase, input.subscription.id);

  if (
    existing &&
    isOutOfOrderProviderEvent(existing.last_provider_event_created_at, input.eventCreatedIso)
  ) {
    return { outcome: "out_of_order" };
  }

  const payload = buildSubscriptionRowPayload(
    input,
    existing?.created_at ? String(existing.created_at) : undefined,
  );
  if (!payload) return { outcome: "retryable_failure" };

  if (existing) {
    const { error } = await supabase
      .from("billing_subscriptions")
      .update(payload)
      .eq("id", existing.id);

    return error ? { outcome: "retryable_failure" } : { outcome: "updated" };
  }

  const conflict = await findConflictingCurrentSubscription(
    supabase,
    input.specialistId,
    input.subscription.id,
    input.subscription.status,
  );
  if (conflict) {
    return { outcome: "conflict" };
  }

  const { error } = await supabase.from("billing_subscriptions").insert(payload);
  if (error?.code === "23505") {
    return { outcome: "conflict" };
  }
  if (error) {
    return { outcome: "retryable_failure" };
  }

  return { outcome: "inserted" };
}
