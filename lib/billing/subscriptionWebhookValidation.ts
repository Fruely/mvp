import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { findBillingCustomerBySpecialistId } from "@/lib/billing/billingCustomers";
import { stripeId, extractSpecialistIdFromMetadata } from "@/lib/billing/stripeInvoiceEligibility";
import {
  resolveCheckoutSessionPlanCode,
  SUBSCRIPTION_CHECKOUT_PURPOSE,
  parsePaidPlanCodeValue,
} from "@/lib/billing/subscriptionPlanMapping";

export const SUBSCRIPTION_STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export const CURRENT_BILLING_SUBSCRIPTION_STATUSES = new Set([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "paused",
]);

export function eventCreatedIso(event: Stripe.Event): string {
  return new Date(event.created * 1000).toISOString();
}

export function isPromotedCheckoutSession(
  session: Pick<Stripe.Checkout.Session, "metadata">,
): boolean {
  const purpose = session.metadata?.purpose?.trim();
  if (purpose === "promoted_request_access") return true;
  return Boolean(session.metadata?.payment_id?.trim());
}

export function isSpecialistSubscriptionCheckoutSession(
  session: Pick<Stripe.Checkout.Session, "mode" | "metadata">,
): boolean {
  if (session.mode !== "subscription") return false;
  if (isPromotedCheckoutSession(session)) return false;

  const purpose = session.metadata?.purpose?.trim();
  if (purpose === SUBSCRIPTION_CHECKOUT_PURPOSE) return true;

  const planCode = resolveCheckoutSessionPlanCode(session);
  const specialistId = extractSpecialistIdFromMetadata(session.metadata ?? undefined);
  return Boolean(planCode && specialistId);
}

export function validateSubscriptionCheckoutSession(
  session: Stripe.Checkout.Session,
): { ok: true; specialistId: string; planCode: "basic" | "premium" } | { ok: false } {
  if (!isSpecialistSubscriptionCheckoutSession(session)) return { ok: false };

  const specialistId = extractSpecialistIdFromMetadata(session.metadata ?? undefined);
  const planCode = resolveCheckoutSessionPlanCode(session);
  if (!specialistId || !planCode) return { ok: false };

  if (!stripeId(session.customer)) return { ok: false };
  if (!stripeId(session.subscription)) return { ok: false };

  return { ok: true, specialistId, planCode };
}

export async function resolveSpecialistIdForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  metadataSpecialistId?: string | null,
): Promise<
  | { ok: true; specialistId: string }
  | { ok: false; reason: "unknown_customer" | "specialist_mismatch" | "specialist_missing" }
> {
  const customerId = stripeId(subscription.customer);
  if (!customerId) return { ok: false, reason: "unknown_customer" };

  const { data: billingCustomer } = await supabase
    .from("billing_customers")
    .select("specialist_id, provider_customer_id")
    .eq("provider", "stripe")
    .eq("provider_customer_id", customerId)
    .maybeSingle();

  if (!billingCustomer?.specialist_id) {
    return { ok: false, reason: "unknown_customer" };
  }

  const canonicalSpecialistId = String(billingCustomer.specialist_id);
  const metaId =
    metadataSpecialistId?.trim() ||
    extractSpecialistIdFromMetadata(subscription.metadata ?? undefined);

  if (metaId && metaId !== canonicalSpecialistId) {
    return { ok: false, reason: "specialist_mismatch" };
  }

  const { data: specialist } = await supabase
    .from("specialists")
    .select("id")
    .eq("id", canonicalSpecialistId)
    .maybeSingle();

  if (!specialist?.id) return { ok: false, reason: "specialist_missing" };

  return { ok: true, specialistId: canonicalSpecialistId };
}

export function isOutOfOrderProviderEvent(
  storedEventCreatedAt: string | null | undefined,
  incomingEventCreatedIso: string,
): boolean {
  if (!storedEventCreatedAt) return false;
  const storedMs = Date.parse(storedEventCreatedAt);
  const incomingMs = Date.parse(incomingEventCreatedIso);
  if (Number.isNaN(storedMs) || Number.isNaN(incomingMs)) return false;
  return incomingMs < storedMs;
}

export function unixToIso(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}
