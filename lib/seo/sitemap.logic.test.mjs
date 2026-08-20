import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const sitemapSrc = readFileSync(new URL("../../app/sitemap.ts", import.meta.url), "utf8");
const serverSrc = readFileSync(new URL("../supabase/server.ts", import.meta.url), "utf8");

test("server client still throws when Supabase env is missing", () => {
  assert.match(serverSrc, /throw new Error\('Missing Supabase server environment variables'\)/);
  assert.match(serverSrc, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(serverSrc, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("sitemap keeps static routes when Supabase is unavailable at build time", () => {
  assert.match(sitemapSrc, /createSupabaseServerClient\(\)/);
  assert.match(sitemapSrc, /catch \(error\)/);
  assert.match(sitemapSrc, /\[sitemap\] supabase unavailable/);
  assert.match(sitemapSrc, /return entries;/);
});

test("sitemap still loads public category and specialist URLs when Supabase is configured", () => {
  const clientIndex = sitemapSrc.indexOf("createSupabaseServerClient()");
  const catchIndex = sitemapSrc.indexOf("return entries;", clientIndex);
  const categoriesIndex = sitemapSrc.indexOf('.from("categories")');
  const specialistsIndex = sitemapSrc.indexOf('.from("specialists")');

  assert.ok(clientIndex > 0);
  assert.ok(catchIndex > clientIndex);
  assert.ok(categoriesIndex > catchIndex);
  assert.ok(specialistsIndex > categoriesIndex);
  assert.match(sitemapSrc, /\/specialists\/\$\{slug\}/);
  assert.match(sitemapSrc, /\/specialist\/\$\{segment\}/);
});
