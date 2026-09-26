import { canonicalizeLanguages } from "@/lib/matching/languages";
import { formatServiceTimingDisplay } from "@/lib/serviceRequests/serviceTiming";
import type { ServiceTimingFields, ServiceTimingPeriod } from "@/lib/serviceRequests/serviceTiming";
import { validateServiceRequestCreate } from "@/lib/serviceRequests/validation";
import type {
  ServiceIntentExtraction,
  ServiceIntentFieldCode,
  ServiceIntentLocale,
  ServiceIntentQuestion,
  ServiceIntentSafetyVerdict,
  ServiceIntentWorkFormat,
} from "./contract";
import { selectNextQuestion } from "./nextQuestion";
import type { ServiceIntentKnownContext } from "./requestValidation";

/**
 * Conversational intake in front of the existing service request.
 *
 * `ServiceIntentExtraction` stays an intermediate AI value. Nothing here writes
 * to the database: the only object that can become a request is the body
 * returned by `buildConfirmedServiceRequest`, and only the screen calls the
 * existing create endpoint with it after an explicit submit.
 *
 * A clarification answer is sent back as its own `raw_text` plus the already
 * allowed `known_context`. It is not appended to a transcript, and fields the
 * person already settled are copied forward rather than re-extracted.
 */

/** One question per step, then stop and let the person review what we have. */
export const MAX_CLARIFICATION_STEPS = 3;

export type IntakePhase =
  | "input"
  | "extracting"
  | "clarification"
  | "review"
  | "submitting"
  | "success"
  | "blocked"
  | "offer"
  | "error";

export type IntakeView =
  | { phase: "clarification"; question: ServiceIntentQuestion }
  | { phase: "review" }
  | { phase: "blocked" }
  | { phase: "offer" };

export type IntakeDraft = {
  /** The first thing the person wrote. Clarification answers never replace it. */
  rawText: string;
  locale: ServiceIntentLocale;
  timeZone: string;
  extraction: ServiceIntentExtraction;
  resolvedFields: ServiceIntentFieldCode[];
  /**
   * Fields the first extraction reported as missing. Later answers can close
   * them; a follow-up model call cannot open new ones.
   */
  openFields: ServiceIntentFieldCode[];
  clarificationSteps: number;
  /** Explicit "does not matter" for format. The create contract has no such value. */
  workFormatNoPreference: boolean;
};

export type ExtractBody = {
  raw_text: string;
  locale: ServiceIntentLocale;
  time_zone: string;
  known_context: ServiceIntentKnownContext;
};

export type ClarificationAnswer =
  | { kind: "no_preference" }
  | { kind: "work_format"; value: ServiceIntentWorkFormat }
  | { kind: "language"; value: ServiceIntentLocale }
  | { kind: "text"; text: string };

export type ClarificationTurn =
  | { kind: "local"; draft: IntakeDraft; view: IntakeView }
  | { kind: "extract"; body: ExtractBody; askedField: ServiceIntentFieldCode };

const SAFETY_RANK: Record<ServiceIntentSafetyVerdict, number> = {
  allowed: 0,
  restricted: 1,
  manual_review: 2,
  blocked: 3,
};

/** Optional for the existing create contract, so a null never becomes a question. */
const OPTIONAL_FIELDS: readonly ServiceIntentFieldCode[] = ["service_detail"];

function emptyKnownContext(): ServiceIntentKnownContext {
  return {
    work_format: null,
    city: null,
    postal_code: null,
    country_code: null,
    radius_km: null,
    preferred_language: null,
    resolved_fields: [],
  };
}

export function selectRequestEntry(enabled: boolean): "production" | "conversational" {
  return enabled ? "conversational" : "production";
}

/** A request exists only after the person is looking at the review and submits. */
export function mayCreateServiceRequest(phase: IntakePhase): boolean {
  return phase === "review" || phase === "submitting";
}

export function canStartIntake(rawText: string): boolean {
  return rawText.trim().length > 0;
}

/**
 * Body for the first extract call. Contacts are not part of this contract and
 * cannot be smuggled in: the body is built field by field.
 */
export function buildInitialExtractBody(args: {
  rawText: string;
  locale: ServiceIntentLocale;
  timeZone: string;
}): ExtractBody {
  return {
    raw_text: args.rawText,
    locale: args.locale,
    time_zone: args.timeZone,
    known_context: emptyKnownContext(),
  };
}

function timingUnspecified(timing: ServiceTimingFields): boolean {
  return timing.service_timing_type === "flexible_period" && timing.service_timing_period === "flexible";
}

