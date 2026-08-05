import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type BillingCustomerRow = {
  id: string;
  specialist_id: string;
  provider: string;
  provider_customer_id: string;
};

const PROVIDER = "stripe";

export async function findBillingCustomerBySpecialistId(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<BillingCustomerRow | null> {
  const { data } = await supabase
    .from("billing_customers")
    .select("id, specialist_id, provider, provider_customer_id")
    .eq("provider", PROVIDER)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  return data as BillingCustomerRow | null;
}

async function insertBillingCustomerMapping(
  supabase: SupabaseClient,
  specialistId: string,
  providerCustomerId: string,
): Promise<BillingCustomerRow | "conflict"> {
  const ts = new Date().toISOString();
  const { data, error } = await supabase
    .from("billing_customers")
    .insert({
      specialist_id: specialistId,
      provider: PROVIDER,
      provider_customer_id: providerCustomerId,
      created_at: ts,
      updated_at: ts,
    })
    .select("id, specialist_id, provider, provider_customer_id")
    .single();

  if (error?.code === "23505") {
    return "conflict";
  }
  if (error || !data) {
    throw new Error("billing_customer_insert_failed");
  }
  return data as BillingCustomerRow;
}

function stripeCustomerMetadata(input: {
  specialistId: string;
  userId?: string | null;
}): Record<string, string> {
  const meta: Record<string, string> = {
    specialist_id: input.specialistId,
  };
  if (input.userId?.trim()) {
    meta.user_id = input.userId.trim();
  }
  return meta;
}

/**
 * Resolve or create Stripe Customer + billing_customers mapping (idempotent, concurrency-safe).
 */
export async function getOrCreateStripeCustomerForSpecialist(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    userId?: string | null;
    email?: string | null;
    name?: string | null;
  },
): Promise<{ customerId: string; reused: boolean }> {
  const existing = await findBillingCustomerBySpecialistId(supabase, input.specialistId);
  if (existing?.provider_customer_id) {
    return { customerId: existing.provider_customer_id, reused: true };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("stripe_not_configured");
  }

  const customer = await stripe.customers.create({
    email: input.email?.trim() || undefined,
    name: input.name?.trim() || undefined,
    metadata: stripeCustomerMetadata(input),
  });

  const inserted = await insertBillingCustomerMapping(
    supabase,
    input.specialistId,
    customer.id,
  );

  if (inserted !== "conflict") {
    return { customerId: customer.id, reused: false };
  }

  const winner = await findBillingCustomerBySpecialistId(supabase, input.specialistId);
  if (winner?.provider_customer_id) {
    if (winner.provider_customer_id !== customer.id) {
      console.warn("[billing/customers] orphan_stripe_customer_after_race", {
        specialistId: input.specialistId,
        orphanCustomerId: customer.id,
        mappedCustomerId: winner.provider_customer_id,
      });
    }
    return { customerId: winner.provider_customer_id, reused: true };
  }

  throw new Error("billing_customer_mapping_unresolved");
}

/** Pure helper for tests — session/subscription metadata payload. */
export function buildStripeCheckoutMetadata(input: {
  specialistId: string;
  userId?: string | null;
  internalPlan: string;
  billingInterval: string;
}): Record<string, string> {
  const meta: Record<string, string> = {
    purpose: "specialist_subscription",
    specialist_id: input.specialistId,
    plan_code: input.internalPlan,
    internal_plan: input.internalPlan,
    billing_interval: input.billingInterval,
  };
  if (input.userId?.trim()) {
    meta.user_id = input.userId.trim();
  }
  return meta;
}

export const BLOCKING_STRIPE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "incomplete",
  "unpaid",
]);

export function classifyStripeSubscriptionBlock(
  subscriptions: Array<Pick<Stripe.Subscription, "status">>,
): "none" | "active" | "incomplete" {
  for (const sub of subscriptions) {
    if (!BLOCKING_STRIPE_SUBSCRIPTION_STATUSES.has(sub.status)) continue;
    if (sub.status === "incomplete" || sub.status === "unpaid") {
      return "incomplete";
    }
    return "active";
  }
  return "none";
}
