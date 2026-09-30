import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateStripeCustomerForSpecialist } from "@/lib/billing/billingCustomers";
import {
  STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER,
  stripePaymentIntentAttribution,
} from "@/lib/billing/requestOfferPaymentProvider";
import { bindServiceRequestPaymentRail } from "@/lib/billing/serviceRequestPaymentRail";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { PURCHASABLE_SERVICE_REQUEST_OFFER_STATUSES } from "@/lib/leadEngine/requestOfferPolicy";
import { notifyClientConfirmationRequired } from "@/lib/selection/interest";
import { isServiceRequestPaidClaimEnabled } from "@/lib/selection/reserveMatch";

/**
 * Manual-capture authorization for one reserved service-request claim.
 *
 * Direct-lead Checkout owns hosted sessions and automatic capture. It also
 * materializes a live price. Those semantics cannot own a card PaymentIntent
 * that must stay uncaptured, so this file is the authorization writer.
 * It does not capture, grant access, select a specialist, or open chat.
 */
export const SERVICE_REQUEST_PAYMENT_AUTH_FLAG = "SERVICE_REQUEST_PAYMENT_AUTH_ENABLED";
export const SERVICE_REQUEST_CAPTURE_FLAG = "SERVICE_REQUEST_CAPTURE_ENABLED";
export const SERVICE_REQUEST_AUTHORIZATION_PURPOSE = "service_request_access_authorization";

const ACTIVE_PAYMENT_STATUSES = ["pending", "authorized", "paid"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isServiceRequestPaymentAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_REQUEST_PAYMENT_AUTH_FLAG]?.trim().toLowerCase() === "true";
}

export function isServiceRequestCaptureEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_REQUEST_CAPTURE_FLAG]?.trim().toLowerCase() === "true";
}

export function serviceRequestAuthorizationIdempotencyKey(paymentId: string): string {
  return `service-request-authorization:${paymentId}`;
}

type Intent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string | null;
};

export type ServiceRequestAuthorizationStripe = {
  paymentIntents: {
    create: (
      params: Record<string, unknown>,
      options: { idempotencyKey: string },
    ) => Promise<Intent>;
    retrieve: (id: string) => Promise<Intent>;
  };
};

export type ServiceRequestAuthorizationResult =
  | {
      ok: true;
      state: "requires_confirmation";
      paymentId: string;
      amountCents: number;
      currency: "eur";
      clientSecret: string;
    }
  | {
      ok: true;
      state: "authorized" | "paid";
      paymentId: string;
      amountCents: number;
      currency: "eur";
    }
  | {
      ok: false;
      error:
        | "not_found"
        | "forbidden"
        | "not_claimable"
        | "already_claimed"
        | "offer_unavailable"
        | "price_unavailable"
        | "payments_unavailable"
        | "retryable"
        | "invariant";
    };

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  service_request_claim_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  provider?: string | null;
};

type ClaimRow = {
  id: string;
  status: string;
  specialist_id: string;
  service_request_id: string;
  match_id: string;
  request_offer_id: string | null;
  payment_rail?: string | null;
};

type OfferRow = {
  id: string;
  request_kind: string;
  service_request_id: string | null;
  specialist_id: string;
  billing_model: string;
  status: string;
  price_cents: number | null;
  currency: string;
};

const PAYMENT_COLUMNS =
  "id, offer_id, specialist_id, service_request_claim_id, amount_cents, currency, status, stripe_payment_intent_id, provider";

function livePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function money(payment: PaymentRow): {
  paymentId: string;
  amountCents: number;
  currency: "eur";
} | null {
  if (!UUID.test(payment.id)) return null;
  if (payment.currency !== "eur") return null;
  const amount = livePrice(payment.amount_cents);
  if (amount == null) return null;
  return { paymentId: payment.id, amountCents: amount, currency: "eur" };
}

async function loadActivePayment(
  supabase: SupabaseClient,
  claimId: string,
): Promise<{ row: PaymentRow | null } | { error: "retryable" }> {
  const { data, error } = await supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("service_request_claim_id", claimId)
    .in("status", [...ACTIVE_PAYMENT_STATUSES])
    .maybeSingle();
  if (error) return { error: "retryable" };
  return { row: (data as PaymentRow | null) ?? null };
}

