import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { ServiceTimingFields } from "@/lib/serviceRequests/serviceTiming";
import type {
  ServiceIntentExtraction,
  ServiceIntentFieldCode,
  ServiceIntentQuestion,
  ServiceIntentSafetyVerdict,
} from "./contract.ts";
import {
  MAX_CLARIFICATION_STEPS,
  acceptExtraction,
  applyClarificationAnswer,
  buildConfirmedServiceRequest,
  buildInitialExtractBody,
  failExtraction,
  integrateClarificationResult,
  mayCreateServiceRequest,
  reviewEditsFromDraft,
  selectRequestEntry,
  type IntakeDraft,
  type ReviewEdits,
} from "./intake.ts";

const RAW = "Нужен русскоязычный гинеколог в Гамбурге на следующей неделе.";

function timing(overrides: Partial<ServiceTimingFields> = {}): ServiceTimingFields {
  return {
    service_timing_type: "flexible_period",
    service_timing_date: null,
    service_timing_time: null,
    service_timing_date_end: null,
    service_timing_period: "next_week",
    service_timing_note: null,
    ...overrides,
  };
}

function question(field: ServiceIntentFieldCode, text = "Уточните"): ServiceIntentQuestion {
  return { field_code: field, text, options: [], allow_no_preference: true };
}

function extraction(overrides: Partial<ServiceIntentExtraction> = {}): ServiceIntentExtraction {
  return {
    ok: true,
    schema_version: 1,
    extraction_version: "service-intent-extract-1",
    direction: "need",
    raw_text: RAW,
    requested_service: "Гинеколог",
    source_language: "ru",
    preferred_language: "ru",
    work_format: "offline",
    location: { city: "Hamburg", postal_code: null, country_code: "DE", radius_km: null },
    timing: timing(),
    availability_note: null,
    recurrence: null,
    budget_text: null,
    category: { query: "гинеколог", id: "cat-gyn", text: "Медицина" },
    confidence: {
      direction: 0.9,
      requested_service: 0.9,
      work_format: 0.8,
      location: 0.9,
      timing: 0.8,
      budget: 0,
      language: 0.9,
    },
    missing_fields: [],
    next_question: null,
    safety: { verdict: "allowed", reason_codes: [], confidence: 0.95, message_code: "safety_ok" },
    ...overrides,
  };
}

function started(overrides: Partial<ServiceIntentExtraction> = {}, rawText = RAW) {
  return acceptExtraction({
    rawText,
    locale: "ru",
    timeZone: "Europe/Berlin",
    extraction: extraction({ raw_text: rawText, ...overrides }),
  });
}

function confirm(draft: IntakeDraft, edits: Partial<ReviewEdits> = {}, contacts: Partial<{
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  idempotencyKey: string;
}> = {}) {
  return buildConfirmedServiceRequest({
    draft,
    edits: { ...reviewEditsFromDraft(draft), ...edits },
    clientName: contacts.clientName ?? "Анна",
    clientEmail: contacts.clientEmail ?? "anna@example.com",
    clientPhone: contacts.clientPhone ?? "",
    idempotencyKey: contacts.idempotencyKey ?? "key-1",
  });
}

test("1. a complete request goes straight to review and asks nothing", () => {
  const { view, draft } = started();
  assert.equal(view.phase, "review");
  assert.equal(draft.clarificationSteps, 0);
  assert.equal(draft.extraction.requested_service, "Гинеколог");
  assert.equal(draft.extraction.location.city, "Hamburg");
  assert.equal(draft.extraction.preferred_language, "ru");
  assert.equal(draft.extraction.timing.service_timing_period, "next_week");
});

test("2. an incomplete request yields exactly one clarification question", () => {
  const { view } = started({
    location: { city: null, postal_code: null, country_code: "DE", radius_km: null },
    missing_fields: ["location"],
    next_question: question("location", "В каком городе?"),
  });
  assert.equal(view.phase, "clarification");
  if (view.phase !== "clarification") return;
  assert.equal(view.question.field_code, "location");
  assert.equal(view.question.text, "В каком городе?");
});

test("3. a clarification answer keeps fields that were already resolved", () => {
  const { draft } = started({
    location: { city: null, postal_code: null, country_code: "DE", radius_km: null },
    missing_fields: ["location"],
    next_question: question("location", "В каком городе?"),
  });
  const turn = applyClarificationAnswer(draft, { kind: "text", text: "Hamburg" });
  assert.equal(turn.kind, "local");
  if (turn.kind !== "local") return;
  assert.equal(turn.draft.extraction.location.city, "Hamburg");
  assert.equal(turn.draft.extraction.requested_service, "Гинеколог");
  assert.equal(turn.draft.extraction.preferred_language, "ru");
  assert.equal(turn.draft.extraction.timing.service_timing_period, "next_week");
  assert.equal(turn.draft.extraction.raw_text, RAW);
  assert.ok(turn.draft.resolvedFields.includes("location"));
});

