/**
 * Pure helpers for PWA install UX (safe for Node tests / SSR).
 * Browser-only APIs stay in the InstallFreuly client component.
 */

/** Dismiss timestamp (ms since epoch). Fresh dismiss hides for INSTALL_DISMISS_COOLDOWN_MS. */
export const INSTALL_DISMISS_KEY = "freuly_pwa_install_dismissed_at";
/**
 * Legacy permanent "installed" flag (`"1"`). Kept for migration cleanup only —
 * browser-tab visibility must not trust this forever (see migrateInstallState).
 */
export const INSTALL_DONE_KEY = "freuly_pwa_installed";
/** Schema version for install localStorage. Bump when keys/semantics change. */
export const INSTALL_STATE_VERSION_KEY = "freuly_pwa_state_version";
export const INSTALL_STATE_VERSION = 2;
export const INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Known legacy / incompatible keys removed during migration to v2. */
export const INSTALL_LEGACY_KEYS = [
  INSTALL_DONE_KEY,
  // Historical aliases that may exist from earlier experiments / copies
  "freuly_pwa_dismissed",
  "freuly_pwa_install_dismissed",
  "freuly_install_dismissed",
  "freuly_pwa_installed_at",
] as const;

export type InstallerStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

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

/**
 * Parse dismiss storage.
 * - numeric timestamp → ms
 * - legacy boolean-like ("1", "true", "yes") → treated as permanent dismiss → null
 *   after migration (caller clears key); parse itself returns null so it does not
 *   invent a fake "fresh" cooldown.
 */
export function parseDismissedAt(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (trimmed === "1" || trimmed === "true" || trimmed === "yes") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // Reject absurdly small values that are not epoch-ms timestamps
  if (n > 0 && n < 1_000_000_000_000) return null;
  return n;
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
    /** Optional guide focus, e.g. android fallback from home CTA. */
    platform?: "android" | "ios";
  }
): string {
  const params = new URLSearchParams();
  if (input?.audience) params.set("audience", input.audience);
  if (input?.source) params.set("utm_source", input.source);
  if (input?.medium) params.set("utm_medium", input.medium);
  if (input?.campaign) params.set("utm_campaign", input.campaign);
  if (input?.content) params.set("utm_content", input.content);
  if (input?.platform) params.set("platform", input.platform);
  const qs = params.toString();
  return qs ? `/${lang}/install?${qs}` : `/${lang}/install`;
}

export type MigrateInstallStateResult = {
  migrated: boolean;
  version: number;
  /** Dismiss timestamp to use after migration (null = none / expired / cleared). */
  dismissedAtMs: number | null;
  /** Cleared stale installed flag in browser mode. */
  clearedInstalledFlag: boolean;
};

/**
 * One-time (per version) migration of install localStorage.
 * - Clears permanent installed flag in non-standalone browser tabs
 * - Clears legacy permanent dismiss values
 * - Keeps a valid dismiss timestamp only if younger than 7-day cooldown
 * - Writes INSTALL_STATE_VERSION so migration does not re-run
 */
export function migrateInstallState(
  storage: InstallerStorage,
  input: { isStandalone: boolean; nowMs: number }
): MigrateInstallStateResult {
  const currentVersion = Number(storage.getItem(INSTALL_STATE_VERSION_KEY) || "0");
  const alreadyCurrent = currentVersion >= INSTALL_STATE_VERSION;

  let clearedInstalledFlag = false;
  const rawInstalled = storage.getItem(INSTALL_DONE_KEY);
  // In a normal browser tab, never trust a permanent installed flag.
  if (!input.isStandalone && rawInstalled != null) {
    storage.removeItem(INSTALL_DONE_KEY);
    clearedInstalledFlag = true;
  }

  const rawDismiss = storage.getItem(INSTALL_DISMISS_KEY);
  let dismissedAtMs = parseDismissedAt(rawDismiss);

  // Legacy boolean dismiss stored in the timestamp key (or siblings)
  const legacyBooleanDismiss =
    rawDismiss != null &&
    ["1", "true", "yes"].includes(String(rawDismiss).trim().toLowerCase());

  if (legacyBooleanDismiss) {
    storage.removeItem(INSTALL_DISMISS_KEY);
    dismissedAtMs = null;
  } else if (dismissedAtMs != null) {
    if (!isDismissCoolingDown(dismissedAtMs, input.nowMs)) {
      // Stale dismiss older than cooldown — clear so it cannot linger forever
      storage.removeItem(INSTALL_DISMISS_KEY);
      dismissedAtMs = null;
    }
  } else if (rawDismiss != null && dismissedAtMs == null) {
    // Unparseable dismiss value
    storage.removeItem(INSTALL_DISMISS_KEY);
  }

  // Remove other legacy keys (never reintroduce them)
  for (const key of INSTALL_LEGACY_KEYS) {
    if (key === INSTALL_DONE_KEY && input.isStandalone) continue;
    if (storage.getItem(key) != null) storage.removeItem(key);
  }

  if (!alreadyCurrent) {
    storage.setItem(INSTALL_STATE_VERSION_KEY, String(INSTALL_STATE_VERSION));
  }

  return {
    migrated: !alreadyCurrent || clearedInstalledFlag || legacyBooleanDismiss,
    version: INSTALL_STATE_VERSION,
    dismissedAtMs,
    clearedInstalledFlag,
  };
}

/**
 * Read dismiss + installed signals after migration.
 * installedFlag is only meaningful while already in standalone (optimization);
 * browser tabs always get installedFlag=false after migrateInstallState.
 */
export function readInstallVisibilityState(
  storage: InstallerStorage,
  input: { isStandalone: boolean; nowMs: number }
): {
  dismissedAtMs: number | null;
  installedFlag: boolean;
  migration: MigrateInstallStateResult;
} {
  const migration = migrateInstallState(storage, input);
  const dismissedAtMs =
    migration.dismissedAtMs ?? parseDismissedAt(storage.getItem(INSTALL_DISMISS_KEY));
  // Never hide browser-tab UX via permanent installed flag.
  const installedFlag = input.isStandalone
    ? storage.getItem(INSTALL_DONE_KEY) === "1"
    : false;
  return { dismissedAtMs, installedFlag, migration };
}

/**
 * Visibility for the install surface (card/banner), not the native prompt.
 * Android (chromium) must stay visible even before beforeinstallprompt —
 * otherwise the whole block returns null when the event is late or missed.
 *
 * Installed state: prefer live standalone detection. A stored installedFlag
 * must not permanently hide the banner in a normal browser tab.
 */
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
  // installedFlag is intentionally ignored for browser-tab visibility.
  // Live standalone (above) is the source of truth; localStorage "installed"
  // is cleared by migrateInstallState in non-standalone mode.
  void input.installedFlag;
  if (isDismissCoolingDown(input.dismissedAtMs, input.nowMs)) return false;
  if (input.canPrompt) return true;
  if (input.platform === "ios") return true;
  // Android Chrome (and Chromium installable browsers): show CTA with native
  // prompt when available, otherwise guide/fallback — never hide the block.
  if (input.platform === "chromium") return true;
  // Unsupported desktop: hide working install button unless the surface
  // explicitly needs a neutral fallback hint (install page).
  if (input.allowUnsupportedHint) return true;
  return false;
}

export function preserveUtmParams(searchParams: URLSearchParams): string {
  const keep = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "source",
    "campaign",
    "audience",
    "platform",
  ];
  const next = new URLSearchParams();
  for (const key of keep) {
    const v = searchParams.get(key);
    if (v) next.set(key, v);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}
