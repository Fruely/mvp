/**
 * Partner payout / Stripe Connect live mode.
 * Keep false until Freuly Stripe Connect + platform bank account are ready.
 */
export const partnerPayoutsEnabled = process.env.PARTNER_PAYOUTS_ENABLED === "true";

export const PARTNER_AGREEMENT_VERSION =
  process.env.PARTNER_AGREEMENT_VERSION?.trim() || "2026-07-v1";
