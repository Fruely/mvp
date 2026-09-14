"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  normalizeCookieConsent,
} from "@/lib/consent/cookieConsent";
import { ensureMetaPixel, trackMetaPageView } from "@/lib/metaPixel";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type ConsentState = {
  analytics: boolean;
};

let googleTagInitialized = false;
let lastGooglePageLocation: string | null = null;

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

function trackGooglePageView() {
  if (!GA_MEASUREMENT_ID) return;

  const pageLocation = window.location.href;
  if (lastGooglePageLocation === pageLocation) return;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: pageLocation,
    page_path: window.location.pathname,
  });

  lastGooglePageLocation = pageLocation;
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
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export default function ConsentScripts() {
  const pathname = usePathname();
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

    if (consent.analytics) {
      trackGooglePageView();
      ensureMetaPixel();
      trackMetaPageView();
    }
  }, [consent, pathname]);

  return null;
}
