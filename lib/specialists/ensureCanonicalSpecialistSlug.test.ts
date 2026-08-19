import assert from "node:assert/strict";
import test from "node:test";

import {
  isStoredSlugCanonical,
  resolveCanonicalSlugForPublish,
} from "./ensureCanonicalSpecialistSlug.ts";

function createMockSupabase(opts: {
  specialist?: { id: string; slug: string | null; name: string | null; category_id: string | null };
  category?: { slug: string } | null;
  city?: { slug: string } | null;
  profile?: { city: string | null } | null;
  existingSlugs?: string[];
}) {
  const existingSlugs = new Set(opts.existingSlugs ?? []);
  let lastTable = "";
  let lastEqCol = "";
  let lastEqVal: unknown = null;

  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = (col: string, val: unknown) => {
    lastEqCol = col;
    lastEqVal = val;
    return chain;
  };
  chain.ilike = self;
  chain.maybeSingle = async () => {
    if (lastTable === "specialists" && lastEqCol === "slug") {
      const slug = lastEqVal as string;
      if (existingSlugs.has(slug)) {
        return { data: { id: "other-id" }, error: null };
      }
      return { data: null, error: null };
    }
    if (lastTable === "specialists" && lastEqCol === "id") {
      return { data: opts.specialist ?? null, error: null };
    }
    if (lastTable === "categories") {
      return { data: opts.category ?? null, error: null };
    }
    if (lastTable === "specialist_profiles") {
      return { data: opts.profile ?? { city: "Berlin" }, error: null };
    }
    if (lastTable === "cities") {
      return { data: opts.city ?? { slug: "berlin" }, error: null };
    }
    return { data: null, error: null };
  };

  return {
    from(name: string) {
      lastTable = name;
      lastEqCol = "";
      lastEqVal = null;
      return chain;
    },
  };
}

test("isStoredSlugCanonical: valid ASCII slug", () => {
  assert.equal(isStoredSlugCanonical("anna-petrova"), true);
  assert.equal(isStoredSlugCanonical("psychologists-oksana-pantelidi"), true);
});

test("isStoredSlugCanonical: null/empty", () => {
  assert.equal(isStoredSlugCanonical(null), false);
  assert.equal(isStoredSlugCanonical(undefined), false);
  assert.equal(isStoredSlugCanonical(""), false);
  assert.equal(isStoredSlugCanonical("  "), false);
});

test("isStoredSlugCanonical: non-ASCII slug", () => {
  assert.equal(isStoredSlugCanonical("анна-петрова"), false);
  assert.equal(isStoredSlugCanonical("Психологи-Оксана"), false);
});

test("isStoredSlugCanonical: known garbled alias is NOT canonical", () => {
  assert.equal(isStoredSlugCanonical("nhliy-oyimbzeae"), false);
  assert.equal(isStoredSlugCanonical("zkeiy-lbztieh"), false);
  assert.equal(isStoredSlugCanonical("mymyzth-sbtbih"), false);
});

test("resolve: existing good ASCII slug preserved unchanged", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: "psychologists-anna", name: "Anna", category_id: "cat-1" },
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: "psychologists-anna",
    name: "Anna",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slug, "psychologists-anna");
    assert.equal(result.changed, false);
    assert.equal(result.slugLegacy, null);
  }
});

test("resolve: null slug generates canonical from category/city/name", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: null, name: "Anna Petrova", category_id: "cat-1" },
    category: { slug: "psychologists" },
    city: { slug: "berlin" },
    profile: { city: "Berlin" },
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: null,
    name: "Anna Petrova",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.changed, true);
    assert.equal(result.slugLegacy, null);
    assert.match(result.slug, /^psychologists-berlin-anna-petrova/);
  }
});

test("resolve: non-ASCII slug migrated, old value preserved as slugLegacy", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: "анна-петрова", name: "Anna Petrova", category_id: "cat-1" },
    category: { slug: "psychologists" },
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: "анна-петрова",
    name: "Anna Petrova",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.changed, true);
    assert.equal(result.slugLegacy, "анна-петрова");
    assert.equal(result.slug, "anna-petrova");
  }
});

test("resolve: known garbled ASCII alias resolved to its mapped canonical", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: "nhliy-oyimbzeae", name: "Оксана", category_id: "cat-1" },
    category: { slug: "psychologists" },
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: "nhliy-oyimbzeae",
    name: "Оксана",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.changed, true);
    assert.equal(result.slug, "psychologists-oksana-pantelidi");
    assert.equal(result.slugLegacy, "nhliy-oyimbzeae");
  }
});

test("resolve: slug generation failure returns ok=false", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: null, name: "", category_id: null },
    category: null,
    city: null,
    profile: null,
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: null,
    name: "",
    category_id: null,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "slug_generation_failed");
  }
});

test("resolve: collision uses deterministic -2, -3 suffix", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: null, name: "Anna Petrova", category_id: "cat-1" },
    category: { slug: "psychologists" },
    city: { slug: "berlin" },
    profile: { city: "Berlin" },
    existingSlugs: ["psychologists-berlin-anna-petrova", "psychologists-berlin-anna-petrova-2"],
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: null,
    name: "Anna Petrova",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slug, "psychologists-berlin-anna-petrova-3");
    assert.equal(result.changed, true);
  }
});

test("resolve: already-published with valid slug returns unchanged", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: "good-slug", name: "Test", category_id: "cat-1" },
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: "good-slug",
    name: "Test",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slug, "good-slug");
    assert.equal(result.changed, false);
  }
});

test("resolve: already-published with garbled slug triggers repair", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: "zkeiy-lbztieh", name: "Ирина Мельник", category_id: "cat-1" },
    category: { slug: "cosmetologists" },
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: "zkeiy-lbztieh",
    name: "Ирина Мельник",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slug, "cosmetologists-kassel-irina-melnik");
    assert.equal(result.slugLegacy, "zkeiy-lbztieh");
    assert.equal(result.changed, true);
  }
});

test("resolve: garbled alias collision falls back to -2 suffix", async () => {
  const service = createMockSupabase({
    specialist: { id: "id-1", slug: "nhliy-oyimbzeae", name: "Оксана", category_id: "cat-1" },
    existingSlugs: ["psychologists-oksana-pantelidi"],
  });
  const result = await resolveCanonicalSlugForPublish(service as never, "id-1", {
    slug: "nhliy-oyimbzeae",
    name: "Оксана",
    category_id: "cat-1",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slug, "psychologists-oksana-pantelidi-2");
    assert.equal(result.changed, true);
  }
});
