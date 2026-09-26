import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../../components/serviceRequests/ConversationalIntake.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(new URL("../../app/[lang]/request/page.tsx", import.meta.url), "utf8");

test("the request page falls back to the production form when the flag is off", () => {
  assert.match(page, /isServiceIntentExtractionEnabled/);
  assert.match(page, /selectRequestEntry/);
  assert.match(page, /ClientDemandEntry/);
  assert.match(page, /ConversationalIntake/);
  assert.doesNotMatch(page, /NEXT_PUBLIC_/);
});

test("the intake screen creates a request only from the explicit submit action", () => {
  const submitAt = component.indexOf("async function submitRequest");
  const extractCall = component.indexOf('fetch("/api/intent/extract"');
  const createCall = component.indexOf('fetch("/api/service-requests"');
  assert.ok(extractCall > 0);
  assert.ok(submitAt > 0);
  assert.ok(createCall > submitAt);
  assert.match(component, /buildConfirmedServiceRequest/);
  assert.match(component, /idempotencyKey\.current/);
  assert.match(component, /submitLock/);
  assert.match(component, /disabled=\{busy\}/);
  assert.doesNotMatch(component, /localStorage|sessionStorage/);
  assert.doesNotMatch(component, /console\./);
});

test("the screen does not render internal extraction fields", () => {
  for (const hidden of [
    "schema_version",
    "extraction_version",
    "confidence",
    "reason_codes",
    "missing_fields",
    "category.id",
  ]) {
    assert.equal(component.includes(hidden), false, hidden);
  }
});
