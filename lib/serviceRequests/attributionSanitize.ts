import {
  ATTRIBUTION_UTM_KEYS,
  ATTRIBUTION_UTM_LIMITS,
  type AttributionUtmKey,
  type SanitizedUtmFields,
} from "./attributionConstants";

const REFERRER_HOST_MAX_LEN = 255;

function removeControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function sanitizeUtmValue(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = removeControlCharacters(value.trim());
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

export function sanitizeUtmFields(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): SanitizedUtmFields {
  const read = (key: AttributionUtmKey): string | null => {
    const raw =
      input instanceof URLSearchParams
        ? input.get(key)
        : typeof input[key] === "string"
          ? input[key]
          : null;
    return sanitizeUtmValue(raw, ATTRIBUTION_UTM_LIMITS[key]);
  };

  return {
    utm_source: read("utm_source"),
    utm_medium: read("utm_medium"),
    utm_campaign: read("utm_campaign"),
    utm_content: read("utm_content"),
  };
}

/** Hostname only — no protocol, path, query, fragment, or credentials. */
export function parseReferrerHost(referer: string | null | undefined): string | null {
  if (!referer || !referer.trim()) return null;
  try {
    const hostname = new URL(referer).hostname.trim().toLowerCase();
    if (!hostname) return null;
    return hostname.slice(0, REFERRER_HOST_MAX_LEN);
  } catch {
    return null;
  }
}

export function buildCaptureQueryString(
  lang: string,
  publicToken: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("public_token", publicToken.trim());
  for (const key of ATTRIBUTION_UTM_KEYS) {
    const raw = searchParams[key];
    if (typeof raw === "string" && raw.trim()) {
      params.set(key, raw);
    }
  }
  return params.toString();
}
