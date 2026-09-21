import { PARTNER_AGREEMENT_VERSION as CANONICAL_PARTNER_AGREEMENT_VERSION } from "@/content/partners/agreementMeta";

/**
 * Partner payout / Stripe Connect live mode.
 * Keep false until Freuly Stripe Connect + platform bank account are ready.
 */
export const partnerPayoutsEnabled = process.env.PARTNER_PAYOUTS_ENABLED === "true";

/**
 * Version written on accept (`partners.agreement_version`).
 * This is deliberately sourced from the canonical legal metadata so a stale
 * hosting environment variable cannot record acceptance of an obsolete version.
 */
export const PARTNER_AGREEMENT_VERSION = CANONICAL_PARTNER_AGREEMENT_VERSION;
