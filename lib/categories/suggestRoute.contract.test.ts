import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import { categoryHarness, resetCategoryHarness } from "./testMocks/searchableCategories.mjs";

register(new URL("./suggestRoute.contract.hooks.mjs", import.meta.url).href);

const { GET } = await import(
  new URL("../../app/api/categories/suggest/route.ts", import.meta.url).href
);

function request(query: string) {
  return { url: `https://freuly.test/api/categories/suggest${query}` } as never;
}

test.beforeEach(() => {
  resetCategoryHarness();
  categoryHarness.categories = [
    {
      category_id: "plumb",
      slug: "plumbing",
      title: "Plumbing",
      title_ru: "Сантехника",
      title_de: null,
      title_ua: null,
      specialists_count: 4,
    },
    {
      category_id: "clean",
      slug: "cleaning",
      title: "Cleaning",
      title_ru: "Уборка",
      title_de: null,
      title_ua: null,
      specialists_count: 9,
    },
  ];
  categoryHarness.terms = [
    { category_id: "plumb", term: "сантехник", lang: "ru", is_active: true },
  ];
});

test("30. the endpoint still answers { data: [...] } with the same item shape", async () => {
  const response = await GET(request("?q=сантехник&lang=ru"));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(json), ["data"]);
  assert.deepEqual(json.data[0], {
    id: "plumb",
    slug: "plumbing",
    title: "Plumbing",
    title_ru: "Сантехника",
    title_de: "",
    title_ua: "",
    specialists_count: 4,
  });
  // No internal ranking score leaks into the public payload.
  assert.equal("score" in json.data[0], false);
});

test("30. an empty query still returns the most populated categories", async () => {
  const response = await GET(request("?lang=ru"));
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(
    json.data.map((row: { slug: string }) => row.slug),
    ["cleaning", "plumbing"],
  );
});

test("30. the limit parameter is still honoured and clamped", async () => {
  const limited = await GET(request("?limit=1"));
  assert.equal((await limited.json()).data.length, 1);

  const invalid = await GET(request("?limit=abc"));
  assert.equal((await invalid.json()).data.length, 2);
});

test("30. a database failure still returns the same opaque 500", async () => {
  categoryHarness.errors = { category_search_terms: { message: "boom" } };
  const response = await GET(request("?q=сантехник&lang=ru"));
  const json = await response.json();
  assert.equal(response.status, 500);
  assert.deepEqual(json, { error: "Failed to load suggestions" });
});

test("30. an unexpected throw is still caught and reported as 500", async () => {
  categoryHarness.throwOnFrom = true;
  const response = await GET(request("?q=сантехник&lang=ru"));
  const json = await response.json();
  assert.equal(response.status, 500);
  assert.deepEqual(json, { error: "Failed to load suggestions" });
});
