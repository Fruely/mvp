import { SERVICE_TIMING_PERIODS } from "@/lib/serviceRequests/serviceTiming";
import {
  SERVICE_INTENT_DIRECTIONS,
  SERVICE_INTENT_FIELD_CODES,
  SERVICE_INTENT_LOCALES,
  SERVICE_INTENT_SAFETY_REASONS,
  SERVICE_INTENT_SAFETY_VERDICTS,
  SERVICE_INTENT_SOURCE_LANGUAGES,
  SERVICE_INTENT_WORK_FORMATS,
} from "./contract";

/**
 * Strict JSON Schema the provider must satisfy. Every property is required and
 * `additionalProperties` is false everywhere, because strict mode demands it;
 * optionality is expressed as an explicit null union instead.
 *
 * The model is deliberately not asked for `schema_version`, `extraction_version`
 * or `raw_text`: those belong to the server, so user text cannot rewrite them.
 *
 * Timing is requested as a descriptor rather than a resolved date. The model
 * reports what the person said; the server owns the calendar arithmetic and maps
 * the descriptor onto the existing platform timing types.
 */

export const SERVICE_INTENT_MODEL_SCHEMA_NAME = "freuly_service_intent_v1";

export const SERVICE_INTENT_TIMING_KINDS = [
  "asap",
  "relative_day",
  "absolute_date",
  "date_range",
  "period",
  "unknown",
] as const;
export type ServiceIntentTimingKind = (typeof SERVICE_INTENT_TIMING_KINDS)[number];

export const SERVICE_INTENT_RELATIVE_DAYS = [
  "today",
  "tomorrow",
  "day_after_tomorrow",
  "next_weekday",
] as const;
export type ServiceIntentRelativeDay = (typeof SERVICE_INTENT_RELATIVE_DAYS)[number];

export const SERVICE_INTENT_TIMES_OF_DAY = [
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
] as const;
export type ServiceIntentTimeOfDay = (typeof SERVICE_INTENT_TIMES_OF_DAY)[number];

/** The existing timing periods; no second timing vocabulary is introduced. */
export const SERVICE_INTENT_TIMING_PERIODS = SERVICE_TIMING_PERIODS;

export function nullableString(description: string): Record<string, unknown> {
  return { type: ["string", "null"], description };
}

export function nullableEnum(
  values: readonly string[],
  description: string,
): Record<string, unknown> {
  return { type: ["string", "null"], enum: [...values, null], description };
}

export function unitConfidence(description: string): Record<string, unknown> {
  return { type: "number", minimum: 0, maximum: 1, description };
}

/** Strict mode requires every property to be listed in `required`. */
export function objectSchema(
  properties: Record<string, unknown>,
  description?: string,
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
    ...(description ? { description } : {}),
  };
}

const TIMING_SCHEMA = objectSchema(
  {
    kind: {
      type: "string",
      enum: [...SERVICE_INTENT_TIMING_KINDS],
      description:
        "What kind of timing the person expressed. Use 'unknown' when no timing was stated.",
    },
    relative_day: nullableEnum(
      SERVICE_INTENT_RELATIVE_DAYS,
      "Only for kind=relative_day. Use next_weekday together with weekday.",
    ),
    weekday: {
      type: ["integer", "null"],
      minimum: 1,
      maximum: 7,
      description: "ISO weekday, 1 = Monday .. 7 = Sunday. Only with relative_day=next_weekday.",
    },
    absolute_date: nullableString(
      "Calendar date as YYYY-MM-DD, only when the person named an explicit date.",
    ),
    absolute_date_end: nullableString("End of a range as YYYY-MM-DD, only for kind=date_range."),
    time: nullableString("Exact clock time as HH:MM in 24-hour form, only if an exact time was named."),
    after_time: nullableString(
      "Earliest acceptable clock time as HH:MM, for wordings like 'after 18:00'.",
    ),
    time_of_day: nullableEnum(
      SERVICE_INTENT_TIMES_OF_DAY,
      "Coarse part of the day when no clock time was given.",
    ),
    period: nullableEnum(
      SERVICE_INTENT_TIMING_PERIODS,
      "Only for kind=period, e.g. 'within a month' maps to next_month.",
    ),
    unresolved_expression: nullableString(
      "The original wording when it cannot be expressed by the fields above, e.g. 'when it gets warm'.",
    ),
  },
  "Timing descriptor. Never compute dates yourself; report what was said.",
);

