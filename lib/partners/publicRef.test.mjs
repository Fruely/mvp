import assert from "node:assert/strict";
import test from "node:test";
import { publicCommissionRef } from "./publicRef.ts";

test("publicCommissionRef is stable and anonymized", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  const a = publicCommissionRef(id);
  const b = publicCommissionRef(id);
  assert.equal(a, b);
  assert.match(a, /^FR-P-[0-9A-HJ-NP-Z]{4}$/);
  assert.equal(a.includes(id), false);
});

test("different commission ids produce different refs usually", () => {
  const a = publicCommissionRef("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  const b = publicCommissionRef("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
  assert.notEqual(a, b);
});
