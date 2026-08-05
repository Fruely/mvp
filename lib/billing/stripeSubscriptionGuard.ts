import type Stripe from "stripe";
import { getStripeClient } from "@/lib/billing/stripeClient";
import {
  BLOCKING_STRIPE_SUBSCRIPTION_STATUSES,
  classifyStripeSubscriptionBlock,
} from "@/lib/billing/billingCustomers";

export type SubscriptionGuardResult =
  | { allowed: true }
  | { allowed: false; reason: "subscription_already_active" | "subscription_incomplete" };

/** Block duplicate checkout when Stripe already has a live subscription for the customer. */
export async function assertNoBlockingStripeSubscription(
  customerId: string,
): Promise<SubscriptionGuardResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { allowed: false, reason: "subscription_already_active" };
  }

  const statuses = Array.from(BLOCKING_STRIPE_SUBSCRIPTION_STATUSES);
  const found: Array<Pick<Stripe.Subscription, "status">> = [];

  for (const status of statuses) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: status as Stripe.SubscriptionListParams["status"],
      limit: 3,
    });
    found.push(...page.data.map((s) => ({ status: s.status })));
  }

  const block = classifyStripeSubscriptionBlock(found);
  if (block === "active") {
    return { allowed: false, reason: "subscription_already_active" };
  }
  if (block === "incomplete") {
    return { allowed: false, reason: "subscription_incomplete" };
  }
  return { allowed: true };
}