export async function createServiceRequestAuthorization(input: {
  supabase: SupabaseClient;
  claimId: string;
  specialistId: string;
  userId: string;
  env?: NodeJS.ProcessEnv;
  stripe?: ServiceRequestAuthorizationStripe | null;
  resolveCustomer?: (customer: { specialistId: string; userId: string }) => Promise<string>;
}): Promise<ServiceRequestAuthorizationResult> {
  const env = input.env ?? process.env;
  if (!isServiceRequestPaidClaimEnabled(env) || !isServiceRequestPaymentAuthEnabled(env)) {
    return { ok: false, error: "not_found" };
  }
  if (!UUID.test(input.claimId) || !UUID.test(input.specialistId) || !UUID.test(input.userId)) {
    return { ok: false, error: "not_found" };
  }

  const claimResult = await input.supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, payment_rail")
    .eq("id", input.claimId)
    .maybeSingle();
  if (claimResult.error) return { ok: false, error: "retryable" };
  const claim = claimResult.data as ClaimRow | null;
  if (!claim) return { ok: false, error: "not_found" };
  if (claim.specialist_id !== input.specialistId) return { ok: false, error: "forbidden" };
  if (claim.status !== "reserved") return { ok: false, error: "not_claimable" };
  if (!claim.request_offer_id) return { ok: false, error: "offer_unavailable" };

  const noteAuthorized = async (
    result: ServiceRequestAuthorizationResult,
  ): Promise<ServiceRequestAuthorizationResult> => {
    if (result.ok && result.state === "authorized" && isServiceRequestCaptureEnabled(env)) {
      await notifyClientConfirmationRequired(input.supabase, claim.id);
    }
    return result;
  };

  const offerResult = await input.supabase
    .from("request_offers")
    .select("id, request_kind, service_request_id, specialist_id, billing_model, status, price_cents, currency")
    .eq("id", claim.request_offer_id)
    .maybeSingle();
  if (offerResult.error) return { ok: false, error: "retryable" };
  const offer = offerResult.data as OfferRow | null;
  const purchasable = (PURCHASABLE_SERVICE_REQUEST_OFFER_STATUSES as readonly string[]).includes(
    offer?.status ?? "",
  );
  if (
    !offer ||
    offer.request_kind !== "service_request" ||
    offer.service_request_id !== claim.service_request_id ||
    offer.specialist_id !== claim.specialist_id ||
    offer.billing_model !== "pay_per_lead" ||
    offer.currency !== "eur" ||
    !purchasable
  ) {
    return { ok: false, error: "offer_unavailable" };
  }

  const priceCents = livePrice(offer.price_cents);
  if (priceCents == null) return { ok: false, error: "price_unavailable" };

  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id, client_user_id")
    .eq("id", claim.service_request_id)
    .maybeSingle();
  if (requestResult.error) return { ok: false, error: "retryable" };
  if (!requestResult.data) return { ok: false, error: "not_found" };
  if (typeof requestResult.data.client_user_id !== "string" || !requestResult.data.client_user_id) {
    return { ok: false, error: "not_claimable" };
  }
  if (requestResult.data.selected_specialist_id) return { ok: false, error: "already_claimed" };

  const matchResult = await input.supabase
    .from("service_request_matches")
    .select("id, specialist_id, service_request_id, status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (matchResult.error) return { ok: false, error: "retryable" };
  const match = matchResult.data as {
    specialist_id?: string;
    service_request_id?: string;
    status?: string;
  } | null;
  if (!match || match.service_request_id !== claim.service_request_id) {
    return { ok: false, error: "not_claimable" };
  }
  if (match.specialist_id !== input.specialistId) return { ok: false, error: "forbidden" };
  if (match.status !== "active") return { ok: false, error: "not_claimable" };
  if (claim.payment_rail === "store") return { ok: false, error: "not_claimable" };

  const active = await loadActivePayment(input.supabase, claim.id);
  if ("error" in active) return { ok: false, error: "retryable" };
  if (active.row?.provider && active.row.provider !== "stripe") return { ok: false, error: "not_claimable" };

  const stripe =
    input.stripe === undefined
      ? (getStripeClient() as ServiceRequestAuthorizationStripe | null)
      : input.stripe;
  if (!stripe) return { ok: false, error: "payments_unavailable" };

  const bound = await bindServiceRequestPaymentRail({
    supabase: input.supabase,
    claimId: claim.id,
    specialistId: input.specialistId,
    rail: "stripe",
  });
  if (!bound.ok) {
    return {
      ok: false,
      error: bound.error === "retryable" || bound.error === "not_found" || bound.error === "forbidden"
        ? bound.error
        : "not_claimable",
    };
  }

  let payment = active.row;

  if (payment?.status === "authorized") {
    const settled = money(payment);
    if (!settled || payment.amount_cents !== priceCents) return { ok: false, error: "invariant" };
    return noteAuthorized({ ok: true, state: "authorized", ...settled });
  }
  if (payment?.status === "paid") {
    const settled = money(payment);
    if (!settled || payment.amount_cents !== priceCents) return { ok: false, error: "invariant" };
    return { ok: true, state: "paid", ...settled };
  }

  if (!payment) {
    const nowIso = new Date().toISOString();
    const inserted = await input.supabase
      .from("request_offer_payments")
      .insert({
        offer_id: offer.id,
        specialist_id: input.specialistId,
        user_id: input.userId,
        service_request_claim_id: claim.id,
        amount_cents: priceCents,
        currency: "eur",
        status: "pending",
        provider: STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(PAYMENT_COLUMNS)
      .single();
    if (inserted.error?.code === "23505") {
      const raced = await loadActivePayment(input.supabase, claim.id);
      if ("error" in raced || !raced.row) return { ok: false, error: "retryable" };
      payment = raced.row;
    } else if (inserted.error || !inserted.data) {
      return { ok: false, error: "retryable" };
    } else {
      payment = inserted.data as PaymentRow;
    }
  }

  if (!payment) return { ok: false, error: "retryable" };
  if (payment.status === "authorized") {
    const settled = money(payment);
    if (!settled) return { ok: false, error: "invariant" };
    return noteAuthorized({ ok: true, state: "authorized", ...settled });
  }
  if (payment.status === "paid") {
    const settled = money(payment);
    if (!settled) return { ok: false, error: "invariant" };
    return { ok: true, state: "paid", ...settled };
  }
  if (payment.status !== "pending" || payment.amount_cents !== priceCents || payment.currency !== "eur") {
    return { ok: false, error: "invariant" };
  }
  if (payment.offer_id !== offer.id || payment.specialist_id !== input.specialistId) {
    return { ok: false, error: "invariant" };
  }

  let customerId: string;
  try {
    customerId = input.resolveCustomer
      ? await input.resolveCustomer({ specialistId: input.specialistId, userId: input.userId })
      : (
          await getOrCreateStripeCustomerForSpecialist(input.supabase, {
            specialistId: input.specialistId,
            userId: input.userId,
          })
        ).customerId;
  } catch (error) {
    console.error("[billing/service-request-authorization] customer lookup failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }

  const idempotencyKey = serviceRequestAuthorizationIdempotencyKey(payment.id);
  let intent: Intent;
  try {
    intent = payment.stripe_payment_intent_id
      ? await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id)
      : await stripe.paymentIntents.create(
          {
            amount: payment.amount_cents,
            currency: payment.currency,
            customer: customerId,
            capture_method: "manual",
            confirmation_method: "automatic",
            payment_method_types: ["card"],
            metadata: {
              purpose: SERVICE_REQUEST_AUTHORIZATION_PURPOSE,
              payment_id: payment.id,
              offer_id: offer.id,
              claim_id: claim.id,
              specialist_id: input.specialistId,
            },
          },
          { idempotencyKey },
        );
  } catch (error) {
    console.error("[billing/service-request-authorization] payment intent failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }

  if (intent.amount !== payment.amount_cents || intent.currency.toLowerCase() !== payment.currency) {
    return { ok: false, error: "invariant" };
  }

  if (!payment.stripe_payment_intent_id) {
    const updatedAt = new Date().toISOString();
    const saved = await input.supabase
      .from("request_offer_payments")
      .update({
        stripe_payment_intent_id: intent.id,
        ...stripePaymentIntentAttribution(intent.id),
        updated_at: updatedAt,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (saved.error) return { ok: false, error: "retryable" };
  }

  if (intent.status === "requires_capture") {
    return noteAuthorized(await finishAuthorized(input.supabase, payment, intent.id));
  }
  if (intent.status === "succeeded") {
    return finishPaid(input.supabase, payment, intent.id);
  }
  if (
    intent.status !== "requires_payment_method" &&
    intent.status !== "requires_confirmation" &&
    intent.status !== "requires_action"
  ) {
    return { ok: false, error: "retryable" };
  }
  if (!intent.client_secret) return { ok: false, error: "retryable" };
  const settled = money(payment);
  if (!settled) return { ok: false, error: "invariant" };
  return {
    ok: true,
    state: "requires_confirmation",
    ...settled,
    clientSecret: intent.client_secret,
  };
}

async function finishAuthorized(
  supabase: SupabaseClient,
  payment: PaymentRow,
  paymentIntentId: string,
): Promise<ServiceRequestAuthorizationResult> {
  if (payment.status !== "authorized") {
    const authorizedAt = new Date().toISOString();
    const saved = await supabase
      .from("request_offer_payments")
      .update({
        status: "authorized",
        authorized_at: authorizedAt,
        stripe_payment_intent_id: paymentIntentId,
        ...stripePaymentIntentAttribution(paymentIntentId),
        updated_at: authorizedAt,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (saved.error) return { ok: false, error: "retryable" };
  }
  const settled = money({ ...payment, stripe_payment_intent_id: paymentIntentId });
  if (!settled) return { ok: false, error: "invariant" };
  return { ok: true, state: "authorized", ...settled };
}

async function finishPaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  paymentIntentId: string,
): Promise<ServiceRequestAuthorizationResult> {
  if (payment.status !== "paid") {
    const paidAt = new Date().toISOString();
    const saved = await supabase
      .from("request_offer_payments")
      .update({
        status: "paid",
        paid_at: paidAt,
        stripe_payment_intent_id: paymentIntentId,
        ...stripePaymentIntentAttribution(paymentIntentId),
        updated_at: paidAt,
      })
      .eq("id", payment.id)
      .in("status", ["pending", "authorized"]);
    if (saved.error) return { ok: false, error: "retryable" };
  }
  const settled = money(payment);
  if (!settled) return { ok: false, error: "invariant" };
  return { ok: true, state: "paid", ...settled };
}
