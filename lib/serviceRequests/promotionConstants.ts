export const PROMOTION_STATUSES = ["draft", "published", "closed"] as const;

export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const PROMOTION_LOCALES = ["ru", "ua", "de"] as const;

export type PromotionLocale = (typeof PROMOTION_LOCALES)[number];

export const PROMOTION_TITLE_MAX_LEN = 200;
export const PROMOTION_SUMMARY_MAX_LEN = 4000;

/** Whitelist for public server reads — no join with service_requests. */
export const PROMOTION_PUBLIC_SELECT =
  "public_title, public_summary, locale, published_at, status, closed_at";

export const PROMOTION_ADMIN_SELECT =
  "id, service_request_id, public_token, locale, public_title, public_summary, status, created_at, updated_at, published_at, closed_at";
