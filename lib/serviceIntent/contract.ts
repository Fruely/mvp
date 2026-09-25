import type { ServiceTimingFields } from "@/lib/serviceRequests/serviceTiming";

/**
 * Versioned contract of `POST /api/intent/extract`.
 *
 * `schema_version`, `extraction_version` and `raw_text` are server-owned: the
 * model never supplies them, so user text cannot rewrite the envelope.
 */
export const SERVICE_INTENT_SCHEMA_VERSION = 1;
export const SERVICE_INTENT_EXTRACTION_VERSION = "service-intent-extract-1";

export const SERVICE_INTENT_LOCALES = ["ru", "ua", "de"] as const;
export type ServiceIntentLocale = (typeof SERVICE_INTENT_LOCALES)[number];

export const SERVICE_INTENT_DIRECTIONS = ["need", "offer"] as const;
export type ServiceIntentDirection = (typeof SERVICE_INTENT_DIRECTIONS)[number];

export const SERVICE_INTENT_WORK_FORMATS = ["online", "offline", "hybrid"] as const;
export type ServiceIntentWorkFormat = (typeof SERVICE_INTENT_WORK_FORMATS)[number];

/** Language of the text the person wrote, independent of interface locale. */
export const SERVICE_INTENT_SOURCE_LANGUAGES = ["ru", "ua", "de", "mixed", "other"] as const;
export type ServiceIntentSourceLanguage = (typeof SERVICE_INTENT_SOURCE_LANGUAGES)[number];

/** Data points extraction can report as missing. Contacts are never included. */
export const SERVICE_INTENT_FIELD_CODES = [
  "requested_service",
  "work_format",
  "location",
  "timing",
  "preferred_language",
  "service_detail",
] as const;
export type ServiceIntentFieldCode = (typeof SERVICE_INTENT_FIELD_CODES)[number];

export const SERVICE_INTENT_SAFETY_VERDICTS = [
  "allowed",
  "restricted",
  "manual_review",
  "blocked",
] as const;
export type ServiceIntentSafetyVerdict = (typeof SERVICE_INTENT_SAFETY_VERDICTS)[number];

export const SERVICE_INTENT_SAFETY_REASONS = [
  "weapons",
  "drugs",
  "violence",
  "sexual_services",
  "fraud",
  "self_harm",
  "medical",
  "legal",
  "financial",
  "veterinary",
  "other_licensed",
  "unclear_intent",
  "unusable_content",
] as const;
export type ServiceIntentSafetyReason = (typeof SERVICE_INTENT_SAFETY_REASONS)[number];

/**
 * Regulated but legitimate professions. A licensed-profession signal alone must
 * never auto-block a request; a human decides.
 */
export const SERVICE_INTENT_LICENSED_REASONS: readonly ServiceIntentSafetyReason[] = [
  "medical",
  "legal",
  "financial",
  "veterinary",
  "other_licensed",
];

/** Stable user-message codes. The client localizes them; no provider text leaks. */
export const SERVICE_INTENT_SAFETY_MESSAGE_CODES = [
  "safety_ok",
  "safety_needs_details",
  "safety_licensed_service",
  "safety_manual_review",
  "safety_not_supported",
] as const;
export type ServiceIntentSafetyMessageCode =
  (typeof SERVICE_INTENT_SAFETY_MESSAGE_CODES)[number];

export type ServiceIntentSafety = {
  verdict: ServiceIntentSafetyVerdict;
  reason_codes: ServiceIntentSafetyReason[];
  confidence: number;
  message_code: ServiceIntentSafetyMessageCode;
};

export type ServiceIntentQuestion = {
  field_code: ServiceIntentFieldCode;
  text: string;
  options: string[];
  allow_no_preference: boolean;
};

export type ServiceIntentLocation = {
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  radius_km: number | null;
};

export type ServiceIntentCategory = {
  query: string | null;
  id: string | null;
  text: string | null;
};

export type ServiceIntentConfidence = {
  direction: number;
  requested_service: number;
  work_format: number;
  location: number;
  timing: number;
  budget: number;
  language: number;
};

export type ServiceIntentExtraction = {
  ok: true;
  schema_version: number;
  extraction_version: string;
  direction: ServiceIntentDirection;
  /** Byte-identical to the request `raw_text`. */
  raw_text: string;
  requested_service: string | null;
  source_language: ServiceIntentSourceLanguage | null;
  /** Only set when the person named it or it reliably follows from the request. */
  preferred_language: ServiceIntentLocale | null;
  work_format: ServiceIntentWorkFormat | null;
  location: ServiceIntentLocation;
  /** Existing platform timing domain; no second timing model. */
  timing: ServiceTimingFields;
  /** Canonical availability text. `timing.service_timing_note` is derived from it. */
  availability_note: string | null;
  recurrence: string | null;
  budget_text: string | null;
  category: ServiceIntentCategory;
  confidence: ServiceIntentConfidence;
  missing_fields: ServiceIntentFieldCode[];
  next_question: ServiceIntentQuestion | null;
  safety: ServiceIntentSafety;
};

export function isServiceIntentLocale(value: unknown): value is ServiceIntentLocale {
  return (
    typeof value === "string" &&
    (SERVICE_INTENT_LOCALES as readonly string[]).includes(value)
  );
}
