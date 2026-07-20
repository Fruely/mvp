/**
 * Pure helpers for PWA install UX (safe for Node tests / SSR).
 * Browser-only APIs stay in the InstallFreuly client component.
 */

export const INSTALL_DISMISS_KEY = "freuly_pwa_install_dismissed_at";
export const INSTALL_DONE_KEY = "freuly_pwa_installed";
export const INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallAudience = "client" | "specialist";
export type InstallPlacement =
  | "app_shell"
  | "install_page"
  | "home_mobile"
  | "specialist_profile"
  | "dashboard"
  | "lead_success"
  | "button";

export type InstallVariant =
  | "compact"
  | "card"
  | "button"
  | "dashboard"
  | "landing";

export function parseAudience(raw: string | null | undefined): InstallAudience {
  if (raw === "specialist") return "specialist";
  return "client";
}

export function isDismissCoolingDown(
  dismissedAtMs: number | null,
  nowMs: number,
  cooldownMs: number = INSTALL_DISMISS_COOLDOWN_MS
): boolean {
  if (dismissedAtMs == null || !Number.isFinite(dismissedAtMs)) return false;
  return nowMs - dismissedAtMs < cooldownMs;
}

export function parseDismissedAt(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export type PlatformCategory = "ios" | "chromium" | "desktop_other" | "unknown";
export type IosBrowserKind = "safari" | "chrome" | "other";

/**
 * Capability-leaning platform category. UA is only a fallback for iOS Safari
 * (no beforeinstallprompt). Prefer passing `hasStandaloneNavigator` from iOS.
 */
export function classifyPlatform(input: {
  userAgent: string;
  maxTouchPoints?: number;
  hasBeforeInstallPromptApi?: boolean;
}): PlatformCategory {
  const ua = input.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (ua.includes("Mac") && (input.maxTouchPoints ?? 0) > 1);
  if (iOS) return "ios";

  const android = /Android/i.test(ua);
  const chromeLike = /Chrome|CriOS|Edg|OPR|SamsungBrowser/i.test(ua);
  if (android && chromeLike) return "chromium";
  if (input.hasBeforeInstallPromptApi) return "chromium";

  if (/Windows|Macintosh|Linux/i.test(ua) && !android) return "desktop_other";
  return "unknown";
}

/** Distinguish iOS Safari vs Chrome (CriOS) for install instructions. */
export function classifyIosBrowser(userAgent: string): IosBrowserKind {
  const ua = userAgent || "";
  if (/CriOS/i.test(ua)) return "chrome";
  if (/FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua)) return "other";
  return "safari";
}

/** Localized public install guide route (not PWA shell). */
export function installPageHref(
  lang: string,
  input?: {
    audience?: InstallAudience;
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  }
): string {
  const params = new URLSearchParams();
  if (input?.audience) params.set("audience", input.audience);
  if (input?.source) params.set("utm_source", input.source);
  if (input?.medium) params.set("utm_medium", input.medium);
  if (input?.campaign) params.set("utm_campaign", input.campaign);
  if (input?.content) params.set("utm_content", input.content);
  const qs = params.toString();
  return qs ? `/${lang}/install?${qs}` : `/${lang}/install`;
}

export function shouldShowInstallCta(input: {
  isStandalone: boolean;
  installedFlag: boolean;
  dismissedAtMs: number | null;
  nowMs: number;
  canPrompt: boolean;
  platform: PlatformCategory;
  /** Advertising landing may still show an unsupported-browser hint. */
  allowUnsupportedHint?: boolean;
}): boolean {
  if (input.isStandalone) return false;
  if (input.installedFlag) return false;
  if (isDismissCoolingDown(input.dismissedAtMs, input.nowMs)) return false;
  if (input.canPrompt) return true;
  if (input.platform === "ios") return true;
  // Unsupported: no prompt and not iOS → hide working install button,
  // unless the surface explicitly needs a neutral fallback hint.
  if (input.allowUnsupportedHint) return true;
  return false;
}

export function preserveUtmParams(searchParams: URLSearchParams): string {
  const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "source", "campaign", "audience"];
  const next = new URLSearchParams();
  for (const key of keep) {
    const v = searchParams.get(key);
    if (v) next.set(key, v);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}
