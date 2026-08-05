export const PROMOTED_ACCESS_AMOUNT_CENTS = 1000;
export const PROMOTED_ACCESS_CURRENCY = "eur";
export const PROMOTED_ACCESS_PURPOSE = "promoted_request_access";

export const SIGNUP_BINDING_CHECKOUT_SELECT =
  "id, promotion_id, specialist_id, user_id";

export const PROMOTION_EXISTS_SELECT = "id";

export const PROMOTED_PAYMENT_INSERT_SELECT = "id";

export const PROMOTED_ACCESS_GRANT_ACTIVE_SELECT = "id";

export const PROMOTED_PAYMENT_WEBHOOK_SELECT =
  "id, signup_binding_id, promotion_id, specialist_id, user_id, amount_cents, currency, status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id, paid_at";

export const PROMOTED_ACCESS_GRANT_WEBHOOK_SELECT =
  "id, source_type, source_payment_id, revoked_at";

export const PROMOTED_SUBSCRIPTION_CREDIT_CENTS = 1000;
export const PROMOTED_SUBSCRIPTION_CREDIT_DAYS = 7;