function openGaps(draft: IntakeDraft): ServiceIntentFieldCode[] {
  const extraction = draft.extraction;
  const resolved = draft.resolvedFields;
  const gaps: ServiceIntentFieldCode[] = [];

  if (!extraction.requested_service && !resolved.includes("requested_service")) {
    gaps.push("requested_service");
  }
  if (
    !extraction.work_format &&
    !draft.workFormatNoPreference &&
    !resolved.includes("work_format")
  ) {
    gaps.push("work_format");
  }

  const format = draft.workFormatNoPreference ? "hybrid" : extraction.work_format;
  if (
    format &&
    format !== "online" &&
    !extraction.location.city &&
    !extraction.location.postal_code &&
    !resolved.includes("location")
  ) {
    gaps.push("location");
  }

  if (
    draft.openFields.includes("timing") &&
    !resolved.includes("timing") &&
    timingUnspecified(extraction.timing)
  ) {
    gaps.push("timing");
  }

  if (
    draft.openFields.includes("preferred_language") &&
    !extraction.preferred_language &&
    !resolved.includes("preferred_language")
  ) {
    gaps.push("preferred_language");
  }

  return gaps;
}

function viewFor(draft: IntakeDraft): IntakeView {
  if (draft.extraction.safety.verdict === "blocked") return { phase: "blocked" };
  if (draft.extraction.direction === "offer") return { phase: "offer" };
  if (draft.clarificationSteps >= MAX_CLARIFICATION_STEPS) return { phase: "review" };

  const question = selectNextQuestion({
    locale: draft.locale,
    missingFields: openGaps(draft),
    resolvedFields: draft.resolvedFields,
    // The model's wording is used for the first question only, and only when it
    // names the same field code decides to ask.
    modelQuestion: draft.clarificationSteps === 0 ? draft.extraction.next_question : null,
  });
  if (!question || OPTIONAL_FIELDS.includes(question.field_code)) return { phase: "review" };
  return { phase: "clarification", question };
}

/**
 * First extraction becomes the draft. The server's own next question is shown
 * once; fields it did not mark missing are not asked later just because they
 * are null.
 */
export function acceptExtraction(args: {
  rawText: string;
  locale: ServiceIntentLocale;
  timeZone: string;
  extraction: ServiceIntentExtraction;
}): { draft: IntakeDraft; view: IntakeView } {
  const extraction: ServiceIntentExtraction = {
    ...args.extraction,
    raw_text: args.rawText,
  };
  const draft: IntakeDraft = {
    rawText: args.rawText,
    locale: args.locale,
    timeZone: args.timeZone,
    extraction,
    resolvedFields: [],
    openFields: extraction.missing_fields.filter((field) => !OPTIONAL_FIELDS.includes(field)),
    clarificationSteps: 0,
    workFormatNoPreference: false,
  };

  return { draft, view: viewFor(draft) };
}

function knownContextFromDraft(draft: IntakeDraft): ServiceIntentKnownContext {
  return {
    work_format: draft.workFormatNoPreference ? null : draft.extraction.work_format,
    city: draft.extraction.location.city,
    postal_code: draft.extraction.location.postal_code,
    country_code: draft.extraction.location.country_code,
    radius_km: draft.extraction.location.radius_km,
    preferred_language: draft.extraction.preferred_language,
    resolved_fields: [...draft.resolvedFields],
  };
}

function withResolved(draft: IntakeDraft, field: ServiceIntentFieldCode): ServiceIntentFieldCode[] {
  return draft.resolvedFields.includes(field)
    ? draft.resolvedFields
    : [...draft.resolvedFields, field];
}

/**
 * Applies one answer. Structured answers stay local, so a city or a format
 * cannot wipe the service and the timing already recognized. Only a free-text
 * timing answer needs another extract call, and that call carries the answer
 * alone plus the known context.
 */
