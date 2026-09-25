import { sanitizeFreeText } from "@/lib/ai/textSanitize";
import {
  SERVICE_INTENT_EXTRACTION_VERSION,
  SERVICE_INTENT_SCHEMA_VERSION,
  type ServiceIntentCategory,
  type ServiceIntentExtraction,
  type ServiceIntentFieldCode,
  type ServiceIntentWorkFormat,
} from "./contract";
import type { ServiceIntentErrorCode } from "./errors";
import type { ServiceIntentModelPayload } from "./modelResponse";
import { selectNextQuestion } from "./nextQuestion";
import {
  buildServiceIntentUserPayload,
  SERVICE_INTENT_SYSTEM_PROMPT,
} from "./prompt";
import type { ServiceIntentExtractInput } from "./requestValidation";
import { isUnusableContent, normalizeModelSafety, unusableContentSafety } from "./safety";
import {
  calendarDateInTimeZone,
  calendarDateToIso,
  isoWeekday,
  resolveIntentTiming,
} from "./timingResolver";

/**
 * Orchestrates one extraction. Every external effect is injected, so the whole
 * flow is testable without a paid call and the endpoint stays side-effect free:
 * nothing is written to `service_requests`, nothing is published, nobody is
 * notified.
 */

export type ServiceIntentModelCall =
  | { ok: true; payload: ServiceIntentModelPayload }
  | { ok: false; code: Extract<ServiceIntentErrorCode, "ai_unavailable" | "ai_timeout" | "invalid_model_response"> };

export type ServiceIntentCategoryLookup = (
  query: string,
  locale: string,
) => Promise<{ id: string; text: string } | null>;

export type ServiceIntentExtractionDeps = {
  now: () => Date;
  callModel: (request: {
    systemPrompt: string;
    userPayload: Record<string, unknown>;
  }) => Promise<ServiceIntentModelCall>;
  lookupCategory?: ServiceIntentCategoryLookup;
};

export type ServiceIntentExtractionResult =
  | { ok: true; extraction: ServiceIntentExtraction; modelCalled: boolean }
  | { ok: false; code: ServiceIntentErrorCode };

/** A category is only guessed from a query long enough to mean something. */
const MIN_CATEGORY_QUERY_LENGTH = 3;

function emptyCategory(query: string | null): ServiceIntentCategory {
  return { query, id: null, text: null };
}

