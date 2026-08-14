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
    new URL("../../app/[lang]/specialist/(protected)/dashboard/OverviewStatsSection.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /await Promise\.all\(\[/);
  assert.match(src, /getSpecialistPlanForDashboard\(service, specialist\.id\)/);
});

test("dashboard profile uses cached category options loader", () => {
  const profileSrc = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/dashboard/profile/page.tsx", import.meta.url),
    "utf8",
  );
  const categoriesSrc = readFileSync(
    new URL("../categories/dashboardCategoryOptions.ts", import.meta.url),
    "utf8",
  );
  assert.match(profileSrc, /getDashboardCategoryOptions\(\)/);
  assert.doesNotMatch(profileSrc, /\.from\("categories"\)/);
  assert.match(categoriesSrc, /unstable_cache/);
});

test("dashboard leads loads leads and plan in parallel", () => {
  const src = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/dashboard/leads/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /await Promise\.all\(\[/);
  assert.match(src, /getSpecialistPlanForDashboard\(service, specialist\.id\)/);
});

test("protected dashboard layout uses shared dashboard context loader", () => {
  const layoutSrc = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/layout.tsx", import.meta.url),
    "utf8",
  );
  const contextSrc = readFileSync(
    new URL("../dashboard/getDashboardContext.ts", import.meta.url),
    "utf8",
  );
  assert.match(layoutSrc, /getDashboardContext\(\)/);
  assert.match(contextSrc, /export const getDashboardContext = cache\(/);
  assert.match(contextSrc, /getCurrentUserAndSpecialist/);
  assert.match(contextSrc, /getSpecialistPlanForDashboard/);
});

test("dashboard overview streams stats behind Suspense", () => {
  const pageSrc = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/dashboard/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(pageSrc, /<Suspense fallback=\{<OverviewStatsSkeleton/);
  assert.match(pageSrc, /<OverviewStatsSection/);
});

test("getDictionary dedupes locale JSON loads", () => {
  const src = readFileSync(new URL("../i18n.ts", import.meta.url), "utf8");
  assert.match(src, /dictionaryPromises\.get\(lang\)/);
});

test("dashboard private routes disable Link prefetch in sidebar and language bar", () => {
  const sidebarSrc = readFileSync(
    new URL("../../components/dashboard/Sidebar.tsx", import.meta.url),
    "utf8",
  );
  const languageBarSrc = readFileSync(
    new URL("../../components/LanguageBar.tsx", import.meta.url),
    "utf8",
  );
  assert.match(sidebarSrc, /prefetch=\{disablePrefetch \? false/);
  assert.match(sidebarSrc, /disableSidebarPrefetch = isPrivateDashboardPath/);
  assert.match(languageBarSrc, /prefetch=\{disablePrefetch \? false/);
  assert.match(languageBarSrc, /isPrivateDashboardPath/);
});