export function applyClarificationAnswer(
  draft: IntakeDraft,
  answer: ClarificationAnswer,
): ClarificationTurn | { kind: "invalid" } {
  const current = viewFor(draft);
  if (current.phase !== "clarification") return { kind: "invalid" };
  const field = current.question.field_code;

  if (answer.kind === "no_preference") {
    const next: IntakeDraft = {
      ...draft,
      resolvedFields: withResolved(draft, field),
      clarificationSteps: draft.clarificationSteps + 1,
      workFormatNoPreference: field === "work_format" ? true : draft.workFormatNoPreference,
    };
    return { kind: "local", draft: next, view: viewFor(next) };
  }

  if (answer.kind === "work_format" && field === "work_format") {
    const next: IntakeDraft = {
      ...draft,
      extraction: { ...draft.extraction, work_format: answer.value },
      resolvedFields: withResolved(draft, field),
      clarificationSteps: draft.clarificationSteps + 1,
      workFormatNoPreference: false,
    };
    return { kind: "local", draft: next, view: viewFor(next) };
  }

  if (answer.kind === "language" && field === "preferred_language") {
    const next: IntakeDraft = {
      ...draft,
      extraction: { ...draft.extraction, preferred_language: answer.value },
      resolvedFields: withResolved(draft, field),
      clarificationSteps: draft.clarificationSteps + 1,
    };
    return { kind: "local", draft: next, view: viewFor(next) };
  }

  if (answer.kind === "text") {
    const text = answer.text.trim();
    if (!text) return { kind: "invalid" };

    if (field === "location" || field === "requested_service") {
      const extraction = { ...draft.extraction };
      if (field === "location") {
        extraction.location = { ...extraction.location, city: text.slice(0, 120) };
      } else {
        extraction.requested_service = text.slice(0, 200);
      }
      const next: IntakeDraft = {
        ...draft,
        extraction,
        resolvedFields: withResolved(draft, field),
        clarificationSteps: draft.clarificationSteps + 1,
      };
      return { kind: "local", draft: next, view: viewFor(next) };
    }

    return {
      kind: "extract",
      askedField: field,
      body: {
        raw_text: text,
        locale: draft.locale,
        time_zone: draft.timeZone,
        known_context: knownContextFromDraft(draft),
      },
    };
  }

  return { kind: "invalid" };
}

function stricterSafety(
  previous: ServiceIntentExtraction["safety"],
  incoming: ServiceIntentExtraction["safety"],
): ServiceIntentExtraction["safety"] {
  return SAFETY_RANK[incoming.verdict] > SAFETY_RANK[previous.verdict] ? incoming : previous;
}

/**
 * Folds a follow-up extraction into the draft. Only the field that was asked
 * can change; everything already recognized stays, including the original text.
 * Safety can become stricter and can never be relaxed by a short answer.
 */
export function integrateClarificationResult(
  draft: IntakeDraft,
  incoming: ServiceIntentExtraction,
  askedField: ServiceIntentFieldCode,
): { draft: IntakeDraft; view: IntakeView } {
  const previous = draft.extraction;
  const extraction: ServiceIntentExtraction = {
    ...previous,
    raw_text: draft.rawText,
    safety: stricterSafety(previous.safety, incoming.safety),
  };

  if (askedField === "requested_service" && incoming.requested_service) {
    extraction.requested_service = incoming.requested_service;
  }
  if (askedField === "work_format" && incoming.work_format) {
    extraction.work_format = incoming.work_format;
  }
  if (askedField === "location") {
    extraction.location = {
      city: incoming.location.city ?? previous.location.city,
      postal_code: incoming.location.postal_code ?? previous.location.postal_code,
      country_code: incoming.location.country_code ?? previous.location.country_code,
      radius_km: incoming.location.radius_km ?? previous.location.radius_km,
    };
  }
  if (askedField === "timing") {
    extraction.timing = incoming.timing;
    extraction.availability_note = incoming.availability_note ?? previous.availability_note;
    extraction.recurrence = incoming.recurrence ?? previous.recurrence;
  }
  if (askedField === "preferred_language" && incoming.preferred_language) {
    extraction.preferred_language = incoming.preferred_language;
  }
  if (askedField === "service_detail") {
    extraction.availability_note = incoming.availability_note ?? incoming.raw_text;
  }

  const next: IntakeDraft = {
    ...draft,
    extraction,
    resolvedFields: withResolved(draft, askedField),
    clarificationSteps: draft.clarificationSteps + 1,
  };
  return { draft: next, view: viewFor(next) };
}

export type ReviewEdits = {
  requestedService: string;
  city: string;
  workFormat: ServiceIntentWorkFormat | "no_preference" | null;
  preferredLanguage: ServiceIntentLocale | null;
  /** Explicit requirement only. Empty does not inherit the interface locale. */
  serviceLanguages: string[];
  /** Replaces the extracted timing. `null` keeps what extraction resolved. */
  timingPeriod: "asap" | ServiceTimingPeriod | null;
};

