import assert from "node:assert/strict";
import test from "node:test";

import { validateServiceRequestCreate } from "./validation.ts";

const body = {
  client_name: "Anna",
  client_email: "anna@example.com",
  description: "Need an online coach",
  preferred_language: "ua",
  work_format: "online",
  service_timing_type: "flexible_period",
  service_timing_period: "flexible",
  locale: "ua",
};

test("service_languages ua is stored as canonical uk", () => {
  const result = validateServiceRequestCreate({ ...body, service_languages: ["ua"] });
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.deepEqual(result.service_languages, ["uk"]);
  assert.equal(result.preferred_language, "ua");
});

test("preferred_language ua without service_languages does not invent a language filter", () => {
  const result = validateServiceRequestCreate(body);
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.deepEqual(result.service_languages, []);
  assert.equal(result.preferred_language, "ua");
});