const QUESTION_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["field_code", "text", "options", "allow_no_preference"],
  properties: {
    field_code: {
      type: "string",
      enum: [...SERVICE_INTENT_FIELD_CODES],
      description: "Which single piece of information the question asks for.",
    },
    text: {
      type: "string",
      description: "One short question in the interface language. Never ask for name, email or phone.",
    },
    options: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
      description: "Optional short answer options. Empty array when a free answer is expected.",
    },
    allow_no_preference: {
      type: "boolean",
      description: "True when 'does not matter' is a sensible answer.",
    },
  },
  description: "At most one clarifying question, or null when the data is sufficient.",
};

const SAFETY_SCHEMA = objectSchema(
  {
    verdict: {
      type: "string",
      enum: [...SERVICE_INTENT_SAFETY_VERDICTS],
      description:
        "Preliminary only. Licensed professions are restricted or manual_review, never blocked. Doubt is manual_review.",
    },
    reason_codes: {
      type: "array",
      maxItems: 5,
      items: { type: "string", enum: [...SERVICE_INTENT_SAFETY_REASONS] },
      description: "Stable reason codes. Empty array for an ordinary request.",
    },
    confidence: unitConfidence("How certain the safety assessment is."),
  },
  "Preliminary safety signal. It decides nothing on its own.",
);

const CONFIDENCE_SCHEMA = objectSchema(
  {
    direction: unitConfidence("Certainty that the direction is correct."),
    requested_service: unitConfidence("Certainty about the named service."),
    work_format: unitConfidence("Certainty about online, offline or hybrid."),
    location: unitConfidence("Certainty about the place."),
    timing: unitConfidence("Certainty about the timing."),
    budget: unitConfidence("Certainty about the budget wording."),
    language: unitConfidence("Certainty about the language values."),
  },
  "Per-value confidence between 0 and 1.",
);

export const SERVICE_INTENT_MODEL_SCHEMA = objectSchema({
  direction: {
    type: "string",
    enum: [...SERVICE_INTENT_DIRECTIONS],
    description: "'need' when someone looks for a service, 'offer' when someone offers one.",
  },
  requested_service: nullableString(
    "Normalized service name in the language of the source text, e.g. 'Сантехник'.",
  ),
  source_language: nullableEnum(
    SERVICE_INTENT_SOURCE_LANGUAGES,
    "Language the person actually wrote in. Use 'mixed' for genuinely mixed text.",
  ),
  preferred_language: nullableEnum(
    SERVICE_INTENT_LOCALES,
    "Desired communication language, only when named or reliably implied. Otherwise null.",
  ),
  work_format: nullableEnum(
    SERVICE_INTENT_WORK_FORMATS,
    "Never use 'hybrid' to mean unknown or any format. Use null when undetermined.",
  ),
  city: nullableString("City or district exactly as understood from the text."),
  postal_code: nullableString("Postal code when stated."),
  country_code: nullableString("Two-letter country code when it follows from the text."),
  radius_km: {
    type: ["integer", "null"],
    minimum: 1,
    maximum: 500,
    description: "Acceptable travel radius in kilometres when stated.",
  },
  timing: TIMING_SCHEMA,
  availability_note: nullableString(
    "Short note about availability, e.g. 'only evenings', in the source language.",
  ),
  recurrence: nullableString("Repetition or other material time condition, e.g. 'every week'."),
  budget_text: nullableString("Budget exactly as the person expressed it, as text."),
  category_query: nullableString(
    "Short search query describing the service, used internally to match a catalogue category.",
  ),
  confidence: CONFIDENCE_SCHEMA,
  missing_fields: {
    type: "array",
    maxItems: 6,
    items: { type: "string", enum: [...SERVICE_INTENT_FIELD_CODES] },
    description:
      "Critical data that is genuinely missing and matters for matching. Never include contact details.",
  },
  next_question: QUESTION_SCHEMA,
  safety: SAFETY_SCHEMA,
});
