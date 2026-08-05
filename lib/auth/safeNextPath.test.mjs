import assert from "node:assert/strict";
import test from "node:test";
import { resolveSafeNextPath } from "./safeNextPath.ts";

test("resolveSafeNextPath accepts internal partner paths", () => {
  assert.equal(resolveSafeNextPath("/ua/partners/onboarding"), "/ua/partners/onboarding");
  assert.equal(resolveSafeNextPath("/de/partners/agreement"), "/de/partners/agreement");
});

test("resolveSafeNextPath rejects external and malformed next values", () => {
  assert.equal(resolveSafeNextPath("https://example.com"), null);
  assert.equal(resolveSafeNextPath("http://example.com/path"), null);
  assert.equal(resolveSafeNextPath("//example.com"), null);
  assert.equal(resolveSafeNextPath("%2F%2Fexample.com"), null);
  assert.equal(resolveSafeNextPath("javascript:alert(1)"), null);
  assert.equal(resolveSafeNextPath(""), null);
  assert.equal(resolveSafeNextPath(null), null);
});