export function reviewEditsFromDraft(draft: IntakeDraft): ReviewEdits {
  return {
    requestedService: draft.extraction.requested_service ?? "",
    city: draft.extraction.location.city ?? "",
    workFormat: draft.workFormatNoPreference ? "no_preference" : draft.extraction.work_format,
    preferredLanguage: draft.extraction.preferred_language ?? draft.locale,
    serviceLanguages: draft.extraction.preferred_language
      ? canonicalizeLanguages([draft.extraction.preferred_language])
      : [],
    timingPeriod: null,
  };
}

function timingFromPeriod(period: "asap" | ServiceTimingPeriod): ServiceTimingFields {
  if (period === "asap") {
    return {
      service_timing_type: "asap",
      service_timing_date: null,
      service_timing_time: null,
      service_timing_date_end: null,
      service_timing_period: null,
      service_timing_note: null,
    };
  }
  return {
    service_timing_type: "flexible_period",
    service_timing_date: null,
    service_timing_time: null,
    service_timing_date_end: null,
    service_timing_period: period,
    service_timing_note: null,
  };
}

export function reviewTiming(extraction: ServiceIntentExtraction, edits: ReviewEdits): ServiceTimingFields {
  return edits.timingPeriod ? timingFromPeriod(edits.timingPeriod) : extraction.timing;
}

export function timingLabel(timing: ServiceTimingFields, locale: ServiceIntentLocale): string {
  return formatServiceTimingDisplay(timing, locale);
}

export type ConfirmCode =
  | "blocked"
  | "offer"
  | "missing_name"
  | "missing_contact"
  | "missing_format"
  | "missing_location"
  | "invalid";

export type ConfirmResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; code: ConfirmCode };

/**
 * The explicit confirmation boundary. Returns the body for the existing
 * `POST /api/service-requests` and performs no IO. A blocked or offered intent
 * has no body. The same idempotency key makes a repeated submit a replay.
 */
export function buildConfirmedServiceRequest(args: {
  draft: IntakeDraft;
  edits: ReviewEdits;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  idempotencyKey: string;
}): ConfirmResult {
  const extraction = args.draft.extraction;
  if (extraction.safety.verdict === "blocked") return { ok: false, code: "blocked" };
  if (extraction.direction === "offer") return { ok: false, code: "offer" };

  const clientName = args.clientName.trim();
  if (!clientName) return { ok: false, code: "missing_name" };
  const clientEmail = args.clientEmail.trim();
  const clientPhone = args.clientPhone.trim();
  if (!clientEmail && !clientPhone) return { ok: false, code: "missing_contact" };

  const requestedService = args.edits.requestedService.trim();

  const workFormat =
    args.edits.workFormat === "no_preference" ? "hybrid" : args.edits.workFormat;
  if (!workFormat) return { ok: false, code: "missing_format" };

  const city = args.edits.city.trim();
  const postalCode = extraction.location.postal_code;
  if (workFormat !== "online" && !city && !postalCode) {
    return { ok: false, code: "missing_location" };
  }

  const timing = args.edits.timingPeriod
    ? timingFromPeriod(args.edits.timingPeriod)
    : extraction.timing;
  const note = [extraction.availability_note, extraction.recurrence]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join("; ");

  const body: Record<string, unknown> = {
    client_name: clientName,
    client_email: clientEmail || null,
    client_phone: clientPhone || null,
    description: args.draft.rawText.trim(),
    requested_service: requestedService || null,
    client_budget_text: extraction.budget_text,
    preferred_language: args.edits.preferredLanguage ?? args.draft.locale,
    service_languages: canonicalizeLanguages(args.edits.serviceLanguages),
    work_format: workFormat,
    city: workFormat === "online" ? null : city || null,
    postal_code: workFormat === "online" ? null : postalCode,
    country_code: extraction.location.country_code ?? "DE",
    radius_km: extraction.location.radius_km,
    service_timing_type: timing.service_timing_type,
    service_timing_date: timing.service_timing_date,
    service_timing_time: timing.service_timing_time,
    service_timing_date_end: timing.service_timing_date_end,
    service_timing_period: timing.service_timing_period,
    service_timing_note: note || timing.service_timing_note,
    locale: args.draft.locale,
    category_id: extraction.category.id,
    category_text: extraction.category.text,
    source_path: `/${args.draft.locale}/request`,
    idempotency_key: args.idempotencyKey,
    hp: "",
  };

  const validated = validateServiceRequestCreate(body);
  if ("error" in validated) return { ok: false, code: "invalid" };
  return { ok: true, body };
}

/** An AI or network failure keeps the typed text and creates nothing. */
export function failExtraction(rawText: string): {
  phase: "error";
  rawText: string;
  createsRequest: false;
} {
  return { phase: "error", rawText, createsRequest: false };
}
