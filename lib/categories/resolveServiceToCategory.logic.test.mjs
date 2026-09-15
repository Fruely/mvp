import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  normalizeSearchQuery,
  resolveCategorySlugsFromQuery,
} = await import("../search/searchSynonyms.ts");
const {
  buildServiceSearchCategoryUrl,
} = await import("../search/serviceSearchUrl.ts");

test("coach synonym queries resolve unambiguously to coaches", () => {
  for (const query of ["коучинг", "coach", "coaching", "life coach", "коуч"]) {
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

test("resolved coaches + UA UI + RU service language keeps ui=ua", () => {
  const url = buildServiceSearchCategoryUrl({
    categorySlug: "coaches",
    language: "ru",
    format: "online",
    location: "",
    uiLang: "ua",
  });
  const p = new URLSearchParams(url.split("?")[1]);
  assert.equal(p.get("ui"), "ua");
  assert.equal(p.get("lang"), "ru");
  assert.equal(p.get("category"), "coaches");
});
