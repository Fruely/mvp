import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../../app/sitemap.ts", import.meta.url), "utf8");
function loadSitemap(rows) {
  const calls = [];
  const client = {
    from(table) {
      const filters = [];
      const query = {
        select() { return query; },
        not(...args) { filters.push(["not", ...args]); return query; },
        neq(...args) { filters.push(["neq", ...args]); return query; },
        eq(...args) { filters.push(["eq", ...args]); return query; },
        in(...args) { filters.push(["in", ...args]); return query; },
        or(...args) { filters.push(["or", ...args]); return query; },
        then(resolve) {
          calls.push({ table, filters });
          return Promise.resolve({ data: rows[table] ?? [] }).then(resolve);
        },
      };
      return query;
    },
  };
  const dependencies = {
    "@/content/seo/categories": { SEO_CATEGORY_SLUGS: ["retreats"] },
    "@/lib/supabase/server": { createSupabaseServerClient: () => client },
    "@/lib/specialists/status": { VISIBLE_PUBLIC_SPECIALIST_STATUSES: ["approved"] },
    "@/lib/seo/siteMetadata": { SITE_DOMAIN: "https://freuly.de" },
    "@/lib/publicUrls": {
      isAsciiSlug: (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s),
      isAsciiPublicPath: (s) => !/[^\x00-\x7f]/.test(s),
    },
    "@/lib/categories/uncategorizedSpecialistCategory": { isExcludedFromPublicCategoryListing: (s) => s === "uncategorized" },
  };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function("require", "exports", output)((key) => {
    assert.ok(key in dependencies, `Unexpected dependency ${key}`);
    return dependencies[key];
  }, exports);
  return { run: exports.default, calls };
}

test("sitemap emits clean multilingual URLs and only actual modification dates", async () => {
  const { run } = loadSitemap({
    content_posts: [{ lang: "ru", slug: "guide", updated_at: "2026-09-01T00:00:00Z" }, { lang: "xx", slug: "hidden" }],
    categories: [{ slug: "psychologists" }, { slug: "uncategorized" }, { slug: "психологи" }],
    specialists: [{ slug: "anna", updated_at: null }],
  });
  const entries = await run();
  const urls = entries.map((e) => e.url);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!urls.some((url) => url.includes("?") || url.includes("uncategorized") || url.includes("hidden")));
  for (const lang of ["ru", "ua", "de"]) {
    assert.ok(urls.includes(`https://freuly.de/${lang}/for-specialists`));
    assert.ok(urls.includes(`https://freuly.de/${lang}/specialists/psychologists`));
    assert.equal(entries.find((e) => e.url === `https://freuly.de/${lang}/specialist/anna`).lastModified, undefined);
  }
  const dated = entries.filter((e) => e.lastModified);
  assert.equal(dated.length, 1);
  assert.equal(dated[0].lastModified.toISOString(), "2026-09-01T00:00:00.000Z");
});

test("sitemap requests only visible, active, non-test specialists with public status", async () => {
  const { run, calls } = loadSitemap({});
  await run();
  const { filters } = calls.find((c) => c.table === "specialists");
  for (const filter of [
    ["or", "is_test.is.null,is_test.eq.false"],
    ["eq", "is_active", true],
    ["eq", "is_visible", true],
    ["eq", "billing_visibility_blocked", false],
    ["in", "status", ["approved"]],
  ]) assert.ok(filters.some((f) => JSON.stringify(f) === JSON.stringify(filter)));
});
