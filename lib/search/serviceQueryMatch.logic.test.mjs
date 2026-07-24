/**
 * Unit tests for the pure Phase 2 service-query-match helpers.
 * No DB / no React; pure logic only.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_DESCRIPTION_SINGLE_WORD_LENGTH,
  buildDescriptionSearchTerms,
  isDescriptionEligibleTerm,
  mergeQuerySpecialistIds,
} from "./serviceQueryMatch.ts";

// --- mergeQuerySpecialistIds (§8.1) --------------------------------------

test("merge: direct + category union", () => {
  assert.deepEqual(mergeQuerySpecialistIds(["A"], ["B", "C"]), ["A", "B", "C"]);
});

test("merge: duplicates removed, category does not evict direct", () => {
  assert.deepEqual(mergeQuerySpecialistIds(["A", "B"], ["B", "C"]), [
    "A",
    "B",
    "C",
  ]);
});

test("merge: direct match preserved even if only category present overlaps", () => {
  // A is a direct service match; category expansion returns B, C (not A).
  const result = mergeQuerySpecialistIds(["A"], ["B", "C"]);
  assert.ok(result.includes("A"), "direct match A must survive");
});

test("merge: empty inputs", () => {
  assert.deepEqual(mergeQuerySpecialistIds([], []), []);
  assert.deepEqual(mergeQuerySpecialistIds(["A"], []), ["A"]);
  assert.deepEqual(mergeQuerySpecialistIds([], ["B"]), ["B"]);
});

test("merge: falsy ids filtered", () => {
  assert.deepEqual(
    mergeQuerySpecialistIds(["A", "", null, undefined], ["B", ""]),
    ["A", "B"]
  );
});

test("merge: order is direct-first then category", () => {
  assert.deepEqual(mergeQuerySpecialistIds(["X", "Y"], ["Y", "Z", "X"]), [
    "X",
    "Y",
    "Z",
  ]);
});

// --- description eligibility (§4 rule) -----------------------------------

test("description eligibility: short single words excluded", () => {
  assert.equal(isDescriptionEligibleTerm("ремонт"), false); // 6 chars
  assert.equal(isDescriptionEligibleTerm("уборка"), false);
  assert.equal(isDescriptionEligibleTerm("психолог"), false); // 8 chars
  assert.equal(isDescriptionEligibleTerm("it"), false);
});

test("description eligibility: multi-word phrases included", () => {
  assert.equal(isDescriptionEligibleTerm("собрать шкаф"), true);
  assert.equal(isDescriptionEligibleTerm("ремонт квартиры"), true);
});

test("description eligibility: long single tokens included", () => {
  assert.equal(isDescriptionEligibleTerm("steuererklärung"), true); // 15
  assert.equal(isDescriptionEligibleTerm("übersetzung"), true); // 11
  assert.equal(
    isDescriptionEligibleTerm("x".repeat(MIN_DESCRIPTION_SINGLE_WORD_LENGTH)),
    true
  );
  assert.equal(
    isDescriptionEligibleTerm(
      "x".repeat(MIN_DESCRIPTION_SINGLE_WORD_LENGTH - 1)
    ),
    false
  );
});

test("description eligibility: blank/invalid", () => {
  assert.equal(isDescriptionEligibleTerm(""), false);
  assert.equal(isDescriptionEligibleTerm("   "), false);
  assert.equal(isDescriptionEligibleTerm(undefined), false);
  assert.equal(isDescriptionEligibleTerm(null), false);
});

test("buildDescriptionSearchTerms: broad one-word query yields no description terms", () => {
  assert.deepEqual(
    buildDescriptionSearchTerms("ремонт", ["ремонт", "reparatur"]),
    []
  );
});

test("buildDescriptionSearchTerms: phrase query keeps eligible phrases only", () => {
  const out = buildDescriptionSearchTerms("собрать шкаф ikea", [
    "собрать шкаф ikea",
    "собрать шкаф",
    "ikea",
  ]);
  assert.ok(out.includes("собрать шкаф ikea"));
  assert.ok(out.includes("собрать шкаф"));
  assert.ok(!out.includes("ikea")); // short single word excluded
});

test("buildDescriptionSearchTerms: long compound single word included, deduped", () => {
  const out = buildDescriptionSearchTerms("steuererklärung", [
    "steuererklärung",
    "steuer",
  ]);
  assert.deepEqual(out, ["steuererklärung"]);
});
