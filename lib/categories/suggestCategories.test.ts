import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CATEGORY_SUGGEST_DEFAULT_LIMIT,
  CATEGORY_SUGGEST_MAX_LIMIT,
  parseCategorySuggestLimit,
  sanitizeForIlike,
  suggestCategories,
} from "./suggestCategories.ts";
import {
  categoryHarness,
  createCategorySupabaseMock,
  resetCategoryHarness,
} from "./testMocks/searchableCategories.mjs";

type CategorySeed = {
  category_id: string;
  slug: string;
  title: string;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  specialists_count?: number;
};

function seedCategories(rows: CategorySeed[]) {
  categoryHarness.categories = rows.map((row) => ({
    title_ru: null,
    title_de: null,
    title_ua: null,
    specialists_count: 0,
    ...row,
  }));
}

function client() {
  return createCategorySupabaseMock() as unknown as SupabaseClient;
}

function run(query: string | null, langCode: string | null = "ru", limit = 8) {
  return suggestCategories(client(), { query, langCode, limit });
}

test.beforeEach(() => {
  resetCategoryHarness();
});

test("30. an empty query returns the most populated categories in the documented order", async () => {
  seedCategories([
    { category_id: "a", slug: "zeta", title: "Zeta", specialists_count: 5 },
    { category_id: "b", slug: "alpha", title: "Alpha", specialists_count: 5 },
    { category_id: "c", slug: "beta", title: "Beta", specialists_count: 9 },
  ]);
  const result = await run("   ");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.map((row) => row.slug),
    ["beta", "alpha", "zeta"],
  );
  // Only the top query runs when there is nothing to match.
  assert.deepEqual(
    categoryHarness.queries.map((q: { table: string }) => q.table),
    ["v_searchable_categories"],
  );
});

test("30. a term match outranks a title match and the language bonus breaks the tie", async () => {
  seedCategories([
    { category_id: "plumb", slug: "plumbing", title: "Plumbing", title_ru: "Сантехника" },
    { category_id: "handy", slug: "handyman", title: "Handyman", title_ru: "Мастер на час" },
    { category_id: "other", slug: "other", title: "Сантехника прочее" },
  ]);
  categoryHarness.terms = [
    { category_id: "plumb", term: "сантехник", lang: "ru", is_active: true },
    { category_id: "handy", term: "сантехник на час", lang: null, is_active: true },
  ];

  const result = await run("сантехник");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.map((row) => row.id),
    ["plumb", "handy", "other"],
  );
});

test("30. the mapped shape keeps the public field names and coerces nulls", async () => {
  seedCategories([
    {
      category_id: "plumb",
      slug: "plumbing",
      title: "Plumbing",
      title_ru: "Сантехника",
      title_de: null,
      title_ua: null,
      specialists_count: 3,
    },
  ]);
  categoryHarness.terms = [
    { category_id: "plumb", term: "сантехник", lang: "ru", is_active: true },
  ];
  const result = await run("сантехник");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.data[0], {
    id: "plumb",
    slug: "plumbing",
    title: "Plumbing",
    title_ru: "Сантехника",
    title_de: "",
    title_ua: "",
    specialists_count: 3,
  });
});

test("30. no match yields an empty list, not an error", async () => {
  seedCategories([{ category_id: "plumb", slug: "plumbing", title: "Plumbing" }]);
  const result = await run("astrophysics");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.data, []);
});

test("30. inactive search terms are ignored", async () => {
  seedCategories([{ category_id: "plumb", slug: "plumbing", title: "Plumbing" }]);
  categoryHarness.terms = [
    { category_id: "plumb", term: "сантехник", lang: "ru", is_active: false },
  ];
  const result = await run("сантехник");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.data, []);
});

test("30. each failing stage is reported with its own log discriminator", async () => {
  const stages: Array<[string, string]> = [
    ["v_searchable_categories:top", "v_searchable_categories top"],
    ["category_search_terms", "category_search_terms"],
    ["v_searchable_categories:ids", "v_searchable_categories ids"],
    ["v_searchable_categories:full", "v_searchable_categories full"],
  ];

  for (const [injectAt, expectedStage] of stages) {
    resetCategoryHarness();
    seedCategories([{ category_id: "plumb", slug: "plumbing", title: "Plumbing" }]);
    categoryHarness.terms = [
      { category_id: "plumb", term: "сантехник", lang: "ru", is_active: true },
    ];
    categoryHarness.errors = { [injectAt]: { message: "boom" } };

    const result = await suggestCategories(client(), {
      query: expectedStage === "v_searchable_categories top" ? "" : "сантехник",
      langCode: "ru",
      limit: 8,
    });
    assert.equal(result.ok, false, expectedStage);
    if (result.ok) return;
    assert.equal(result.stage, expectedStage);
  }
});

test("30. the limit is clamped exactly as the endpoint always clamped it", () => {
  assert.equal(parseCategorySuggestLimit(null), CATEGORY_SUGGEST_DEFAULT_LIMIT);
  assert.equal(parseCategorySuggestLimit(""), CATEGORY_SUGGEST_DEFAULT_LIMIT);
  assert.equal(parseCategorySuggestLimit("abc"), CATEGORY_SUGGEST_DEFAULT_LIMIT);
  assert.equal(parseCategorySuggestLimit("0"), CATEGORY_SUGGEST_DEFAULT_LIMIT);
  assert.equal(parseCategorySuggestLimit("-5"), CATEGORY_SUGGEST_DEFAULT_LIMIT);
  assert.equal(parseCategorySuggestLimit("3"), 3);
  assert.equal(parseCategorySuggestLimit("999"), CATEGORY_SUGGEST_MAX_LIMIT);
});

test("30. ILIKE-breaking characters are still stripped from the query", () => {
  assert.equal(sanitizeForIlike("  %сан_тех,ник\\  "), "сантехник");
});

test("the limit also caps a scored result set", async () => {
  seedCategories([
    { category_id: "a", slug: "a", title: "сантехник a", specialists_count: 3 },
    { category_id: "b", slug: "b", title: "сантехник b", specialists_count: 2 },
    { category_id: "c", slug: "c", title: "сантехник c", specialists_count: 1 },
  ]);
  const result = await run("сантехник", "ru", 2);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.map((row) => row.id),
    ["a", "b"],
  );
});
