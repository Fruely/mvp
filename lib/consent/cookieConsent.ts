export const COOKIE_CONSENT_STORAGE_KEY = "freuly_cookie_consent_v1";
export const COOKIE_CONSENT_OPEN_EVENT = "freuly_cookie_consent_open";
export const COOKIE_CONSENT_CHANGE_EVENT = "freuly_cookie_consent_change";

export type CookieConsent = {
  analytics: boolean;
  referral: boolean;
  updatedAt: string;
};

type LegacyCookieConsent = Partial<{
  analytics: boolean;
  marketing: boolean;
  referral: boolean;
  externalMedia: boolean;
  updatedAt: string;
}>;

export function normalizeCookieConsent(raw: LegacyCookieConsent | null | undefined): CookieConsent | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    analytics: raw.analytics === true,
    referral: raw.referral === true || raw.marketing === true,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

export function createCookieConsent(values: {
  analytics: boolean;
  referral: boolean;
}): CookieConsent {
  return {
    analytics: values.analytics,
    referral: values.referral,
    updatedAt: new Date().toISOString(),
  };
}
