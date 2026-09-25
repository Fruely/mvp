import {
  SERVICE_INTENT_DIRECTIONS,
  SERVICE_INTENT_FIELD_CODES,
  SERVICE_INTENT_LOCALES,
  SERVICE_INTENT_SAFETY_REASONS,
  SERVICE_INTENT_SAFETY_VERDICTS,
  SERVICE_INTENT_SOURCE_LANGUAGES,
  SERVICE_INTENT_WORK_FORMATS,
  type ServiceIntentDirection,
  type ServiceIntentFieldCode,
  type ServiceIntentLocale,
  type ServiceIntentSafetyReason,
  type ServiceIntentSafetyVerdict,
  type ServiceIntentSourceLanguage,
  type ServiceIntentWorkFormat,
} from "./contract";
import {
  SERVICE_INTENT_RELATIVE_DAYS,
  SERVICE_INTENT_TIMES_OF_DAY,
  SERVICE_INTENT_TIMING_KINDS,
  SERVICE_INTENT_TIMING_PERIODS,
  type ServiceIntentRelativeDay,
  type ServiceIntentTimeOfDay,
  type ServiceIntentTimingKind,
} from "./modelSchema";

/**
 * Defensive parsing of the model payload. Strict JSON Schema is a request to the
 * provider, not a guarantee, so every value is re-checked here. Anything the
 * model was not asked for is dropped: user text inside `raw_text` cannot inject
 * envelope fields or widen an enum.
 */

export type ServiceIntentModelTiming = {
  kind: ServiceIntentTimingKind;
  relative_day: ServiceIntentRelativeDay | null;
  weekday: number | null;
  absolute_date: string | null;
  absolute_date_end: string | null;
  time: string | null;
  after_time: string | null;
  time_of_day: ServiceIntentTimeOfDay | null;
  period: string | null;
  unresolved_expression: string | null;
};

export type ServiceIntentModelQuestion = {
  field_code: ServiceIntentFieldCode;
  text: string;
  options: string[];
  allow_no_preference: boolean;
};

export type ServiceIntentModelSafety = {
  verdict: ServiceIntentSafetyVerdict;
  reason_codes: ServiceIntentSafetyReason[];
  confidence: number;
};

export type ServiceIntentModelConfidence = {
  direction: number;
  requested_service: number;
  work_format: number;
  location: number;
  timing: number;
  budget: number;
  language: number;
};

export type ServiceIntentModelPayload = {
  direction: ServiceIntentDirection;
  requested_service: string | null;
  source_language: ServiceIntentSourceLanguage | null;
  preferred_language: ServiceIntentLocale | null;
  work_format: ServiceIntentWorkFormat | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  radius_km: number | null;
  timing: ServiceIntentModelTiming;
  availability_note: string | null;
  recurrence: string | null;
  budget_text: string | null;
  category_query: string | null;
  confidence: ServiceIntentModelConfidence;
  missing_fields: ServiceIntentFieldCode[];
  next_question: ServiceIntentModelQuestion | null;
  safety: ServiceIntentModelSafety;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function member<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function unit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function integerInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= min && value <= max ? value : null;
}

function parseTiming(value: unknown): ServiceIntentModelTiming | null {
  const source = record(value);
  if (!source) return null;
  const kind = member(source.kind, SERVICE_INTENT_TIMING_KINDS);
  if (!kind) return null;
  return {
    kind,
    relative_day: member(source.relative_day, SERVICE_INTENT_RELATIVE_DAYS),
    weekday: integerInRange(source.weekday, 1, 7),
    absolute_date: text(source.absolute_date, 10),
    absolute_date_end: text(source.absolute_date_end, 10),
    time: text(source.time, 5),
    after_time: text(source.after_time, 5),
    time_of_day: member(source.time_of_day, SERVICE_INTENT_TIMES_OF_DAY),
    period: member(source.period, SERVICE_INTENT_TIMING_PERIODS),
    unresolved_expression: text(source.unresolved_expression, 200),
  };
}

function parseQuestion(value: unknown): ServiceIntentModelQuestion | null {
  const source = record(value);
  if (!source) return null;
  const fieldCode = member(source.field_code, SERVICE_INTENT_FIELD_CODES);
  const questionText = text(source.text, 200);
  if (!fieldCode || !questionText) return null;

  const options: string[] = [];
  if (Array.isArray(source.options)) {
    for (const option of source.options.slice(0, 4)) {
      const label = text(option, 40);
      if (label && !options.includes(label)) options.push(label);
    }
  }

  return {
    field_code: fieldCode,
    text: questionText,
    options,
    allow_no_preference: source.allow_no_preference === true,
  };
}

function parseSafety(value: unknown): ServiceIntentModelSafety | null {
  const source = record(value);
  if (!source) return null;
  const verdict = member(source.verdict, SERVICE_INTENT_SAFETY_VERDICTS);
  if (!verdict) return null;

  const reasons: ServiceIntentSafetyReason[] = [];
  if (Array.isArray(source.reason_codes)) {
    for (const entry of source.reason_codes.slice(0, 5)) {
      const reason = member(entry, SERVICE_INTENT_SAFETY_REASONS);
      if (reason && !reasons.includes(reason)) reasons.push(reason);
    }
  }

  return { verdict, reason_codes: reasons, confidence: unit(source.confidence) };
}

function parseConfidence(value: unknown): ServiceIntentModelConfidence {
  const source = record(value) ?? {};
  return {
    direction: unit(source.direction),
    requested_service: unit(source.requested_service),
    work_format: unit(source.work_format),
    location: unit(source.location),
    timing: unit(source.timing),
    budget: unit(source.budget),
    language: unit(source.language),
  };
}

/** Returns null when the payload is unusable, which the caller maps to a schema mismatch. */
export function parseServiceIntentModelPayload(value: unknown): ServiceIntentModelPayload | null {
  const source = record(value);
  if (!source) return null;

  const direction = member(source.direction, SERVICE_INTENT_DIRECTIONS);
  if (!direction) return null;

  const timing = parseTiming(source.timing);
  if (!timing) return null;

  const safety = parseSafety(source.safety);
  if (!safety) return null;

  const missing: ServiceIntentFieldCode[] = [];
  if (Array.isArray(source.missing_fields)) {
    for (const entry of source.missing_fields) {
      const code = member(entry, SERVICE_INTENT_FIELD_CODES);
      if (code && !missing.includes(code)) missing.push(code);
    }
  }

  const countryCode = text(source.country_code, 2);

  return {
    direction,
    requested_service: text(source.requested_service, 200),
    source_language: member(source.source_language, SERVICE_INTENT_SOURCE_LANGUAGES),
    preferred_language: member(source.preferred_language, SERVICE_INTENT_LOCALES),
    work_format: member(source.work_format, SERVICE_INTENT_WORK_FORMATS),
    city: text(source.city, 120),
    postal_code: text(source.postal_code, 16),
    country_code: countryCode ? countryCode.toUpperCase() : null,
    radius_km: integerInRange(source.radius_km, 1, 500),
    timing,
    availability_note: text(source.availability_note, 300),
    recurrence: text(source.recurrence, 120),
    budget_text: text(source.budget_text, 120),
    category_query: text(source.category_query, 120),
    confidence: parseConfidence(source.confidence),
    missing_fields: missing,
    next_question: parseQuestion(source.next_question),
    safety,
  };
}
