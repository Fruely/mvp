export const COOKIE_CONSENT_STORAGE_KEY = "freuly_cookie_consent_v1";

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
