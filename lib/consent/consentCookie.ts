/**
 * First-party mirror of cookie-banner choices for server-side reads (e.g. referral attribution).
 * Set from the client when the user saves consent.
 */

export const CONSENT_COOKIE_NAME = "freuly_consent_v1";
export const CONSENT_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export type ConsentCookiePayload = {
  analytics: boolean;
  referral: boolean;
};

export function parseConsentCookie(raw: string | undefined | null): ConsentCookiePayload | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<
      ConsentCookiePayload & { marketing?: boolean; externalMedia?: boolean }
    >;
    return {
      analytics: parsed.analytics === true,
      referral: parsed.referral === true || parsed.marketing === true,
    };
  } catch {
    return null;
  }
}

export function hasReferralConsentFromCookie(raw: string | undefined | null): boolean {
  return parseConsentCookie(raw)?.referral === true;
}

export function serializeConsentCookie(payload: ConsentCookiePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function consentCookieOptions(secure: boolean): {
  path: string;
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    path: "/",
    maxAge: CONSENT_COOKIE_MAX_AGE_SEC,
    sameSite: "lax",
    secure,
  };
}
