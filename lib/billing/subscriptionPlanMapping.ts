import type Stripe from "stripe";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { listConfiguredPaidPlans } from "@/lib/billing/planConfig";
import { stripeId } from "@/lib/billing/stripeInvoiceEligibility";

export const SUBSCRIPTION_CHECKOUT_PURPOSE = "specialist_subscription";

const PAID_PLAN_CODES = new Set<PaidPlanCode>(["basic", "premium"]);

export function parsePaidPlanCodeValue(value: unknown): PaidPlanCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return PAID_PLAN_CODES.has(normalized as PaidPlanCode) ? (normalized as PaidPlanCode) : null;
}

export function resolvePlanCodeFromPriceId(priceId: string | null | undefined): PaidPlanCode | null {
  if (!priceId?.trim()) return null;
  const normalized = priceId.trim();
  for (const config of listConfiguredPaidPlans()) {
    if (config.stripePriceId === normalized) return config.internalPlan;
  }
  return null;
}

export function primarySubscriptionPriceId(
  subscription: Pick<Stripe.Subscription, "items">,
): string | null {
  const price = subscription.items?.data?.[0]?.price;
  return stripeId(price) ?? (typeof price?.id === "string" ? price.id : null);
}

export type ResolvedSubscriptionPlan =
  | { ok: true; planCode: PaidPlanCode; priceId: string }
  | { ok: false; reason: "missing_price" | "unknown_price" | "metadata_plan_mismatch" };

/** Server-side plan resolution — Price ID first, metadata plan_code only as cross-check. */
export function resolveSubscriptionPlanCode(
  subscription: Pick<Stripe.Subscription, "items" | "metadata">,
): ResolvedSubscriptionPlan {
  const priceId = primarySubscriptionPriceId(subscription);
  if (!priceId) return { ok: false, reason: "missing_price" };

  const fromPrice = resolvePlanCodeFromPriceId(priceId);
  if (!fromPrice) return { ok: false, reason: "unknown_price" };

  const metaPlan =
    parsePaidPlanCodeValue(subscription.metadata?.plan_code) ??
    parsePaidPlanCodeValue(subscription.metadata?.internal_plan);

  if (metaPlan && metaPlan !== fromPrice) {
    return { ok: false, reason: "metadata_plan_mismatch" };
  }

  return { ok: true, planCode: fromPrice, priceId };
}

export function resolveCheckoutSessionPlanCode(
  session: Pick<Stripe.Checkout.Session, "metadata">,
): PaidPlanCode | null {
  return (
    parsePaidPlanCodeValue(session.metadata?.plan_code) ??
    parsePaidPlanCodeValue(session.metadata?.internal_plan)
  );
}
