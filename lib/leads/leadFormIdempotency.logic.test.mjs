import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "components/LeadForm.tsx"),
  "utf8",
);

test("LeadForm sends an idempotency key to the lead create route", () => {
  assert.match(source, /idempotency_key:\s*idempotencyKey/);
  assert.match(source, /idempotencyKeyRef\.current \?\? createIdempotencyKey\(\)/);
});

test("LeadForm keeps the same key across ambiguous request failures", () => {
  const catchBlock = source.match(/\} catch \{([\s\S]*?)\} finally/);
  assert.ok(catchBlock, "expected LeadForm fetch catch block");
  assert.doesNotMatch(catchBlock[1], /resetSubmissionIdentity/);
});

test("LeadForm resets submission identity after success and edited payload", () => {
  const successIdx = source.indexOf("onSuccess?.(successMessage)");
  const resetAfterSuccessIdx = source.indexOf("resetSubmissionIdentity();", successIdx);
  assert.ok(successIdx >= 0 && resetAfterSuccessIdx > successIdx);

  assert.match(source, /setName\(e\.target\.value\);\s*resetSubmissionIdentity\(\);/);
  assert.match(source, /setEmail\(e\.target\.value\);\s*resetSubmissionIdentity\(\);/);
  assert.match(source, /setPhone\(e\.target\.value\);\s*resetSubmissionIdentity\(\);/);
  assert.match(source, /setMessage\(e\.target\.value\);\s*resetSubmissionIdentity\(\);/);
});