test("4. a second answer adds the missing fact and does not replace the original text", () => {
  const first = started({
    timing: timing({ service_timing_period: "flexible" }),
    missing_fields: ["timing"],
    next_question: question("timing", "Когда?"),
  });
  const turn = applyClarificationAnswer(first.draft, { kind: "text", text: "на следующей неделе" });
  assert.equal(turn.kind, "extract");
  if (turn.kind !== "extract") return;
  // The follow-up carries only the new answer, not the whole conversation.
  assert.equal(turn.body.raw_text, "на следующей неделе");
  assert.equal(turn.body.raw_text.includes("гинеколог"), false);
  assert.equal(turn.body.known_context.city, "Hamburg");
  assert.ok(!turn.body.known_context.resolved_fields.includes("timing"));

  const incoming = extraction({
    raw_text: "на следующей неделе",
    requested_service: null,
    location: { city: null, postal_code: null, country_code: null, radius_km: null },
    preferred_language: null,
    timing: timing({ service_timing_period: "next_week" }),
  });
  const integrated = integrateClarificationResult(first.draft, incoming, "timing");
  assert.equal(integrated.draft.extraction.requested_service, "Гинеколог");
  assert.equal(integrated.draft.extraction.location.city, "Hamburg");
  assert.equal(integrated.draft.extraction.timing.service_timing_period, "next_week");
  assert.equal(integrated.draft.extraction.raw_text, RAW);
  assert.equal(integrated.view.phase, "review");
});

test("5. an optional null does not become a question", () => {
  const { view } = started({
    budget_text: null,
    category: { query: null, id: null, text: null },
    availability_note: null,
    missing_fields: ["service_detail"],
    next_question: question("service_detail", "Есть ли важная деталь?"),
  });
  assert.equal(view.phase, "review");
});

test("6. a recognized value can be corrected before submit", () => {
  const { draft } = started();
  const edited = { ...reviewEditsFromDraft(draft), city: "Siegen", requestedService: "Электрик" };
  const result = confirm(draft, edited);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.city, "Siegen");
  assert.equal(result.body.requested_service, "Электрик");
  // The original wording stays the description.
  assert.equal(result.body.description, RAW);
});

test("7. nothing before confirmation can build a service request", () => {
  const { view } = started({
    location: { city: null, postal_code: null, country_code: null, radius_km: null },
    missing_fields: ["location"],
    next_question: question("location"),
  });
  assert.equal(view.phase, "clarification");
  assert.equal(mayCreateServiceRequest("input"), false);
  assert.equal(mayCreateServiceRequest("extracting"), false);
  assert.equal(mayCreateServiceRequest("clarification"), false);
  assert.equal(mayCreateServiceRequest("error"), false);
  assert.equal(mayCreateServiceRequest("blocked"), false);
  const source = readFileSync(new URL("./intake.ts", import.meta.url), "utf8");
  assert.equal(source.includes("createServiceRequest"), false);
  assert.equal(source.includes("service_requests"), false);
});

test("8. confirmation builds exactly one request body for the existing create contract", () => {
  const { draft } = started();
  const result = confirm(draft);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.client_name, "Анна");
  assert.equal(result.body.work_format, "offline");
  assert.equal(result.body.preferred_language, "ru");
  assert.equal(result.body.service_timing_type, "flexible_period");
  assert.equal(result.body.service_timing_period, "next_week");
  assert.equal(result.body.category_id, "cat-gyn");
  assert.equal(result.body.source_path, "/ru/request");
  assert.equal(result.body.idempotency_key, "key-1");
});

test("9. a repeated submit reuses the same idempotency key and the same body", () => {
  const { draft } = started();
  const first = confirm(draft, {}, { idempotencyKey: "same-key" });
  const second = confirm(draft, {}, { idempotencyKey: "same-key" });
  assert.deepEqual(first, second);
});

test("10. an AI failure keeps the typed text and creates nothing", () => {
  const failure = failExtraction(RAW);
  assert.equal(failure.phase, "error");
  assert.equal(failure.rawText, RAW);
  assert.equal(failure.createsRequest, false);
});

test("11. a validation failure produces no request body", () => {
  const { draft } = started();
  const missingName = confirm(draft, {}, { clientName: "  " });
  assert.equal(missingName.ok, false);
  if (missingName.ok) return;
  assert.equal(missingName.code, "missing_name");
  assert.equal("body" in missingName, false);

  const missingContact = confirm(draft, {}, { clientEmail: "", clientPhone: "" });
  assert.equal(missingContact.ok, false);
  if (missingContact.ok) return;
  assert.equal(missingContact.code, "missing_contact");
});

test("12. a blocked verdict cannot build a request", () => {
  const { view, draft } = started({
    safety: {
      verdict: "blocked" satisfies ServiceIntentSafetyVerdict,
      reason_codes: ["weapons"],
      confidence: 0.99,
      message_code: "safety_not_supported",
    },
  });
  assert.equal(view.phase, "blocked");
  const result = confirm(draft);
  assert.deepEqual(result, { ok: false, code: "blocked" });
});

