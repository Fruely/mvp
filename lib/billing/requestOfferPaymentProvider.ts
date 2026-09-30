/**
 * Provider identity for one request_offer_payments row.
 *
 * This is not the plan Checkout provider in paymentProvider.ts, and it is
 * not an access entitlement. request_offer_access_grants remains that fact.
 */
export const REQUEST_OFFER_PAYMENT_PROVIDERS = ["stripe", "apple", "google"] as const;

export type RequestOfferPaymentProvider = (typeof REQUEST_OFFER_PAYMENT_PROVIDERS)[number];

export const STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER: RequestOfferPaymentProvider = "stripe";

/**
 * Stripe settlement identity for a request offer is the PaymentIntent id.
 * A Checkout session id is not this identity. It is known only after Stripe
 * creates or returns the PaymentIntent.
 */
export function stripePaymentIntentAttribution(paymentIntentId: string): {
  provider: typeof STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER;
  provider_transaction_id: string;
} {
  return {
    provider: STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER,
    provider_transaction_id: paymentIntentId,
  };
}
