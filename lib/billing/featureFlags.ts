/**
 * Billing / subscription feature flags (future payments). Read from env only.
 * Do not use for visibility, leads, or enforcement until product explicitly enables those paths.
 */
export const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";

export const subscriptionEnforcementEnabled =
  process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED === "true";

export const subscriptionPublicPaidCopyEnabled =
  process.env.SUBSCRIPTION_PUBLIC_PAID_COPY_ENABLED === "true";

export const manualInvoicesEnabled = process.env.MANUAL_INVOICES_ENABLED === "true";
