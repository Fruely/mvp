import { UNTRUSTED_CHECKOUT_BODY_KEYS } from "./checkoutBodyValidation";

export const PROMOTED_ACCESS_UNTRUSTED_BODY_KEYS = [
  ...UNTRUSTED_CHECKOUT_BODY_KEYS,
  "plan_code",
  "planCode",
  "promotion_id",
  "promotionId",
  "signup_binding_id",
  "signupBindingId",
  "public_token",
  "publicToken",
  "attribution_token",
  "attributionToken",
] as const;

export function findUntrustedPromotedAccessCheckoutBodyKeys(
  body: Record<string, unknown>,
): string[] {
  return PROMOTED_ACCESS_UNTRUSTED_BODY_KEYS.filter((key) => key in body);
}
