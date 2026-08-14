import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("getCurrentUserAndSpecialist uses request-scoped React cache", () => {
  const src = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
  assert.match(src, /import \{ cache \} from "react"/);
  assert.match(src, /export const getCurrentUserAndSpecialist = cache\(/);
  assert.match(src, /redirectToLogin/);
  assert.match(src, /x-freuly-pathname/);
});

test("getSpecialistPlanForDashboard uses request-scoped React cache", () => {
  const src = readFileSync(new URL("./subscription.ts", import.meta.url), "utf8");
  assert.match(src, /import \{ cache \} from "react"/);
  assert.match(src, /getSpecialistPlanForDashboardCached = cache\(/);
});

test("Header cabinet link routes anonymous users directly to login with next", () => {
  const src = readFileSync(new URL("../../components/Header.tsx", import.meta.url), "utf8");
  assert.match(src, /\/login\?next=/);
  assert.match(src, /specialist\/dashboard/);
  assert.doesNotMatch(src, /href: `\/\$\{lang\}\/specialist\/dashboard`/);
});

test("login client form receives server dictionary instead of bundling all locales", () => {
  const src = readFileSync(
    new URL("../../app/specialist/claim/SpecialistPasswordSignIn.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /dict: Dictionary/);
  assert.doesNotMatch(src, /from "@\/locales\/ru\.json"/);
  assert.doesNotMatch(src, /from "@\/locales\/ua\.json"/);
  assert.doesNotMatch(src, /from "@\/locales\/de\.json"/);
});

test("dashboard overview loads independent queries in parallel", () => {
  const src = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/dashboard/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /await Promise\.all\(\[/);
  assert.match(src, /getSpecialistPlanForDashboard\(service, specialist\.id\)/);
});
