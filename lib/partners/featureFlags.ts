/**
 * Partner payout / Stripe Connect live mode.
 * Keep false until Freuly Stripe Connect + platform bank account are ready.
 */
export const partnerPayoutsEnabled = process.env.PARTNER_PAYOUTS_ENABLED === "true";

/**
 * Version written on accept (`partners.agreement_version`).
 * Default MUST stay in sync with `PARTNER_AGREEMENT_VERSION` in
 * `content/partners/agreementMeta.ts` (canonical document version).
 */
export const PARTNER_AGREEMENT_VERSION =
  process.env.PARTNER_AGREEMENT_VERSION?.trim() || "1.0";
