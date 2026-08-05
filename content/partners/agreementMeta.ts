/**
 * Single source of truth for Partnerprogramm-Bedingungen versioning.
 * Do not scatter version strings across the app.
 */
export const PARTNER_AGREEMENT_VERSION = "1.1";

/** Effective date of Partnerprogramm-Bedingungen v1.1 (legal identity update). */
export const PARTNER_AGREEMENT_EFFECTIVE_DATE = "2026-08-05";

/** Immutable version accepted before v1.1 legal identity update. */
export const PARTNER_AGREEMENT_LEGACY_VERSION = "1.0";

export const PARTNER_AGREEMENT_TITLE = {
  de: "Partnerprogramm-Bedingungen von Freuly",
  ru: "Условия партнёрской программы Freuly",
  ua: "Умови партнерської програми Freuly",
} as const;

import { getPartnerAgreementProvider } from "@/lib/legal/freulyIdentity";

export const PARTNER_PROVIDER = getPartnerAgreementProvider();

/**
 * Calendar days after first successful payment before a pending reward may become confirmed.
 * Must match COMMISSION_VALIDATION_DAYS in lib/partners/commissionValidation.ts.
 */
export const PARTNER_REWARD_VALIDATION_DAYS = 14;
