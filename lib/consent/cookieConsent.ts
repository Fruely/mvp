export const COOKIE_CONSENT_STORAGE_KEY = "freuly_cookie_consent_v1";
export const COOKIE_CONSENT_OPEN_EVENT = "freuly_cookie_consent_open";
export const COOKIE_CONSENT_CHANGE_EVENT = "freuly_cookie_consent_change";

export type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  externalMedia: boolean;
  updatedAt: string;
};

export function createCookieConsent(values: {
  analytics: boolean;
  marketing: boolean;
  externalMedia: boolean;
}): CookieConsent {
  return {
    analytics: values.analytics,
    marketing: values.marketing,
    externalMedia: values.externalMedia,
    updatedAt: new Date().toISOString(),
  };
}