test("13. restricted and manual_review stay submittable under the existing policy", () => {
  for (const verdict of ["restricted", "manual_review"] as const) {
    const { view, draft } = started({
      safety: {
        verdict,
        reason_codes: ["medical"],
        confidence: 0.8,
        message_code: verdict === "restricted" ? "safety_licensed_service" : "safety_manual_review",
      },
    });
    assert.equal(view.phase, "review", verdict);
    const result = confirm(draft);
    assert.equal(result.ok, true, verdict);
  }
});

test("clearing the recognized service still creates a request from the original text", () => {
  const { draft } = started();
  const result = confirm(draft, { requestedService: "  " });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.requested_service, null);
  assert.equal(result.body.description, RAW);
});

test("an explicit service language is stored and the interface locale alone is not", () => {
  const explicit = confirm(started().draft);
  assert.equal(explicit.ok, true);
  if (!explicit.ok) return;
  assert.deepEqual(explicit.body.service_languages, ["ru"]);

  const { draft } = started({ preferred_language: null });
  const open = confirm(draft);
  assert.equal(open.ok, true);
  if (!open.ok) return;
  assert.deepEqual(open.body.service_languages, []);
  assert.equal(open.body.preferred_language, "ru");
  assert.equal(open.body.locale, "ru");
});

test("14. a null category still produces a valid request", () => {
  const { draft } = started({ category: { query: "гинеколог", id: null, text: null } });
  const result = confirm(draft);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.category_id, null);
  assert.equal(result.body.category_text, null);
});

test("15. the feature flag off keeps the production entry", () => {
  assert.equal(selectRequestEntry(false), "production");
  assert.equal(selectRequestEntry(true), "conversational");
});

test("16. extraction never receives the contact details collected for the request", () => {
  const body = buildInitialExtractBody({
    rawText: RAW,
    locale: "ru",
    timeZone: "Europe/Berlin",
  });
  const serialized = JSON.stringify(body);
  for (const forbidden of ["client_name", "client_email", "client_phone", "Анна", "anna@example.com"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(Object.keys(body).sort(), ["known_context", "locale", "raw_text", "time_zone"]);
  assert.deepEqual(Object.keys(body.known_context).sort(), [
    "city",
    "country_code",
    "postal_code",
    "preferred_language",
    "radius_km",
    "resolved_fields",
    "work_format",
  ]);
});

test("17. the intake module does not log raw input", () => {
  const source = readFileSync(new URL("./intake.ts", import.meta.url), "utf8");
  assert.equal(/console\./.test(source), false);
});

test("a follow-up cannot weaken a restricted verdict", () => {
  const { draft } = started({
    timing: timing({ service_timing_period: "flexible" }),
    missing_fields: ["timing"],
    next_question: question("timing"),
    safety: {
      verdict: "restricted",
      reason_codes: ["medical"],
      confidence: 0.9,
      message_code: "safety_licensed_service",
    },
  });
  const incoming = extraction({
    safety: { verdict: "allowed", reason_codes: [], confidence: 0.99, message_code: "safety_ok" },
  });
  const integrated = integrateClarificationResult(draft, incoming, "timing");
  assert.equal(integrated.draft.extraction.safety.verdict, "restricted");
});

test("an explicit no-preference is not asked again", () => {
  const { draft } = started({
    work_format: null,
    location: { city: "Hamburg", postal_code: null, country_code: "DE", radius_km: null },
    missing_fields: ["work_format"],
    next_question: question("work_format"),
  });
  const first = applyClarificationAnswer(draft, { kind: "no_preference" });
  assert.equal(first.kind, "local");
  if (first.kind !== "local") return;
  assert.equal(first.draft.workFormatNoPreference, true);
  assert.equal(first.view.phase, "review");
  assert.equal(applyClarificationAnswer(first.draft, { kind: "no_preference" }).kind, "invalid");
});

test("the clarification loop stops after the cap and goes to review", () => {
  const { draft } = started({
    location: { city: null, postal_code: null, country_code: "DE", radius_km: null },
    missing_fields: ["location"],
    next_question: question("location"),
  });
  const nearCap: IntakeDraft = { ...draft, clarificationSteps: MAX_CLARIFICATION_STEPS - 1 };
  const turn = applyClarificationAnswer(nearCap, { kind: "text", text: "Bonn" });
  assert.equal(turn.kind, "local");
  if (turn.kind !== "local") return;
  assert.equal(turn.draft.clarificationSteps, MAX_CLARIFICATION_STEPS);
  assert.equal(turn.view.phase, "review");
  assert.equal(applyClarificationAnswer(turn.draft, { kind: "text", text: "ещё" }).kind, "invalid");
});

test("no-preference format is stored as hybrid, which is what the existing form saves", () => {
  const { draft } = started({ work_format: null, missing_fields: ["work_format"] });
  const withPreference: IntakeDraft = { ...draft, workFormatNoPreference: true };
  const result = confirm(withPreference, { workFormat: "no_preference", city: "Hamburg" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.work_format, "hybrid");
});
