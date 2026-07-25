/**
 * Single source of truth for Partnerprogramm-Bedingungen versioning.
 * Do not scatter version strings across the app.
 */
export const PARTNER_AGREEMENT_VERSION = "1.0";

/** Effective date of Partnerprogramm-Bedingungen v1.0 (ISO date, Europe/Berlin launch intent). */
export const PARTNER_AGREEMENT_EFFECTIVE_DATE = "2026-07-25";

export const PARTNER_AGREEMENT_TITLE = {
  de: "Partnerprogramm-Bedingungen von Freuly",
  ru: "Условия партнёрской программы Freuly",
  ua: "Умови партнерської програми Freuly",
} as const;

export const PARTNER_PROVIDER = {
  name: "Natalia Sheshenia",
  tradeName: "Sheshenia – Freuly",
  street: "Hofolper Straße 46",
  cityLine: "57399 Kirchhundem OT Hofolpe",
  country: "Deutschland",
  email: "freuly.de@gmail.com",
  phone: "+49 160 92686432",
} as const;

/**
 * Calendar days after first successful payment before a pending reward may become confirmed.
 * Must match COMMISSION_VALIDATION_DAYS in lib/partners/commissionValidation.ts.
 */
export const PARTNER_REWARD_VALIDATION_DAYS = 14;
