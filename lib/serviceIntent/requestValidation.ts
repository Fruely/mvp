import { DESCRIPTION_MAX_LEN } from "@/lib/serviceRequests/constants";
import {
  SERVICE_INTENT_FIELD_CODES,
  SERVICE_INTENT_LOCALES,
  SERVICE_INTENT_WORK_FORMATS,
  type ServiceIntentFieldCode,
  type ServiceIntentLocale,
  type ServiceIntentWorkFormat,
} from "./contract";

/**
 * Programmatic validation that runs before any AI call, so malformed or
 * oversized input never costs a model request.
 */

export const SERVICE_INTENT_RAW_TEXT_MAX_LEN = DESCRIPTION_MAX_LEN;

const ALLOWED_BODY_KEYS = ["raw_text", "locale", "time_zone", "known_context"] as const;

/** Only non-personal form data the client already knows. No name, email or phone. */
const ALLOWED_CONTEXT_KEYS = [
  "work_format",
  "city",
  "postal_code",
  "country_code",
  "radius_km",
  "preferred_language",
  "resolved_fields",
] as const;

export type ServiceIntentKnownContext = {
  work_format: ServiceIntentWorkFormat | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  radius_km: number | null;
  preferred_language: ServiceIntentLocale | null;
  /** Field codes the person already settled, including an explicit "no preference". */
  resolved_fields: ServiceIntentFieldCode[];
};

export type ServiceIntentExtractInput = {
  rawText: string;
  locale: ServiceIntentLocale;
  timeZone: string;
  knownContext: ServiceIntentKnownContext;
};

export type ServiceIntentValidationError =
  | { code: "invalid_request"; field: string }
  | { code: "unsupported_locale" }
  | { code: "invalid_time_zone" };

export type ServiceIntentValidationResult =
  | { ok: true; input: ServiceIntentExtractInput }
  | { ok: false; error: ServiceIntentValidationError };

export function isValidIanaTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function optionalString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) return undefined;
  return trimmed;
}

function parseKnownContext(
  value: unknown,
): { ok: true; context: ServiceIntentKnownContext } | { ok: false; field: string } {
  const empty: ServiceIntentKnownContext = {
    work_format: null,
    city: null,
    postal_code: null,
    country_code: null,
    radius_km: null,
    preferred_language: null,
    resolved_fields: [],
  };

  if (value === undefined || value === null) return { ok: true, context: empty };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, field: "known_context" };
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(ALLOWED_CONTEXT_KEYS as readonly string[]).includes(key)) {
      return { ok: false, field: `known_context.${key}` };
    }
  }

  const workFormat = record.work_format;
  if (workFormat !== undefined && workFormat !== null) {
    if (
      typeof workFormat !== "string" ||
      !(SERVICE_INTENT_WORK_FORMATS as readonly string[]).includes(workFormat)
    ) {
      return { ok: false, field: "known_context.work_format" };
    }
    empty.work_format = workFormat as ServiceIntentWorkFormat;
  }

  const city = optionalString(record.city, 120);
  if (city === undefined) return { ok: false, field: "known_context.city" };
  empty.city = city;

  const postalCode = optionalString(record.postal_code, 16);
  if (postalCode === undefined) return { ok: false, field: "known_context.postal_code" };
  empty.postal_code = postalCode;

  const countryCode = optionalString(record.country_code, 2);
  if (countryCode === undefined) return { ok: false, field: "known_context.country_code" };
  empty.country_code = countryCode ? countryCode.toUpperCase() : null;

  const radius = record.radius_km;
  if (radius !== undefined && radius !== null) {
    if (typeof radius !== "number" || !Number.isInteger(radius) || radius < 1 || radius > 500) {
      return { ok: false, field: "known_context.radius_km" };
    }
    empty.radius_km = radius;
  }

  const preferredLanguage = record.preferred_language;
  if (preferredLanguage !== undefined && preferredLanguage !== null) {
    if (
      typeof preferredLanguage !== "string" ||
      !(SERVICE_INTENT_LOCALES as readonly string[]).includes(preferredLanguage)
    ) {
      return { ok: false, field: "known_context.preferred_language" };
    }
    empty.preferred_language = preferredLanguage as ServiceIntentLocale;
  }

  const resolved = record.resolved_fields;
  if (resolved !== undefined && resolved !== null) {
    if (!Array.isArray(resolved) || resolved.length > SERVICE_INTENT_FIELD_CODES.length) {
      return { ok: false, field: "known_context.resolved_fields" };
    }
    const codes: ServiceIntentFieldCode[] = [];
    for (const entry of resolved) {
      if (
        typeof entry !== "string" ||
        !(SERVICE_INTENT_FIELD_CODES as readonly string[]).includes(entry)
      ) {
        return { ok: false, field: "known_context.resolved_fields" };
      }
      if (!codes.includes(entry as ServiceIntentFieldCode)) {
        codes.push(entry as ServiceIntentFieldCode);
      }
    }
    empty.resolved_fields = codes;
  }

  return { ok: true, context: empty };
}

export function validateServiceIntentExtractRequest(
  body: unknown,
): ServiceIntentValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: { code: "invalid_request", field: "body" } };
  }

  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(ALLOWED_BODY_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: { code: "invalid_request", field: key } };
    }
  }

  const rawText = record.raw_text;
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { ok: false, error: { code: "invalid_request", field: "raw_text" } };
  }
  if (rawText.length > SERVICE_INTENT_RAW_TEXT_MAX_LEN) {
    return { ok: false, error: { code: "invalid_request", field: "raw_text" } };
  }

  const locale = record.locale;
  if (
    typeof locale !== "string" ||
    !(SERVICE_INTENT_LOCALES as readonly string[]).includes(locale)
  ) {
    return { ok: false, error: { code: "unsupported_locale" } };
  }

  if (!isValidIanaTimeZone(record.time_zone)) {
    return { ok: false, error: { code: "invalid_time_zone" } };
  }

  const context = parseKnownContext(record.known_context);
  if (!context.ok) {
    return { ok: false, error: { code: "invalid_request", field: context.field } };
  }

  return {
    ok: true,
    input: {
      // Preserved exactly: the response must return the original bytes.
      rawText,
      locale: locale as ServiceIntentLocale,
      timeZone: record.time_zone as string,
      knownContext: context.context,
    },
  };
}
