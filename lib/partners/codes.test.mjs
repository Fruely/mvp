import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReferralCode, validateReferralCode, isValidReferralCode } from "./codes.ts";

test("normalizeReferralCode", () => {
  assert.equal(normalizeReferralCode(" Anna Germany "), "anna-germany");
  assert.equal(normalizeReferralCode("Foo__Bar"), "foobar");
});

test("reserved codes rejected", () => {
  assert.equal(isValidReferralCode("admin"), false);
  assert.equal(isValidReferralCode("api"), false);
  assert.equal(validateReferralCode("partners").ok, false);
});

test("valid codes accepted", () => {
  const r = validateReferralCode("anna-germany");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.code, "anna-germany");
});
