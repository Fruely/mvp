export const ACQUISITION_COOKIE_NAME = "freuly_acquisition_v1";
export const ACQUISITION_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export type AcquisitionFirstTouch = {
  source: string;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  landing_path: string;
  captured_at: string;
};

const MAX_SOURCE = 80;
const MAX_MEDIUM = 80;
const MAX_CAMPAIGN = 160;
const MAX_REFERRER = 500;
const MAX_LANDING = 500;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

export function classifyReferrerSource(referrer: string | null): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "google.com" || host.endsWith(".google.com")) return "google";
    if (host === "threads.net" || host.endsWith(".threads.net")) return "threads";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com") return "facebook";
    if (host === "t.me" || host === "telegram.me" || host.endsWith(".telegram.org")) return "telegram";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
    if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
    return host || "referral";
  } catch {
    return "referral";
  }
}

export function buildAcquisitionFirstTouch(input: {
  href: string;
  referrer?: string | null;
  ownHostname?: string | null;
  capturedAt?: string;
}): AcquisitionFirstTouch | null {
  try {
    const url = new URL(input.href);
    const ownHostname = (input.ownHostname ?? url.hostname).toLowerCase();
    const rawReferrer = clean(input.referrer, MAX_REFERRER);
    let externalReferrer: string | null = rawReferrer;

    if (rawReferrer) {
      try {
        const refHost = new URL(rawReferrer).hostname.toLowerCase();
        if (refHost === ownHostname) externalReferrer = null;
      } catch {
        externalReferrer = null;
      }
    }

    const utmSource = clean(url.searchParams.get("utm_source"), MAX_SOURCE);
    const utmMedium = clean(url.searchParams.get("utm_medium"), MAX_MEDIUM);
    const utmCampaign = clean(url.searchParams.get("utm_campaign"), MAX_CAMPAIGN);
    const landingPath = clean(`${url.pathname}${url.search}`, MAX_LANDING) ?? "/";

    return {
      source: (utmSource ?? classifyReferrerSource(externalReferrer)).toLowerCase(),
      medium: utmMedium,
      campaign: utmCampaign,
      referrer: externalReferrer,
      landing_path: landingPath,
      captured_at: input.capturedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeAcquisitionCookie(value: AcquisitionFirstTouch): string {
  return encodeURIComponent(JSON.stringify(value));
}

export function parseAcquisitionCookie(raw: string | null | undefined): AcquisitionFirstTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const source = clean(parsed.source, MAX_SOURCE);
    const landingPath = clean(parsed.landing_path, MAX_LANDING);
    const capturedAt = clean(parsed.captured_at, 64);
    if (!source || !landingPath || !capturedAt) return null;

    return {
      source: source.toLowerCase(),
      medium: clean(parsed.medium, MAX_MEDIUM),
      campaign: clean(parsed.campaign, MAX_CAMPAIGN),
      referrer: clean(parsed.referrer, MAX_REFERRER),
      landing_path: landingPath,
      captured_at: capturedAt,
    };
  } catch {
    return null;
  }
}
