import assert from "node:assert/strict";
import test from "node:test";

import {
  SERVICE_INTENT_RAW_TEXT_MAX_LEN,
  isValidIanaTimeZone,
  validateServiceIntentExtractRequest,
} from "./requestValidation.ts";

const base = {
  raw_text: "Нужен сантехник в Гамбурге завтра после 18:00",
  locale: "ru",
  time_zone: "Europe/Berlin",
};

test("a minimal valid body is accepted and raw_text is preserved exactly", () => {
  const rawText = "  Нужен   сантехник\nпосле 18:00  ";
  const result = validateServiceIntentExtractRequest({ ...base, raw_text: rawText });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.input.rawText, rawText);
  assert.equal(result.input.locale, "ru");
  assert.equal(result.input.timeZone, "Europe/Berlin");
  assert.deepEqual(result.input.knownContext.resolved_fields, []);
});

test("14. empty text is rejected", () => {
  for (const rawText of ["", "   ", "\n\t"]) {
    const result = validateServiceIntentExtractRequest({ ...base, raw_text: rawText });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "invalid_request");
  }
});

test("14. text above the request maximum is rejected", () => {
  const tooLong = "а".repeat(SERVICE_INTENT_RAW_TEXT_MAX_LEN + 1);
  const result = validateServiceIntentExtractRequest({ ...base, raw_text: tooLong });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "invalid_request");

  const atMaximum = "а".repeat(SERVICE_INTENT_RAW_TEXT_MAX_LEN);
  assert.equal(
    validateServiceIntentExtractRequest({ ...base, raw_text: atMaximum }).ok,
    true,
  );
});

test("13. an invalid time zone is rejected", () => {
  for (const timeZone of ["Mars/Olympus", "", "Europe/Nowhere", 42, null]) {
    const result = validateServiceIntentExtractRequest({ ...base, time_zone: timeZone });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "invalid_time_zone");
  }
  assert.equal(isValidIanaTimeZone("Europe/Kyiv"), true);
  assert.equal(isValidIanaTimeZone("Mars/Olympus"), false);
});

test("an unsupported locale is rejected with its own code", () => {
  const result = validateServiceIntentExtractRequest({ ...base, locale: "en" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "unsupported_locale");
});

test("unknown service fields are rejected instead of ignored", () => {
  for (const extra of ["client_name", "client_email", "client_phone", "model", "system_prompt"]) {
    const result = validateServiceIntentExtractRequest({ ...base, [extra]: "x" });
    assert.equal(result.ok, false, extra);
    if (result.ok || result.error.code !== "invalid_request") {
      throw new Error(`expected invalid_request for ${extra}`);
    }
    assert.equal(result.error.field, extra);
  }
});

test("known_context accepts only non-personal form data", () => {
  const ok = validateServiceIntentExtractRequest({
    ...base,
    known_context: {
      work_format: "offline",
      city: "Hamburg",
      postal_code: "20095",
      country_code: "de",
      radius_km: 30,
      preferred_language: "ru",
      resolved_fields: ["location", "location"],
    },
  });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.input.knownContext.country_code, "DE");
  assert.deepEqual(ok.input.knownContext.resolved_fields, ["location"]);

  const personal = validateServiceIntentExtractRequest({
    ...base,
    known_context: { client_phone: "+4915112345678" },
  });
  assert.equal(personal.ok, false);
  if (personal.ok) return;
  assert.equal(personal.error.code, "invalid_request");
});

test("known_context values are range checked", () => {
  const cases: Array<Record<string, unknown>> = [
    { work_format: "any" },
    { radius_km: 0 },
    { radius_km: 501 },
    { radius_km: 12.5 },
    { preferred_language: "en" },
    { resolved_fields: ["client_name"] },
    { resolved_fields: "location" },
  ];
  for (const known_context of cases) {
    const result = validateServiceIntentExtractRequest({ ...base, known_context });
    assert.equal(result.ok, false, JSON.stringify(known_context));
  }
});

test("a non-object body is rejected", () => {
  for (const body of [null, undefined, "text", 5, []]) {
    assert.equal(validateServiceIntentExtractRequest(body).ok, false);
  }
});
