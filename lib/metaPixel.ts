import {
  COOKIE_CONSENT_STORAGE_KEY,
  normalizeCookieConsent,
} from "@/lib/consent/cookieConsent";

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1403575027848112";

export type MetaPixelEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    fbq?: {
      (...args: unknown[]): void;
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window["fbq"];
  }
}

let metaPixelInitialized = false;
let lastTrackedPageLocation: string | null = null;

export function hasMetaPixelConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return false;

    const parsed = normalizeCookieConsent(JSON.parse(raw));
    return parsed?.analytics === true;
  } catch {
    return false;
  }
}

export function ensureMetaPixel() {
  if (!META_PIXEL_ID || typeof window === "undefined" || !hasMetaPixelConsent()) return;

  if (!window.fbq) {
    const fbq = function fbq(...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(args);
      }
    } as NonNullable<Window["fbq"]>;

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (!metaPixelInitialized) {
    window.fbq("init", META_PIXEL_ID);
    metaPixelInitialized = true;
  }

  if (!document.getElementById("freuly-meta-pixel-script")) {
    const script = document.createElement("script");
    script.id = "freuly-meta-pixel-script";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
}

export function trackMetaPageView() {
  if (!META_PIXEL_ID || typeof window === "undefined" || !hasMetaPixelConsent()) return;

  ensureMetaPixel();

  const pageLocation = window.location.href;
  if (lastTrackedPageLocation === pageLocation) return;

  window.fbq?.("track", "PageView");
  lastTrackedPageLocation = pageLocation;
}

export function trackMetaEvent(eventName: string, params?: MetaPixelEventParams) {
  if (!META_PIXEL_ID || typeof window === "undefined" || !hasMetaPixelConsent()) return;

  ensureMetaPixel();
  window.fbq?.("track", eventName, params ?? {});
}

export function trackSpecialistRegistrationLead() {
  trackMetaEvent("Lead", {
    content_name: "specialist_registration",
    content_category: "specialist",
  });
}
