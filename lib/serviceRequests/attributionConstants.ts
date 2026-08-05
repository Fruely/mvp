export const ATTRIBUTION_COOKIE_NAME = "freuly_request_attribution";

/** 30 days in seconds */
export const ATTRIBUTION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export const ATTRIBUTION_TOKEN_MAX_LEN = 128;

export const ATTRIBUTION_UTM_LIMITS = {
  utm_source: 100,
  utm_medium: 100,
  utm_campaign: 200,
  utm_content: 200,
} as const;

export const ATTRIBUTION_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

export type AttributionUtmKey = (typeof ATTRIBUTION_UTM_KEYS)[number];

export type SanitizedUtmFields = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export const ATTRIBUTION_ROW_SELECT =
  "id, promotion_id, attribution_token, landing_locale, utm_source, utm_medium, utm_campaign, utm_content, referrer_host, first_seen_at, last_seen_at, visit_count";
