import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrioritizedOrderedPool,
  isPremiumPlacement,
  selectCategoryDiverseSpecialists,
  seededShuffle,
  utcDaySeed,
  utcHalfDaySeed,
} from "./recommendedSelection.ts";

function row(id, categoryId, extras = {}) {
  return {
    id,
    category_id: categoryId,
    founder_badge: false,
    is_featured: false,
    status: "published_unverified",
    featured_priority: 0,
    published_at: "2026-01-01T00:00:00.000Z",
    ...extras,
  };
}

function uniqueCategories(selected) {
  return new Set(
    selected
      .map((item) => item.category_id)
      .filter((categoryId) => typeof categoryId === "string" && categoryId.length > 0),
  );
}

test("selectCategoryDiverseSpecialists picks four unique categories when available", () => {
  const pool = [
    row("a", "psychologist"),
    row("b", "cosmetologist"),
    row("c", "housemaster"),
    row("d", "lawyer"),
    row("e", "psychologist"),
  ];

  const selected = selectCategoryDiverseSpecialists(pool, 42, 4);
  assert.equal(selected.length, 4);
  assert.equal(uniqueCategories(selected).size, 4);
  assert.equal(new Set(selected.map((item) => item.id)).size, 4);
});

test("selectCategoryDiverseSpecialists picks one from each when exactly four categories exist", () => {
  const pool = [
    row("1", "cat-a"),
    row("2", "cat-b"),
    row("3", "cat-c"),
    row("4", "cat-d"),
  ];
  const selected = selectCategoryDiverseSpecialists(pool, 99, 4);
  assert.deepEqual(
    [...uniqueCategories(selected)].sort(),
    ["cat-a", "cat-b", "cat-c", "cat-d"].sort(),
  );
});

test("selectCategoryDiverseSpecialists fills fourth slot when only three categories exist", () => {
  const pool = [
    row("a1", "psychologist"),
    row("a2", "psychologist"),
    row("b1", "cosmetologist"),
    row("c1", "housemaster"),
    row("d1", "housemaster"),
  ];
  const selected = selectCategoryDiverseSpecialists(pool, 7, 4);
  assert.equal(selected.length, 4);
  assert.equal(uniqueCategories(selected).size, 3);
  assert.equal(new Set(selected.map((item) => item.id)).size, 4);
});

test("selectCategoryDiverseSpecialists returns up to four specialists from a single category", () => {
  const pool = [
    row("p1", "psychologist"),
    row("p2", "psychologist"),
    row("p3", "psychologist"),
    row("p4", "psychologist"),
    row("p5", "psychologist"),
  ];
  const selected = selectCategoryDiverseSpecialists(pool, 11, 4);
  assert.equal(selected.length, 4);
  assert.equal(uniqueCategories(selected).size, 1);
  assert.equal(new Set(selected.map((item) => item.id)).size, 4);
});

test("selectCategoryDiverseSpecialists rotates category representatives across seed windows", () => {
  const pool = [
    row("p1", "psychologist"),
    row("p2", "psychologist"),
    row("p3", "psychologist"),
    row("c1", "cosmetologist"),
    row("h1", "housemaster"),
    row("l1", "lawyer"),
  ];

  const seedA = selectCategoryDiverseSpecialists(pool, 100, 4);
  const seedB = selectCategoryDiverseSpecialists(pool, 200, 4);
  const psychologistA = seedA.find((item) => item.category_id === "psychologist")?.id;
  const psychologistB = seedB.find((item) => item.category_id === "psychologist")?.id;

  assert.ok(psychologistA);
  assert.ok(psychologistB);
  assert.notEqual(psychologistA, psychologistB);
});

test("selectCategoryDiverseSpecialists is stable for the same seed", () => {
  const pool = [
    row("a", "cat-a"),
    row("b", "cat-b"),
    row("c", "cat-c"),
    row("d", "cat-d"),
    row("e", "cat-e"),
  ];
  const first = selectCategoryDiverseSpecialists(pool, 555, 4);
  const second = selectCategoryDiverseSpecialists(pool, 555, 4);
  assert.deepEqual(
    first.map((item) => item.id),
    second.map((item) => item.id),
  );
});

test("selectCategoryDiverseSpecialists can change order across different seeds", () => {
  const pool = [
    row("a", "cat-a"),
    row("b", "cat-b"),
    row("c", "cat-c"),
    row("d", "cat-d"),
  ];
  const first = selectCategoryDiverseSpecialists(pool, 1, 4).map((item) => item.id);
  const second = selectCategoryDiverseSpecialists(pool, 999_999, 4).map((item) => item.id);
  assert.notDeepEqual(first, second);
});

test("buildPrioritizedOrderedPool keeps founders ahead of premium for category picks", () => {
  const founderPool = [row("founder-1", "psychologist", { founder_badge: true })];
  const premiumPool = [
    row("premium-1", "psychologist", { is_featured: true, featured_priority: 50 }),
  ];
  const discoveryPool = [row("disc-1", "lawyer")];

  const ordered = buildPrioritizedOrderedPool(founderPool, premiumPool, discoveryPool, 10, 20);
  const selected = selectCategoryDiverseSpecialists(ordered, 30, 2);
  const psychologist = selected.find((item) => item.category_id === "psychologist");

  assert.equal(psychologist?.id, "founder-1");
  assert.equal(isPremiumPlacement({ is_featured: true, status: null }), true);
});

test("seededShuffle and half-day seed helpers are deterministic", () => {
  const items = ["a", "b", "c", "d", "e"];
  const shuffledA = seededShuffle(items, 123);
  const shuffledB = seededShuffle(items, 123);
  assert.deepEqual(shuffledA, shuffledB);

  const day = new Date("2026-08-15T10:00:00.000Z");
  assert.equal(utcDaySeed(day), utcDaySeed(new Date("2026-08-15T22:00:00.000Z")));
  assert.notEqual(
    utcHalfDaySeed(new Date("2026-08-15T10:00:00.000Z")),
    utcHalfDaySeed(new Date("2026-08-15T22:00:00.000Z")),
  );
});

test("selectCategoryDiverseSpecialists never returns duplicate specialist ids", () => {
  const pool = Array.from({ length: 12 }).map((_, index) =>
    row(`id-${index}`, `cat-${index % 6}`),
  );
  const selected = selectCategoryDiverseSpecialists(pool, 808, 4);
  assert.equal(selected.length, 4);
  assert.equal(new Set(selected.map((item) => item.id)).size, 4);
});

test("selectCategoryDiverseSpecialists returns four when at least four eligible rows exist", () => {
  const pool = Array.from({ length: 8 }).map((_, index) =>
    row(`id-${index}`, `cat-${index % 5}`),
  );
  const selected = selectCategoryDiverseSpecialists(pool, 12, 4);
  assert.equal(selected.length, 4);
});
