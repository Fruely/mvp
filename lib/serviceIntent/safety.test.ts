import assert from "node:assert/strict";
import test from "node:test";

import type { ServiceIntentSafetyReason } from "./contract.ts";
import type { ServiceIntentModelSafety } from "./modelResponse.ts";
import {
  isUnusableContent,
  normalizeModelSafety,
  unusableContentSafety,
} from "./safety.ts";

function modelSafety(
  verdict: ServiceIntentModelSafety["verdict"],
  reasons: ServiceIntentSafetyReason[],
  confidence = 0.9,
): ServiceIntentModelSafety {
  return { verdict, reason_codes: reasons, confidence };
}

test("16. a medical request is never auto-blocked", () => {
  const blocked = normalizeModelSafety(modelSafety("blocked", ["medical"], 0.99));
  assert.equal(blocked.verdict, "manual_review");
  assert.deepEqual(blocked.reason_codes, ["medical"]);
  assert.equal(blocked.message_code, "safety_manual_review");

  const allowed = normalizeModelSafety(modelSafety("allowed", ["medical"]));
  assert.equal(allowed.verdict, "restricted");
  assert.equal(allowed.message_code, "safety_licensed_service");
});

test("16. legal, financial and veterinary work behaves like medicine", () => {
  for (const reason of ["legal", "financial", "veterinary", "other_licensed"] as const) {
    assert.equal(
      normalizeModelSafety(modelSafety("blocked", [reason], 1)).verdict,
      "manual_review",
      reason,
    );
    assert.equal(
      normalizeModelSafety(modelSafety("allowed", [reason])).verdict,
      "restricted",
      reason,
    );
    assert.equal(
      normalizeModelSafety(modelSafety("restricted", [reason])).verdict,
      "restricted",
      reason,
    );
  }
});

test("17. an explicitly prohibited service stays blocked", () => {
  for (const reason of [
    "weapons",
    "drugs",
    "violence",
    "sexual_services",
    "fraud",
    "self_harm",
  ] as const) {
    const result = normalizeModelSafety(modelSafety("blocked", [reason], 0.95));
    assert.equal(result.verdict, "blocked", reason);
    assert.equal(result.message_code, "safety_not_supported");
  }
});

test("18. an ambiguous dangerous phrase becomes manual review, not a block", () => {
  // Low confidence on a prohibited area.
  const unsure = normalizeModelSafety(modelSafety("blocked", ["weapons"], 0.4));
  assert.equal(unsure.verdict, "manual_review");

  // A block without any prohibited reason.
  const unreasoned = normalizeModelSafety(modelSafety("blocked", ["unclear_intent"], 1));
  assert.equal(unreasoned.verdict, "manual_review");
  assert.equal(unreasoned.message_code, "safety_needs_details");

  // A clean pass cannot coexist with a prohibited signal.
  const contradictory = normalizeModelSafety(modelSafety("allowed", ["violence"], 0.6));
  assert.equal(contradictory.verdict, "manual_review");
});

test("an ordinary request passes untouched", () => {
  const result = normalizeModelSafety(modelSafety("allowed", [], 0.98));
  assert.equal(result.verdict, "allowed");
  assert.deepEqual(result.reason_codes, []);
  assert.equal(result.confidence, 0.98);
  assert.equal(result.message_code, "safety_ok");
});

test("a mixed licensed and prohibited signal is not treated as licensed-only", () => {
  const result = normalizeModelSafety(modelSafety("blocked", ["medical", "drugs"], 0.9));
  assert.equal(result.verdict, "blocked");
});

test("unusable content is detected deterministically without a word list", () => {
  for (const text of ["", "   ", "???", "..!!", "аа", "ааааааааа", "7777777"]) {
    assert.equal(isUnusableContent(text), true, JSON.stringify(text));
  }
  for (const text of ["Потік", "Rohr", "нужен сантехник", "Hilfe bei Umzug"]) {
    assert.equal(isUnusableContent(text), false, text);
  }
});

test("the deterministic unusable verdict asks for details instead of blocking", () => {
  const result = unusableContentSafety();
  assert.equal(result.verdict, "manual_review");
  assert.deepEqual(result.reason_codes, ["unusable_content"]);
  assert.equal(result.message_code, "safety_needs_details");
});
