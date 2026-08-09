"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  normalizeCookieConsent,
} from "@/lib/consent/cookieConsent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type ConsentState = {
  analytics: boolean;
};

let googleTagInitialized = false;
let pageViewSent = false;

function readConsentState(): ConsentState {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return { analytics: false };
    }
    const parsed = normalizeCookieConsent(JSON.parse(raw));
    return { analytics: parsed?.analytics === true };
  } catch {
    return { analytics: false };
  }
}

function ensureGoogleTag() {
  if (!GA_MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!googleTagInitialized) {
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: false,
    });

    googleTagInitialized = true;
  }

  if (!document.getElementById("freuly-ga-script")) {
    const script = document.createElement("script");
    script.id = "freuly-ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }
}

function updateGoogleConsent(consent: ConsentState) {
  if (!GA_MEASUREMENT_ID) return;

  ensureGoogleTag();

  window.gtag("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (consent.analytics && !pageViewSent) {
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });

    pageViewSent = true;
  }
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export default function ConsentScripts() {
  const [consent, setConsent] = useState<ConsentState>({
    analytics: false,
  });

  useEffect(() => {
    ensureGoogleTag();

    const syncConsent = () => {
      setConsent(readConsentState());
    };

    syncConsent();

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  useEffect(() => {
    updateGoogleConsent(consent);
  }, [consent]);

  return null;
}
