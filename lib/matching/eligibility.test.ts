import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMatch, type MatchCandidate, type MatchRequest } from "./eligibility.ts";
import { canonicalizeLanguage, languagesOverlap } from "./languages.ts";

function candidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: "specialist-1",
    categoryIds: ["tax"],
    languages: ["de"],
    workFormat: "online",
    city: "Hamburg",
    postalCode: "20095",
    status: "published_unverified",
    isActive: true,
    isVisible: true,
    billingVisibilityBlocked: false,
    isTest: false,
    ...overrides,
  };
}

function request(overrides: Partial<MatchRequest> = {}): MatchRequest {
  return {
    id: "request-1",
    categoryId: "tax",
    serviceLanguages: [],
    workFormat: "online",
    city: null,
    postalCode: null,
    ...overrides,
  };
}

test("1. request ru matches a russian-speaking specialist", () => {
  assert.equal(evaluateMatch(request({ serviceLanguages: ["ru"] }), candidate({ languages: ["ru"] })).eligible, true);
});

test("2. request ru matches a specialist who also speaks german", () => {
  assert.equal(evaluateMatch(request({ serviceLanguages: ["ru"] }), candidate({ languages: ["ru", "de"] })).eligible, true);
});

test("3. request ru does not language-match a german-only specialist", () => {
  const decision = evaluateMatch(request({ serviceLanguages: ["ru"] }), candidate({ languages: ["de"] }));
  assert.equal(decision.eligible, false);
  assert.equal(decision.reasons.includes("language_match"), false);
});

test("4. request ru+de matches a german-speaking specialist", () => {
  assert.equal(
    evaluateMatch(request({ serviceLanguages: ["ru", "de"] }), candidate({ languages: ["de"] })).eligible,
    true,
  );
});

test("5. an empty language requirement does not exclude a german specialist", () => {
  assert.equal(evaluateMatch(request({ serviceLanguages: [] }), candidate({ languages: ["de"] })).eligible, true);
});

test("6. interface locale is not a matching input and does not exclude", () => {
  const decision = evaluateMatch(request({ serviceLanguages: [] }), candidate({ languages: ["de"] }));
  assert.equal(decision.eligible, true);
  assert.equal("interface_locale" in request(), false);
});

test("7. source language is not a matching input and does not exclude", () => {
  assert.equal(evaluateMatch(request({ serviceLanguages: [] }), candidate({ languages: ["en"] })).eligible, true);
  assert.equal("source_language" in request(), false);
});

test("8. an english interface with a russian requirement matches russian, not english", () => {
  assert.equal(evaluateMatch(request({ serviceLanguages: ["ru"] }), candidate({ languages: ["en"] })).eligible, false);
  assert.equal(evaluateMatch(request({ serviceLanguages: ["ru"] }), candidate({ languages: ["ru"] })).eligible, true);
});

test("9. a language code the matcher has never listed still matches", () => {
  assert.equal(canonicalizeLanguage("pl"), "pl");
  assert.equal(languagesOverlap(["pl"], ["pl"]), true);
  assert.equal(evaluateMatch(request({ serviceLanguages: ["pl"] }), candidate({ languages: ["pl"] })).eligible, true);
  assert.equal(evaluateMatch(request({ serviceLanguages: ["pl"] }), candidate({ languages: ["de"] })).eligible, false);
});

test("10. legacy ua and standard uk are the same language", () => {
  assert.equal(canonicalizeLanguage("ua"), "uk");
  assert.equal(canonicalizeLanguage("uk-UA"), "uk");
  assert.equal(languagesOverlap(["ua"], ["uk"]), true);
  assert.equal(languagesOverlap(["uk"], ["ua"]), true);
  assert.equal(evaluateMatch(request({ serviceLanguages: ["ua"] }), candidate({ languages: ["uk"] })).eligible, true);
});

test("11. a category matches when the specialist offers it", () => {
  const decision = evaluateMatch(request({ categoryId: "tax" }), candidate({ categoryIds: ["tax"] }));
  assert.equal(decision.eligible, true);
  assert.ok(decision.reasons.includes("category_match"));
});

test("12. a different category does not match", () => {
  assert.equal(evaluateMatch(request({ categoryId: "tax" }), candidate({ categoryIds: ["plumbing"] })).eligible, false);
});

test("a missing category does not reject the specialist", () => {
  const decision = evaluateMatch(request({ categoryId: null }), candidate({ categoryIds: ["plumbing"] }));
  assert.equal(decision.eligible, true);
  assert.equal(decision.reasons.includes("category_match"), false);
});

test("13. an online request matches an online or hybrid specialist and ignores city", () => {
  assert.equal(evaluateMatch(request({ workFormat: "online", city: "Hamburg" }), candidate({ workFormat: "online", city: "Berlin" })).eligible, true);
  assert.equal(evaluateMatch(request({ workFormat: "online" }), candidate({ workFormat: "hybrid", city: "Berlin" })).eligible, true);
  assert.equal(evaluateMatch(request({ workFormat: "online" }), candidate({ workFormat: "offline" })).eligible, false);
});

test("14. an offline request matches the same city", () => {
  const decision = evaluateMatch(
    request({ workFormat: "offline", city: "Hamburg" }),
    candidate({ workFormat: "offline", city: "hamburg" }),
  );
  assert.equal(decision.eligible, true);
  assert.ok(decision.reasons.includes("location_match"));
});

test("15. an offline request does not match a different city", () => {
  assert.equal(
    evaluateMatch(
      request({ workFormat: "offline", city: "Hamburg" }),
      candidate({ workFormat: "offline", city: "Berlin" }),
    ).eligible,
    false,
  );
});

test("16. hybrid accepts online or a physically compatible specialist", () => {
  assert.equal(evaluateMatch(request({ workFormat: "hybrid", city: "Hamburg" }), candidate({ workFormat: "online", city: "Berlin" })).eligible, true);
  assert.equal(evaluateMatch(request({ workFormat: "hybrid", city: "Hamburg" }), candidate({ workFormat: "offline", city: "Hamburg" })).eligible, true);
  assert.equal(evaluateMatch(request({ workFormat: "hybrid", city: "Hamburg" }), candidate({ workFormat: "offline", city: "Berlin" })).eligible, false);
});

test("17. an unpublished specialist is excluded", () => {
  assert.equal(evaluateMatch(request(), candidate({ status: "draft", isVisible: false })).eligible, false);
  assert.equal(evaluateMatch(request(), candidate({ isActive: false })).eligible, false);
});

test("18. a published visible specialist is included", () => {
  assert.equal(evaluateMatch(request(), candidate({ status: "published_unverified" })).eligible, true);
  assert.equal(evaluateMatch(request(), candidate({ status: "featured_verified" })).eligible, true);
});

test("21. match reasons are stable and contain no free text", () => {
  const first = evaluateMatch(request({ serviceLanguages: ["ru"], workFormat: "online" }), candidate({ languages: ["ru"] }));
  const second = evaluateMatch(request({ serviceLanguages: ["ru"], workFormat: "online" }), candidate({ languages: ["ru"] }));
  assert.deepEqual(first, second);
  assert.deepEqual(first.reasons, ["category_match", "language_match", "format_match", "location_not_required"]);
});

test("paid plan is not required", () => {
  assert.equal(evaluateMatch(request(), candidate()).eligible, true);
});
