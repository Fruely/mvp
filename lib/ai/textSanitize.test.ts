import assert from "node:assert/strict";
import test from "node:test";

import { containsObviousContactInfo, sanitizeFreeText } from "./textSanitize.ts";

test("10. phone numbers, email, links and handles are replaced", () => {
  const sanitized = sanitizeFreeText(
    "Нужен сантехник, звоните +49 151 12345678 или anna.m@example.com, " +
      "профиль https://example.com/anna и @anna_master",
  );
  assert.ok(sanitized);
  for (const forbidden of [
    "+49 151 12345678",
    "15112345678",
    "anna.m@example.com",
    "https://example.com/anna",
    "@anna_master",
  ]) {
    assert.ok(!sanitized.includes(forbidden), forbidden);
  }
  assert.ok(sanitized.includes("[phone removed]"));
  assert.ok(sanitized.includes("[contact removed]"));
  assert.ok(sanitized.includes("[link removed]"));
  assert.ok(sanitized.includes("[handle removed]"));
  // The actual request survives sanitizing.
  assert.ok(sanitized.startsWith("Нужен сантехник"));
});

test("10. contact detection agrees with the replacement patterns", () => {
  for (const text of [
    "anna@example.com",
    "www.example.com/anna",
    "http://example.com",
    "напишите @anna_master",
    "+380 67 123 45 67",
    "0151/1234567",
  ]) {
    assert.equal(containsObviousContactInfo(text), true, text);
    const sanitized = sanitizeFreeText(text);
    assert.equal(sanitized === null || !containsObviousContactInfo(sanitized), true, text);
  }
});

test("ordinary text is untouched apart from whitespace collapsing", () => {
  assert.equal(
    sanitizeFreeText("  Потрібен   сантехнік\n у Гамбурзі  "),
    "Потрібен сантехнік у Гамбурзі",
  );
  assert.equal(containsObviousContactInfo("Потрібен сантехнік у Гамбурзі"), false);
});

test("a house number or price is not mistaken for a phone number", () => {
  assert.equal(sanitizeFreeText("Hausnummer 12, Budget 200 Euro"), "Hausnummer 12, Budget 200 Euro");
  assert.equal(containsObviousContactInfo("Hausnummer 12, Budget 200 Euro"), false);
});

test("empty input yields null", () => {
  for (const value of ["", "   ", null, undefined]) {
    assert.equal(sanitizeFreeText(value), null);
  }
});
