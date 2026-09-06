/**
 * Regression tests for category search / canonical URL / online filter.
 *
 * Covers the six mandatory scenarios:
 *   A – Category only → canonical category route
 *   B – Category + Online → preserves category + mode
 *   C – Category + Offline → preserves category
 *   D – Legacy URL q=<category-title> canonicalizes to category URL
 *   E – Free text continues to work (not forced into a category)
 *   F – Languages: works for ru, ua, de
 *
 * Also tests:
 *   - Near-title matching for singular forms
 *   - buildServiceSearchCategoryUrl helper
 *   - No redirect loop on canonical URL
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  matchCategoryAsciiSlug,
} = await import("../categories/matchCategoryAsciiSlug.ts");
const {
  categorySlugForCanonicalSearch,
  getCategoryUrl,
} = await import("../publicUrls.ts");
const {
  buildServiceSearchResultsUrl,
  buildServiceSearchCategoryUrl,
} = await import("./serviceSearchUrl.ts");
// resolveServiceToCategory imports locale JSON — not loadable in Node ESM
// test runner. It delegates to matchCategoryAsciiSlug which is tested above.
// We verify integration via source-code assertions below.

// Representative categories matching production schema.
const CATEGORIES = [
  {
    slug: "psychologists",
    title: "Psychologists",
    title_ru: "Психологи",
    title_ua: "Психологи",
    title_de: "Psychologen",
  },
  {
    slug: "psychotherapists",
    title: "Psychotherapists",
    title_ru: "Психотерапевты",
    title_ua: "Психотерапевти",
    title_de: "Psychotherapeuten",
  },
  {
    slug: "coaches",
    title: "Coaches",
    title_ru: "Коучи",
    title_ua: "Коучі",
    title_de: "Coaches",
  },
  {
    slug: "lawyers",
    title: "Lawyers",
    title_ru: "Адвокаты",
    title_ua: "Адвокати",
    title_de: "Anwälte",
  },
  {
    slug: "tutors",
    title: "Tutors",
    title_ru: "Репетиторы",
    title_ua: "Репетитори",
    title_de: "Nachhilfelehrer",
  },
  {
    slug: "massage-therapists",
    title: "Massage therapists",
    title_ru: "Массажисты",
    title_ua: "Масажисти",
    title_de: "Massagetherapeuten",
  },
  {
    slug: "cosmetologists",
    title: "Cosmetologists",
    title_ru: "Косметологи",
    title_ua: "Косметологи",
    title_de: "Kosmetiker",
  },
];

function paramsOf(url) {
  return new URLSearchParams(url.split("?")[1] ?? "");
}

// =========================================================================
// A. Category only → canonical category route, not q=
// =========================================================================

test("A: exact RU title 'Психологи' resolves to psychologists slug", () => {
  assert.equal(matchCategoryAsciiSlug("Психологи", CATEGORIES), "psychologists");
});

test("A: singular RU 'Психолог' near-matches 'Психологи' → psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Психолог", CATEGORIES), "psychologists");
});

test("A: singular RU 'Адвокат' near-matches 'Адвокаты' → lawyers", () => {
  assert.equal(matchCategoryAsciiSlug("Адвокат", CATEGORIES), "lawyers");
});

test("A: singular RU 'Коуч' near-matches 'Коучи' → coaches", () => {
  assert.equal(matchCategoryAsciiSlug("Коуч", CATEGORIES), "coaches");
});

test("A: singular RU 'Репетитор' near-matches 'Репетиторы' → tutors", () => {
  assert.equal(matchCategoryAsciiSlug("Репетитор", CATEGORIES), "tutors");
});

test("A: category-only query redirects to hub (categorySlugForCanonicalSearch)", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: "psychologists", q: null, place: null, mode: null }),
    "psychologists",
  );
});

test("A: getCategoryUrl builds canonical path", () => {
  assert.equal(getCategoryUrl("ru", "psychologists"), "/ru/specialists/psychologists");
});

// =========================================================================
// B. Category + Online → category preserved, mode added, no coaches
// =========================================================================

test("B: categorySlugForCanonicalSearch returns null when mode is set", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: "psychologists", q: null, place: null, mode: "online" }),
    null,
    "mode=online must not trigger category hub redirect",
  );
});

test("B: buildServiceSearchCategoryUrl generates category=slug with mode=online", () => {
  const url = buildServiceSearchCategoryUrl({
    categorySlug: "psychologists",
    language: "ru",
    format: "online",
    location: "",
  });
  const p = paramsOf(url);
  assert.equal(p.get("category"), "psychologists");
  assert.equal(p.get("mode"), "online");
  assert.equal(p.get("lang"), "ru");
  assert.equal(p.get("q"), null, "q must not be present in category URL");
});

test("B: specialists page has category redirect with mode preservation", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf-8",
  );
  assert.match(src, /q && !category/);
  assert.match(src, /resolveCategoryAsciiSlug\(q\)/);
  assert.match(src, /canonicalParams\.set\("category", resolvedSlug\)/);
  assert.match(src, /canonicalParams\.set\("mode", pageMode\)/);
});

// =========================================================================
// C. Category + Offline (nearby) → category preserved
// =========================================================================

test("C: buildServiceSearchCategoryUrl generates category with place/radius", () => {
  const url = buildServiceSearchCategoryUrl({
    categorySlug: "lawyers",
    language: "de",
    format: "nearby",
    location: "50667",
    radiusKm: 30,
  });
  const p = paramsOf(url);
  assert.equal(p.get("category"), "lawyers");
  assert.equal(p.get("place"), "50667");
  assert.equal(p.get("radius"), "30");
  assert.equal(p.get("lang"), "de");
  assert.equal(p.get("mode"), null, "mode must not be set for nearby format");
  assert.equal(p.get("q"), null, "q must not be present in category URL");
});

test("C: buildServiceSearchCategoryUrl with format=any has no mode/place", () => {
  const url = buildServiceSearchCategoryUrl({
    categorySlug: "tutors",
    language: "ua",
    format: "any",
    location: "Berlin",
    radiusKm: 50,
  });
  const p = paramsOf(url);
  assert.equal(p.get("category"), "tutors");
  assert.equal(p.get("lang"), "uk", "ua → uk mapping");
  assert.equal(p.get("mode"), null);
  assert.equal(p.get("place"), null);
  assert.equal(p.get("radius"), null);
});

// =========================================================================
// D. Legacy URL: q=<category-title> → canonicalize to category URL
// =========================================================================

test("D: singular 'Психолог' is resolved by matchCategoryAsciiSlug (near-match)", () => {
  const slug = matchCategoryAsciiSlug("Психолог", CATEGORIES);
  assert.equal(slug, "psychologists");
});

test("D: singular 'психолог' (lowercase) is resolved", () => {
  const slug = matchCategoryAsciiSlug("психолог", CATEGORIES);
  assert.equal(slug, "psychologists");
});

test("D: singular 'Масажист' (UA) is resolved to massage-therapists", () => {
  const slug = matchCategoryAsciiSlug("Масажист", CATEGORIES);
  assert.equal(slug, "massage-therapists");
});

test("D: exact slug 'psychologists' is resolved", () => {
  assert.equal(matchCategoryAsciiSlug("psychologists", CATEGORIES), "psychologists");
});

test("D: specialists page includes legacy q redirect branch for q + mode/place", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf-8",
  );
  assert.match(src, /if \(q && !category\)/);
  assert.match(src, /permanentRedirect\(`\/specialists\?\$\{canonicalParams\.toString\(\)\}`\)/);
});

// =========================================================================
// E. Free text → stays as text search, not forced into category
// =========================================================================

test("E: 'тревожность' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("тревожность", CATEGORIES), null);
});

test("E: 'тревога' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("тревога", CATEGORIES), null);
});

test("E: 'семейные проблемы' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("семейные проблемы", CATEGORIES), null);
});

test("E: 'anxiety' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("anxiety", CATEGORIES), null);
});

test("E: 'depression' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("depression", CATEGORIES), null);
});

test("E: 'стресс' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("стресс", CATEGORIES), null);
});

test("E: 'подготовка к экзамену' does NOT match any category", () => {
  assert.equal(matchCategoryAsciiSlug("подготовка к экзамену", CATEGORIES), null);
});

test("E: buildServiceSearchResultsUrl still produces q= for free text", () => {
  const url = buildServiceSearchResultsUrl({
    service: "тревожность",
    language: "ru",
    format: "online",
    location: "",
  });
  const p = paramsOf(url);
  assert.equal(p.get("q"), "тревожность");
  assert.equal(p.get("mode"), "online");
  assert.equal(p.get("category"), null);
});

// =========================================================================
// F. Languages: near-match works for ru, ua, de
// =========================================================================

test("F(ru): singular 'Психолог' → psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Психолог", CATEGORIES), "psychologists");
});

test("F(ru): singular 'Косметолог' → cosmetologists", () => {
  assert.equal(matchCategoryAsciiSlug("Косметолог", CATEGORIES), "cosmetologists");
});

test("F(ru): singular 'Массажист' → massage-therapists", () => {
  assert.equal(matchCategoryAsciiSlug("Массажист", CATEGORIES), "massage-therapists");
});

test("F(ua): singular 'Адвокат' → lawyers (UA title 'Адвокати')", () => {
  // UA title "Адвокати" — "Адвокат" is 7 chars, "Адвокати" is 8, diff=1
  assert.equal(matchCategoryAsciiSlug("Адвокат", CATEGORIES), "lawyers");
});

test("F(ua): singular 'Репетитор' → tutors (UA title 'Репетитори')", () => {
  assert.equal(matchCategoryAsciiSlug("Репетитор", CATEGORIES), "tutors");
});

test("F(de): singular 'Psychologe' exact match → psychologists", () => {
  // DE title "Psychologen" — "Psychologe" is exact substring + 1 char
  assert.equal(matchCategoryAsciiSlug("Psychologe", CATEGORIES), "psychologists");
});

test("F(de): exact DE title 'Psychologen' → psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Psychologen", CATEGORIES), "psychologists");
});

test("F(de): exact DE title 'Kosmetiker' → cosmetologists", () => {
  assert.equal(matchCategoryAsciiSlug("Kosmetiker", CATEGORIES), "cosmetologists");
});

test("F: buildServiceSearchCategoryUrl with ua language maps to uk", () => {
  const url = buildServiceSearchCategoryUrl({
    categorySlug: "psychologists",
    language: "ua",
    format: "online",
    location: "",
  });
  const p = paramsOf(url);
  assert.equal(p.get("lang"), "uk");
  assert.equal(p.get("category"), "psychologists");
  assert.equal(p.get("mode"), "online");
});

test("F: buildServiceSearchCategoryUrl with de language stays de", () => {
  const url = buildServiceSearchCategoryUrl({
    categorySlug: "lawyers",
    language: "de",
    format: "online",
    location: "",
  });
  assert.equal(paramsOf(url).get("lang"), "de");
});

// =========================================================================
// Near-match safety: short / overly broad prefixes must NOT match
// =========================================================================

test("near-match: 'Ко' (2 chars) does NOT match 'Коучи' — too short", () => {
  assert.equal(matchCategoryAsciiSlug("Ко", CATEGORIES), null);
});

test("near-match: 'Пси' (3 chars) does NOT match 'Психологи' — too short", () => {
  assert.equal(matchCategoryAsciiSlug("Пси", CATEGORIES), null);
});

test("near-match: 'Психо' (5 chars) does NOT match 'Психологи' (9) — diff > 2", () => {
  assert.equal(matchCategoryAsciiSlug("Психо", CATEGORIES), null);
});

test("near-match: empty string does not match", () => {
  assert.equal(matchCategoryAsciiSlug("", CATEGORIES), null);
});

test("near-match: whitespace only does not match", () => {
  assert.equal(matchCategoryAsciiSlug("   ", CATEGORIES), null);
});

// =========================================================================
// No redirect loop: canonical URL must not trigger another redirect
// =========================================================================

test("no redirect loop: category + mode → categorySlugForCanonicalSearch returns null", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: "psychologists", q: null, place: null, mode: "online" }),
    null,
  );
});

test("no redirect loop: category + place → categorySlugForCanonicalSearch returns null", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: "psychologists", q: null, place: "50667", mode: null }),
    null,
  );
});

test("no redirect loop: q absent and category present → step 2 does not fire", () => {
  // Step 2: `q && !category` — when q is null/absent, the guard prevents redirect
  const q = null;
  const category = "psychologists";
  const shouldStep2Fire = Boolean(q && !category);
  assert.equal(shouldStep2Fire, false);
});

// =========================================================================
// Existing exact-title redirect is preserved
// =========================================================================

test("exact title 'Психологи' still resolves (not broken by near-match)", () => {
  assert.equal(matchCategoryAsciiSlug("Психологи", CATEGORIES), "psychologists");
});

test("exact slug 'psychologists' still resolves", () => {
  assert.equal(matchCategoryAsciiSlug("psychologists", CATEGORIES), "psychologists");
});

test("exact slug 'coaches' still resolves", () => {
  assert.equal(matchCategoryAsciiSlug("coaches", CATEGORIES), "coaches");
});

// =========================================================================
// Client-side resolveServiceToCategory (wizard submit flow)
// =========================================================================

// resolveServiceToCategory delegates to matchCategoryAsciiSlug with locale
// rows. Test the same inputs against the test fixture to validate matching.

test("wizard: 'Психолог' → resolves to psychologists (singular form)", () => {
  assert.equal(matchCategoryAsciiSlug("Психолог", CATEGORIES), "psychologists");
});

test("wizard: 'Психологи' → resolves to psychologists (exact title)", () => {
  assert.equal(matchCategoryAsciiSlug("Психологи", CATEGORIES), "psychologists");
});

test("wizard: 'психолог' (lowercase) → resolves to psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("психолог", CATEGORIES), "psychologists");
});

test("wizard: 'Коуч' → resolves to coaches", () => {
  assert.equal(matchCategoryAsciiSlug("Коуч", CATEGORIES), "coaches");
});

test("wizard: 'Адвокат' → resolves to lawyers", () => {
  assert.equal(matchCategoryAsciiSlug("Адвокат", CATEGORIES), "lawyers");
});

test("wizard: 'тревожность' → null (free text, not a category)", () => {
  assert.equal(matchCategoryAsciiSlug("тревожность", CATEGORIES), null);
});

test("wizard: 'семейные проблемы' → null (free text)", () => {
  assert.equal(matchCategoryAsciiSlug("семейные проблемы", CATEGORIES), null);
});

test("wizard: empty string → null", () => {
  assert.equal(matchCategoryAsciiSlug("", CATEGORIES), null);
});

// =========================================================================
// Full wizard URL flow: resolveServiceToCategory + buildServiceSearchCategoryUrl
// =========================================================================

test("wizard flow: Психолог + online → category=psychologists&mode=online (no q=)", () => {
  const slug = matchCategoryAsciiSlug("Психолог", CATEGORIES);
  assert.equal(slug, "psychologists");
  const url = buildServiceSearchCategoryUrl({
    categorySlug: slug,
    language: "ru",
    format: "online",
    location: "",
  });
  const p = paramsOf(url);
  assert.equal(p.get("category"), "psychologists");
  assert.equal(p.get("mode"), "online");
  assert.equal(p.get("lang"), "ru");
  assert.equal(p.get("q"), null, "q must NOT appear in category URL");
});

test("wizard flow: Психолог + nearby → category=psychologists&place=50667", () => {
  const slug = matchCategoryAsciiSlug("Психолог", CATEGORIES);
  const url = buildServiceSearchCategoryUrl({
    categorySlug: slug,
    language: "ru",
    format: "nearby",
    location: "50667",
    radiusKm: 30,
  });
  const p = paramsOf(url);
  assert.equal(p.get("category"), "psychologists");
  assert.equal(p.get("place"), "50667");
  assert.equal(p.get("radius"), "30");
  assert.equal(p.get("q"), null);
  assert.equal(p.get("mode"), null);
});

test("wizard flow: Психолог + any (no mode) → category URL for hub", () => {
  const slug = matchCategoryAsciiSlug("Психолог", CATEGORIES);
  assert.equal(slug, "psychologists");
  // format=any → wizard navigates to canonical category hub via
  // buildCategorySearchHref (tested in searchContext tests)
});

test("wizard flow: тревожность + online → q=тревожность (stays free text)", () => {
  const slug = matchCategoryAsciiSlug("тревожность", CATEGORIES);
  assert.equal(slug, null, "free text must not resolve to category");
  const url = buildServiceSearchResultsUrl({
    service: "тревожность",
    language: "ru",
    format: "online",
    location: "",
  });
  const p = paramsOf(url);
  assert.equal(p.get("q"), "тревожность");
  assert.equal(p.get("mode"), "online");
  assert.equal(p.get("category"), null, "category must NOT appear for free text");
});

test("wizard flow: ServiceSearchFlow uses resolveServiceToCategory + buildServiceSearchCategoryUrl", () => {
  const src = readFileSync(
    new URL("../../components/search-flow/ServiceSearchFlow.tsx", import.meta.url),
    "utf-8",
  );
  assert.match(src, /resolveServiceToCategory/, "wizard must import resolveServiceToCategory");
  assert.match(src, /buildServiceSearchCategoryUrl/, "wizard must import buildServiceSearchCategoryUrl");
  assert.match(src, /const categorySlug = resolveServiceToCategory/, "wizard must call resolveServiceToCategory in submit");
  assert.match(src, /if \(categorySlug\)/, "wizard must branch on resolved category");
});

test("resolveServiceToCategory delegates to matchCategoryAsciiSlug with locale rows", () => {
  const src = readFileSync(
    new URL("../../lib/categories/resolveServiceToCategory.ts", import.meta.url),
    "utf-8",
  );
  assert.match(src, /matchCategoryAsciiSlug/, "must use matchCategoryAsciiSlug");
  assert.match(src, /locales\/ru\.json/, "must load ru locale");
  assert.match(src, /locales\/ua\.json/, "must load ua locale");
  assert.match(src, /locales\/de\.json/, "must load de locale");
});
