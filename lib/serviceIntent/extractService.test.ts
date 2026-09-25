import assert from "node:assert/strict";
import test from "node:test";

import type { ServiceIntentFieldCode, ServiceIntentLocale } from "./contract.ts";
import { extractServiceIntent } from "./extractService.ts";
import { parseServiceIntentModelPayload } from "./modelResponse.ts";
import type { ServiceIntentExtractInput } from "./requestValidation.ts";

/**
 * Every model call is mocked. The clock is frozen so relative dates are
 * deterministic: 25 September 2026 is a Friday, and 22:10 UTC is still the same
 * calendar day in Berlin.
 */
const FIXED_NOW = new Date("2026-09-25T20:10:00.000Z");
const BERLIN = "Europe/Berlin";

type CallLog = {
  systemPrompt: string;
  userPayload: Record<string, unknown>;
};

function input(overrides: Partial<ServiceIntentExtractInput> = {}): ServiceIntentExtractInput {
  return {
    rawText: "Нужен сантехник",
    locale: "ru" as ServiceIntentLocale,
    timeZone: BERLIN,
    knownContext: {
      work_format: null,
      city: null,
      postal_code: null,
      country_code: null,
      radius_km: null,
      preferred_language: null,
      resolved_fields: [],
    },
    ...overrides,
  };
}

/** A complete, valid model payload; tests override only what they care about. */
function modelPayload(overrides: Record<string, unknown> = {}) {
  return {
    direction: "need",
    requested_service: "Сантехник",
    source_language: "ru",
    preferred_language: null,
    work_format: "offline",
    city: "Hamburg",
    postal_code: null,
    country_code: "de",
    radius_km: 20,
    timing: {
      kind: "relative_day",
      relative_day: "tomorrow",
      weekday: null,
      absolute_date: null,
      absolute_date_end: null,
      period: null,
      time: null,
      after_time: "18:00",
      time_of_day: null,
      unresolved_expression: null,
    },
    availability_note: null,
    recurrence: null,
    budget_text: null,
    category_query: "сантехник",
    confidence: {
      direction: 0.95,
      requested_service: 0.9,
      work_format: 0.85,
      location: 0.9,
      timing: 0.9,
      budget: 0,
      language: 0.9,
    },
    missing_fields: [],
    next_question: null,
    safety: { verdict: "allowed", reason_codes: [], confidence: 0.96 },
    ...overrides,
  };
}

type ExtractOptions = {
  calls?: CallLog[];
  category?: { id: string; text: string } | null;
  categoryQueries?: string[];
  modelFailure?: "ai_timeout" | "ai_unavailable" | "invalid_model_response";
  /** Raw value handed to the payload parser, for malformed-output cases. */
  rawModelValue?: unknown;
};

async function extract(
  payload: unknown,
  extractInput: ServiceIntentExtractInput = input(),
  options: ExtractOptions = {},
) {
  const calls = options.calls ?? [];
  const categoryQueries = options.categoryQueries ?? [];

  return extractServiceIntent(extractInput, {
    now: () => FIXED_NOW,
    callModel: async ({ systemPrompt, userPayload }) => {
      calls.push({ systemPrompt, userPayload });
      if (options.modelFailure) {
        return { ok: false, code: options.modelFailure };
      }
      const parsed = parseServiceIntentModelPayload(
        "rawModelValue" in options ? options.rawModelValue : payload,
      );
      if (!parsed) return { ok: false, code: "invalid_model_response" };
      return { ok: true, payload: parsed };
    },
    lookupCategory: async (query) => {
      categoryQueries.push(query);
      return options.category === undefined
        ? { id: "cat-plumbing", text: "Сантехника" }
        : options.category;
    },
  });
}

