import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentCreateServiceRequestInput } from "./serviceRequestInput.ts";

const validBody = {
  category: "Бухгалтерия",
  language: "ru",
  work_format: "online",
  request_text: "Need bookkeeping help",
  user_contact: {
    name: "Anna",
    email: "anna@example.com",
  },
};

test("maps a valid Agent payload onto Demand validation", () => {
  const result = parseAgentCreateServiceRequestInput(validBody);
  assert.equal("error" in result, false);
  if ("error" in result) return;

  assert.equal(result.client_name, "Anna");
  assert.equal(result.client_email, "anna@example.com");
  assert.equal(result.client_phone, null);
  assert.equal(result.description, "Need bookkeeping help");
  assert.equal(result.preferred_language, "ru");
  assert.equal(result.work_format, "online");
  assert.equal(result.locale, "ru");
  assert.equal(result.category_text, "Бухгалтерия");
  assert.equal(result.category_id, null);
  assert.equal(result.source_path, "/api/v1/agent/service-requests");
  assert.equal(result.service_timing.service_timing_type, "flexible_period");
  assert.equal(result.service_timing.service_timing_period, "flexible");
  assert.equal(result.urgency, "flexible");
});

test("maps language uk to locale ua without inventing a city", () => {
  const result = parseAgentCreateServiceRequestInput({
    ...validBody,
    language: "uk",
    user_contact: { name: "Anna", phone: "+49123" },
  });
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.equal(result.preferred_language, "uk");
  assert.equal(result.locale, "ua");
  assert.equal(result.client_email, null);
  assert.equal(result.client_phone, "+49123");
});

test("rejects unknown body fields including identity and unmapped budget", () => {
  for (const extra of [
    { user_id: "spoof" },
    { client_user_id: "spoof" },
    { budget_max: 150 },
    { location: "Berlin" },
    { idempotency_key: "in-body" },
  ]) {
    const result = parseAgentCreateServiceRequestInput({ ...validBody, ...extra });
    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.equal(result.status, 400);
      assert.equal(result.error, "unknown fields are not allowed");
    }
  }
});

test("rejects missing contact name", () => {
  const result = parseAgentCreateServiceRequestInput({
    ...validBody,
    user_contact: { email: "anna@example.com" },
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.equal(result.status, 400);
    assert.match(result.error, /user_contact\.name/);
  }
});

test("rejects contact with neither email nor phone", () => {
  const result = parseAgentCreateServiceRequestInput({
    ...validBody,
    user_contact: { name: "Anna" },
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.equal(result.status, 400);
    assert.match(result.error, /email or user_contact\.phone/);
  }
});

test("rejects invalid work_format", () => {
  const result = parseAgentCreateServiceRequestInput({
    ...validBody,
    work_format: "remote",
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.equal(result.status, 400);
    assert.equal(result.error, "invalid work_format");
  }
});

test("rejects unsupported language and locale", () => {
  const language = parseAgentCreateServiceRequestInput({
    ...validBody,
    language: "en",
  });
  assert.equal("error" in language, true);
  if ("error" in language) {
    assert.equal(language.status, 400);
    assert.equal(language.error, "unsupported language");
  }

  const locale = parseAgentCreateServiceRequestInput({
    ...validBody,
    locale: "en",
  });
  assert.equal("error" in locale, true);
  if ("error" in locale) {
    assert.equal(locale.status, 400);
    assert.equal(locale.error, "unsupported locale");
  }
});

test("requires city or postal_code for offline work", () => {
  const result = parseAgentCreateServiceRequestInput({
    ...validBody,
    work_format: "offline",
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.equal(result.status, 400);
    assert.match(result.error, /city or postal_code/);
  }
});
