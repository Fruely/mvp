import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  normalizeSearchQuery,
  resolveCategorySlugsFromQuery,
} = await import("../search/searchSynonyms.ts");

test("coach synonym queries resolve unambiguously to coaches", () => {
  for (const query of ["коучинг", "coach", "coaching", "life coach"]) {
    const normalized = normalizeSearchQuery(query);
    assert.ok(normalized);
    assert.deepEqual(resolveCategorySlugsFromQuery(normalized), ["coaches"]);
  }
});

test("wizard category resolver uses shared synonym fallback", () => {
  const src = readFileSync(
    new URL("./resolveServiceToCategory.ts", import.meta.url),
    "utf8",
  );

  assert.match(src, /normalizeSearchQuery/);
  assert.match(src, /resolveCategorySlugsFromQuery/);
  assert.match(src, /uniqueSlugs\.length === 1/);
});
