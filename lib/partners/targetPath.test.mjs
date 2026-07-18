import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeTargetPath } from "./targetPath.ts";

test("allows internal paths", () => {
  assert.equal(sanitizeTargetPath("/ua/become-specialist"), "/ua/become-specialist");
  assert.equal(sanitizeTargetPath("/become-specialist"), "/become-specialist");
  assert.equal(sanitizeTargetPath("/app"), "/app");
});

test("blocks open redirects", () => {
  assert.equal(sanitizeTargetPath("https://evil.com"), null);
  assert.equal(sanitizeTargetPath("//evil.com"), null);
  assert.equal(sanitizeTargetPath("/\\evil"), null);
  assert.equal(sanitizeTargetPath("javascript:alert(1)"), null);
  assert.equal(sanitizeTargetPath("data:text/html,hi"), null);
});
