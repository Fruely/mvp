/**
 * Thin analytics adapter for PWA install events.
 * Uses existing window.gtag (ConsentScripts / GA4) when available; otherwise no-op.
 * Never sends PII.
 */

export type PwaInstallEventName =
  | "pwa_install_cta_view"
  | "pwa_install_cta_click"
  | "pwa_install_prompt_shown"
  | "pwa_install_accepted"
  | "pwa_install_dismissed"
  | "pwa_ios_instructions_opened"
  | "pwa_app_installed";

export type PwaInstallEventParams = {
  placement?: string;
  audience?: string;
  language?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  display_mode?: string;
  platform?: string;
  variant?: string;
};

export function trackPwaInstallEvent(
  name: PwaInstallEventName,
  params: PwaInstallEventParams = {}
): void {
  if (typeof window === "undefined") return;
  try {
    const gtag = window.gtag;
    if (typeof gtag !== "function") return;
    gtag("event", name, {
      ...params,
      event_category: "pwa_install",
    });
  } catch {
    // no-op
  }
}