async function resolveCategory(
  payload: ServiceIntentModelPayload,
  locale: string,
  lookup: ServiceIntentCategoryLookup | undefined,
): Promise<ServiceIntentCategory> {
  const query = payload.category_query ?? payload.requested_service;
  if (!query || query.trim().length < MIN_CATEGORY_QUERY_LENGTH || !lookup) {
    return emptyCategory(query);
  }

  try {
    const match = await lookup(query, locale);
    if (!match) return emptyCategory(query);
    return { query, id: match.id, text: match.text };
  } catch (error) {
    // A missing compatibility category is acceptable; it is never required.
    console.warn("[intent/extract] category lookup failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return emptyCategory(query);
  }
}

function effectiveWorkFormat(
  payload: ServiceIntentModelPayload,
  input: ServiceIntentExtractInput,
): ServiceIntentWorkFormat | null {
  // Explicit form data the person already provided outranks a model guess.
  return input.knownContext.work_format ?? payload.work_format;
}

function computeMissingFields(args: {
  payload: ServiceIntentModelPayload;
  input: ServiceIntentExtractInput;
  workFormat: ServiceIntentWorkFormat | null;
  city: string | null;
  postalCode: string | null;
  requestedService: string | null;
  timingIsUnspecified: boolean;
}): ServiceIntentFieldCode[] {
  const missing: ServiceIntentFieldCode[] = [];
  const modelSaid = args.payload.missing_fields;

  if (!args.requestedService) missing.push("requested_service");
  if (!args.workFormat) missing.push("work_format");

  // A place only matters when the work is not purely remote.
  if (args.workFormat && args.workFormat !== "online" && !args.city && !args.postalCode) {
    missing.push("location");
  }

  // Timing is only a gap when the model judged it material for this service.
  if (modelSaid.includes("timing") && args.timingIsUnspecified) missing.push("timing");

  if (
    modelSaid.includes("preferred_language") &&
    !args.payload.preferred_language &&
    !args.input.knownContext.preferred_language
  ) {
    missing.push("preferred_language");
  }

  if (modelSaid.includes("service_detail")) missing.push("service_detail");

  return missing.filter((code) => !args.input.knownContext.resolved_fields.includes(code));
}

export async function extractServiceIntent(
  input: ServiceIntentExtractInput,
  deps: ServiceIntentExtractionDeps,
): Promise<ServiceIntentExtractionResult> {
  const now = deps.now();
  const today = calendarDateInTimeZone(now, input.timeZone);

  // Deterministic gate before any spend.
  if (isUnusableContent(input.rawText)) {
    return {
      ok: true,
      modelCalled: false,
      extraction: buildUnusableExtraction(input),
    };
  }

  const sanitizedText = sanitizeFreeText(input.rawText);
  if (!sanitizedText) {
    return { ok: true, modelCalled: false, extraction: buildUnusableExtraction(input) };
  }

  const call = await deps.callModel({
    systemPrompt: SERVICE_INTENT_SYSTEM_PROMPT,
    userPayload: buildServiceIntentUserPayload({
      sanitizedText,
      locale: input.locale,
      todayLocal: calendarDateToIso(today),
      weekdayLocal: isoWeekday(today),
      knownContext: {
        work_format: input.knownContext.work_format,
        city: input.knownContext.city,
        postal_code: input.knownContext.postal_code,
        country_code: input.knownContext.country_code,
        radius_km: input.knownContext.radius_km,
        preferred_language: input.knownContext.preferred_language,
        already_answered: input.knownContext.resolved_fields,
      },
    }),
  });

  if (!call.ok) return { ok: false, code: call.code };

  const payload = call.payload;
  const resolvedTiming = resolveIntentTiming(payload.timing, {
    now,
    timeZone: input.timeZone,
    availabilityNote: payload.availability_note,
    recurrence: payload.recurrence,
  });

  const workFormat = effectiveWorkFormat(payload, input);
  const city = input.knownContext.city ?? payload.city;
  const postalCode = input.knownContext.postal_code ?? payload.postal_code;
  const requestedService = payload.requested_service;
  const timingIsUnspecified =
    resolvedTiming.timing.service_timing_type === "flexible_period" &&
    resolvedTiming.timing.service_timing_period === "flexible" &&
    payload.timing.kind !== "period";

  const missingFields = computeMissingFields({
    payload,
    input,
    workFormat,
    city,
    postalCode,
    requestedService,
    timingIsUnspecified,
  });

  const category = await resolveCategory(payload, input.locale, deps.lookupCategory);

  const timingConfidence = Math.max(
    0,
    payload.confidence.timing - resolvedTiming.confidencePenalty,
  );

  return {
    ok: true,
    modelCalled: true,
    extraction: {
      ok: true,
      schema_version: SERVICE_INTENT_SCHEMA_VERSION,
      extraction_version: SERVICE_INTENT_EXTRACTION_VERSION,
      direction: payload.direction,
      // Server-owned: the original bytes, never the model's echo.
      raw_text: input.rawText,
      requested_service: requestedService,
      source_language: payload.source_language,
      // Never defaulted to de; an unknown communication language stays null.
      preferred_language:
        input.knownContext.preferred_language ?? payload.preferred_language,
      work_format: workFormat,
      location: {
        city,
        postal_code: postalCode,
        country_code: input.knownContext.country_code ?? payload.country_code,
        radius_km: input.knownContext.radius_km ?? payload.radius_km,
      },
      timing: resolvedTiming.timing,
      availability_note: resolvedTiming.availabilityNote,
      recurrence: payload.recurrence,
      budget_text: payload.budget_text,
      category,
      confidence: { ...payload.confidence, timing: timingConfidence },
      missing_fields: missingFields,
      next_question: selectNextQuestion({
        locale: input.locale,
        missingFields,
        resolvedFields: input.knownContext.resolved_fields,
        modelQuestion: payload.next_question,
      }),
      safety: normalizeModelSafety(payload.safety),
    },
  };
}

function buildUnusableExtraction(input: ServiceIntentExtractInput): ServiceIntentExtraction {
  const missingFields: ServiceIntentFieldCode[] = ["requested_service"];
  return {
    ok: true,
    schema_version: SERVICE_INTENT_SCHEMA_VERSION,
    extraction_version: SERVICE_INTENT_EXTRACTION_VERSION,
    direction: "need",
    raw_text: input.rawText,
    requested_service: null,
    source_language: null,
    preferred_language: input.knownContext.preferred_language,
    work_format: input.knownContext.work_format,
    location: {
      city: input.knownContext.city,
      postal_code: input.knownContext.postal_code,
      country_code: input.knownContext.country_code,
      radius_km: input.knownContext.radius_km,
    },
    timing: {
      service_timing_type: "flexible_period",
      service_timing_date: null,
      service_timing_time: null,
      service_timing_date_end: null,
      service_timing_period: "flexible",
      service_timing_note: null,
    },
    availability_note: null,
    recurrence: null,
    budget_text: null,
    category: { query: null, id: null, text: null },
    confidence: {
      direction: 0,
      requested_service: 0,
      work_format: 0,
      location: 0,
      timing: 0,
      budget: 0,
      language: 0,
    },
    missing_fields: missingFields,
    next_question: selectNextQuestion({
      locale: input.locale,
      missingFields,
      resolvedFields: input.knownContext.resolved_fields,
      modelQuestion: null,
    }),
    safety: unusableContentSafety(),
  };
}
