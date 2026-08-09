"use client";

import {
  CONSENT_COOKIE_NAME,
  consentCookieOptions,
  serializeConsentCookie,
} from "@/lib/consent/consentCookie";
import type { CookieConsent } from "@/lib/consent/cookieConsent";

export async function persistClientConsent(consent: CookieConsent): Promise<void> {
  const secure = window.location.protocol === "https:";
  const payload = serializeConsentCookie({
    analytics: consent.analytics,
    referral: consent.referral,
  });
  const options = consentCookieOptions(secure);
  document.cookie = `${CONSENT_COOKIE_NAME}=${payload}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=Lax${options.secure ? "; Secure" : ""}`;

  if (consent.referral) {
    await fetch("/api/consent/referral-cookie", { method: "POST" }).catch(() => undefined);
    return;
  }

  await fetch("/api/consent/referral-cookie", { method: "DELETE" }).catch(() => undefined);
}
