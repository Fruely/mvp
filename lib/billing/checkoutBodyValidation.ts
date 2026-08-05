export const UNTRUSTED_CHECKOUT_BODY_KEYS = [
  "specialist_id",
  "specialistId",
  "price_id",
  "priceId",
  "stripe_price_id",
  "amount",
  "currency",
  "user_id",
  "userId",
  "customer_id",
  "customerId",
  "success_url",
  "successUrl",
  "cancel_url",
  "cancelUrl",
  "product_id",
  "productId",
] as const;

export function findUntrustedCheckoutBodyKeys(body: Record<string, unknown>): string[] {
  return UNTRUSTED_CHECKOUT_BODY_KEYS.filter((key) => key in body);
}
