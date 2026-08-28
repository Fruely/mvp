"use client";

import { useEffect, useRef } from "react";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  normalizeCookieConsent,
} from "@/lib/consent/cookieConsent";
import {
  ACQUISITION_COOKIE_MAX_AGE_SECONDS,
  ACQUISITION_COOKIE_NAME,
  buildAcquisitionFirstTouch,
  serializeAcquisitionCookie,
  type AcquisitionFirstTouch,
} from "@/lib/acquisition/firstTouch";

function readAnalyticsConsent(): boolean | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeCookieConsent(JSON.parse(raw))?.analytics ?? false;
  } catch {
    return null;
  }
}

function hasCookie(): boolean {
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${ACQUISITION_COOKIE_NAME}=`));
}

function clearCookie() {
  document.cookie = `${ACQUISITION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function persistFirstTouch(value: AcquisitionFirstTouch) {
  if (hasCookie()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ACQUISITION_COOKIE_NAME}=${serializeAcquisitionCookie(value)}; Path=/; Max-Age=${ACQUISITION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export default function AcquisitionAttributionCapture() {
  const initialTouch = useRef<AcquisitionFirstTouch | null>(null);

  useEffect(() => {
    initialTouch.current = buildAcquisitionFirstTouch({
      href: window.location.href,
      referrer: document.referrer,
      ownHostname: window.location.hostname,
    });

    const sync = () => {
      const consent = readAnalyticsConsent();
      if (consent === true && initialTouch.current) {
        persistFirstTouch(initialTouch.current);
      } else if (consent === false) {
        clearCookie();
      }
    };

    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
  }, []);

  return null;
}