test("1. a complete Russian request in Hamburg for tomorrow after 18:00", async () => {
  const rawText = "Нужен сантехник в Гамбурге завтра после 18:00";
  const result = await extract(modelPayload(), input({ rawText }));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const extraction = result.extraction;
  assert.equal(result.modelCalled, true);
  assert.equal(extraction.direction, "need");
  assert.equal(extraction.requested_service, "Сантехник");
  assert.equal(extraction.source_language, "ru");
  assert.equal(extraction.work_format, "offline");
  assert.equal(extraction.location.city, "Hamburg");
  assert.equal(extraction.location.country_code, "DE");
  assert.equal(extraction.timing.service_timing_type, "date_flexible");
  assert.equal(extraction.timing.service_timing_date, "2026-09-26");
  assert.equal(extraction.timing.service_timing_note, "after 18:00");
  assert.deepEqual(extraction.missing_fields, []);
  assert.equal(extraction.next_question, null);
  assert.equal(extraction.safety.verdict, "allowed");
});

test("2. a complete Ukrainian request", async () => {
  const rawText = "Потрібен сантехнік у Гамбурзі, якнайшвидше";
  const result = await extract(
    modelPayload({
      requested_service: "Сантехнік",
      source_language: "ua",
      timing: {
        kind: "asap",
        relative_day: null,
        weekday: null,
        absolute_date: null,
        absolute_date_end: null,
        period: null,
        time: null,
        after_time: null,
        time_of_day: null,
        unresolved_expression: null,
      },
    }),
    input({ rawText, locale: "ua" }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.source_language, "ua");
  assert.equal(result.extraction.requested_service, "Сантехнік");
  assert.equal(result.extraction.timing.service_timing_type, "asap");
  assert.equal(result.extraction.raw_text, rawText);
});

test("3. a complete German request", async () => {
  const rawText = "Ich brauche einen Klempner in Hamburg, am Samstag";
  const result = await extract(
    modelPayload({
      requested_service: "Klempner",
      source_language: "de",
      preferred_language: "de",
      timing: {
        kind: "relative_day",
        relative_day: "next_weekday",
        weekday: 6,
        absolute_date: null,
        absolute_date_end: null,
        period: null,
        time: null,
        after_time: null,
        time_of_day: null,
        unresolved_expression: null,
      },
    }),
    input({ rawText, locale: "de" }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.source_language, "de");
  assert.equal(result.extraction.preferred_language, "de");
  // The next Saturday after Friday 25 September 2026.
  assert.equal(result.extraction.timing.service_timing_date, "2026-09-26");
});

test("4. Russian text under a Ukrainian interface keeps both languages apart", async () => {
  const calls: CallLog[] = [];
  const result = await extract(
    modelPayload({ source_language: "ru", preferred_language: null }),
    input({ rawText: "Нужен сантехник", locale: "ua" }),
    { calls },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.source_language, "ru");
  // Interface locale is not a communication-language decision.
  assert.equal(result.extraction.preferred_language, null);
  assert.equal(calls[0]?.userPayload.interface_locale, "ua");
});

test("5. mixed Russian and German text is reported as mixed and not defaulted to de", async () => {
  const result = await extract(
    modelPayload({ source_language: "mixed", preferred_language: null }),
    input({ rawText: "Нужен Klempner в Hamburg, срочно" }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.source_language, "mixed");
  assert.equal(result.extraction.preferred_language, null);
});

test("6. a missing city for an obviously offline service produces one question", async () => {
  const result = await extract(modelPayload({ city: null, postal_code: null }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.extraction.missing_fields, ["location"]);
  assert.equal(result.extraction.next_question?.field_code, "location");
  assert.equal(result.extraction.next_question?.text, "В каком городе или районе?");
  assert.equal(result.extraction.next_question?.allow_no_preference, true);

  // The same gap is irrelevant for purely remote work.
  const online = await extract(
    modelPayload({ city: null, postal_code: null, work_format: "online" }),
  );
  assert.equal(online.ok, true);
  if (!online.ok) return;
  assert.deepEqual(online.extraction.missing_fields, []);
  assert.equal(online.extraction.next_question, null);
});

test("7. missing timing is only asked about when the model judged it material", async () => {
  const unknownTiming = {
    kind: "unknown",
    relative_day: null,
    weekday: null,
    absolute_date: null,
    absolute_date_end: null,
    period: null,
    time: null,
    after_time: null,
    time_of_day: null,
    unresolved_expression: null,
  };

  const immaterial = await extract(modelPayload({ timing: unknownTiming }));
  assert.equal(immaterial.ok, true);
  if (!immaterial.ok) return;
  assert.deepEqual(immaterial.extraction.missing_fields, []);
  assert.equal(immaterial.extraction.next_question, null);

  const material = await extract(
    modelPayload({ timing: unknownTiming, missing_fields: ["timing"] }),
  );
  assert.equal(material.ok, true);
  if (!material.ok) return;
  assert.deepEqual(material.extraction.missing_fields, ["timing"]);
  assert.equal(material.extraction.next_question?.field_code, "timing");
});

test('8. a field already answered with "no preference" is not asked again', async () => {
  const resolved: ServiceIntentFieldCode[] = ["location"];
  const result = await extract(
    modelPayload({ city: null, postal_code: null }),
    input({
      knownContext: { ...input().knownContext, resolved_fields: resolved },
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.extraction.missing_fields, []);
  assert.equal(result.extraction.next_question, null);
});

test("9. raw_text in the response equals the input exactly", async () => {
  const rawText = "  Нужен\tсантехник\nв Гамбурге   после 18:00  ";
  const result = await extract(
    modelPayload({ requested_service: "совершенно другой текст" }),
    input({ rawText }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // Not trimmed, not normalized, not translated, not corrected.
  assert.equal(result.extraction.raw_text, rawText);
});

test("10. contacts never reach the model", async () => {
  const calls: CallLog[] = [];
  const rawText =
    "Нужен сантехник, тел +49 151 12345678, почта anna@example.com, " +
    "профиль https://example.com/anna, телеграм @anna_master";
  const result = await extract(modelPayload(), input({ rawText }), { calls });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const sent = JSON.stringify(calls[0]?.userPayload);
  for (const forbidden of [
    "+49 151 12345678",
    "15112345678",
    "anna@example.com",
    "https://example.com/anna",
    "@anna_master",
  ]) {
    assert.ok(!sent.includes(forbidden), forbidden);
  }
  assert.ok(sent.includes("[phone removed]"));
  assert.ok(sent.includes("[contact removed]"));
  // The user still gets their own text back untouched.
  assert.equal(result.extraction.raw_text, rawText);
});

test("11. a relative date is resolved with the fixed clock and Europe/Berlin", async () => {
  const calls: CallLog[] = [];
  const result = await extract(modelPayload(), input(), { calls });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The model is told the server-computed local date, never asked to guess it.
  assert.equal(calls[0]?.userPayload.today_local, "2026-09-25");
  assert.equal(calls[0]?.userPayload.weekday_local, 5);
  assert.equal(result.extraction.timing.service_timing_date, "2026-09-26");
});

test("12. resolution crosses a month and a year boundary", async () => {
  const tomorrow = {
    kind: "relative_day",
    relative_day: "tomorrow",
    weekday: null,
    absolute_date: null,
    absolute_date_end: null,
    period: null,
    time: null,
    after_time: null,
    time_of_day: null,
    unresolved_expression: null,
  };

  const monthEnd = await extractServiceIntent(input(), {
    now: () => new Date("2026-09-30T08:00:00.000Z"),
    callModel: async () => ({
      ok: true,
      payload: parseServiceIntentModelPayload(modelPayload({ timing: tomorrow }))!,
    }),
  });
  assert.equal(monthEnd.ok, true);
  if (!monthEnd.ok) return;
  assert.equal(monthEnd.extraction.timing.service_timing_date, "2026-10-01");

  const yearEnd = await extractServiceIntent(input(), {
    now: () => new Date("2026-12-31T08:00:00.000Z"),
    callModel: async () => ({
      ok: true,
      payload: parseServiceIntentModelPayload(modelPayload({ timing: tomorrow }))!,
    }),
  });
  assert.equal(yearEnd.ok, true);
  if (!yearEnd.ok) return;
  assert.equal(yearEnd.extraction.timing.service_timing_date, "2027-01-01");
});

test("15. an offer is recognized and still writes nothing", async () => {
  const result = await extract(
    modelPayload({ direction: "offer", requested_service: "Услуги сантехника" }),
    input({ rawText: "Я сантехник, могу помочь с трубами в Гамбурге" }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.direction, "offer");
  // The extraction is a pure value; the caller decides what to do with it.
  assert.equal(result.extraction.ok, true);
});

test("20. unusable model output is reported as invalid_model_response", async () => {
  const result = await extract(null, input(), { rawModelValue: { direction: "sideways" } });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "invalid_model_response");
});

test("22. a model timeout surfaces as ai_timeout", async () => {
  const timeout = await extract(modelPayload(), input(), { modelFailure: "ai_timeout" });
  assert.equal(timeout.ok, false);
  if (timeout.ok) return;
  assert.equal(timeout.code, "ai_timeout");

  const unavailable = await extract(modelPayload(), input(), {
    modelFailure: "ai_unavailable",
  });
  assert.equal(unavailable.ok, false);
  if (unavailable.ok) return;
  assert.equal(unavailable.code, "ai_unavailable");
});

test("29. the category stays null when nothing matches, and is never required", async () => {
  const result = await extract(modelPayload(), input(), { category: null });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.category.id, null);
  assert.equal(result.extraction.category.text, null);
  assert.equal(result.extraction.category.query, "сантехник");

  const matched = await extract(modelPayload());
  assert.equal(matched.ok, true);
  if (!matched.ok) return;
  assert.equal(matched.extraction.category.id, "cat-plumbing");
});

test("a query too short to mean anything is not looked up", async () => {
  const queries: string[] = [];
  const result = await extract(
    modelPayload({ category_query: "ок", requested_service: null }),
    input(),
    { categoryQueries: queries },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(queries, []);
  assert.equal(result.extraction.category.id, null);
  assert.equal(result.extraction.category.query, "ок");
});

test("content without a usable request costs no model call", async () => {
  const calls: CallLog[] = [];
  for (const rawText of ["???", "..!!", "ааааааа"]) {
    const result = await extract(modelPayload(), input({ rawText }), { calls });
    assert.equal(result.ok, true, rawText);
    if (!result.ok) return;
    assert.equal(result.modelCalled, false, rawText);
    assert.equal(result.extraction.raw_text, rawText);
    assert.equal(result.extraction.safety.verdict, "manual_review");
    assert.deepEqual(result.extraction.safety.reason_codes, ["unusable_content"]);
    assert.equal(result.extraction.next_question?.field_code, "requested_service");
  }
  assert.equal(calls.length, 0);
});

test("known form data outranks the model guess", async () => {
  const result = await extract(
    modelPayload({ work_format: "online", city: "Berlin", radius_km: 5 }),
    input({
      knownContext: {
        ...input().knownContext,
        work_format: "offline",
        city: "Hamburg",
        radius_km: 30,
        preferred_language: "de",
      },
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.work_format, "offline");
  assert.equal(result.extraction.location.city, "Hamburg");
  assert.equal(result.extraction.location.radius_km, 30);
  assert.equal(result.extraction.preferred_language, "de");
});

test("an undetermined work format stays null instead of becoming hybrid", async () => {
  const result = await extract(modelPayload({ work_format: null }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.work_format, null);
  assert.ok(result.extraction.missing_fields.includes("work_format"));
  assert.equal(result.extraction.next_question?.field_code, "work_format");
});

test("the schema version, extraction version and raw text are server owned", async () => {
  const result = await extract(
    modelPayload({
      schema_version: 99,
      extraction_version: "attacker",
      raw_text: "attacker",
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.schema_version, 1);
  assert.equal(result.extraction.extraction_version, "service-intent-extract-1");
  assert.equal(result.extraction.raw_text, "Нужен сантехник");
});

test("timing confidence drops when a stated condition could not be converted", async () => {
  const result = await extract(
    modelPayload({
      timing: {
        kind: "absolute_date",
        relative_day: null,
        weekday: null,
        absolute_date: "когда потеплеет",
        absolute_date_end: null,
        period: null,
        time: null,
        after_time: null,
        time_of_day: null,
        unresolved_expression: "когда потеплеет",
      },
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.extraction.timing.service_timing_type, "flexible_period");
  assert.equal(result.extraction.timing.service_timing_note, "когда потеплеет");
  assert.ok(result.extraction.confidence.timing < 0.9);
});
