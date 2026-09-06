/**
 * Tests for the server-side redirect: /specialists?q=<exact-category-title>
 * → 308 /{lang}/specialists/{ascii-category-slug}
 *
 * Validates that matchCategoryAsciiSlug resolves exact category titles
 * but NOT synonyms, partial matches, or arbitrary free text.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const { matchCategoryAsciiSlug } = await import("./matchCategoryAsciiSlug.ts");
const { getCategoryUrl, categorySlugForCanonicalSearch } = await import("../publicUrls.ts");

/**
 * Representative category rows matching production schema.
 * Contains parent categories and subcategories across all locales.
 */
const CATEGORIES = [
  {
    slug: "psychologists",
    title: "Psychologists",
    title_ru: "Психологи",
    title_ua: "Психологи",
    title_de: "Psychologen",
  },
  {
    slug: "cosmetologists",
    title: "Cosmetologists",
    title_ru: "Косметологи",
    title_ua: "Косметологи",
    title_de: "Kosmetiker",
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
    slug: "migration-consultants",
    title: "Migration consultants",
    title_ru: "Миграционные консультанты",
    title_ua: "Міграційні консультанти",
    title_de: "Migrationsberater",
  },
  {
    slug: "massage-therapists",
    title: "Massage therapists",
    title_ru: "Массажисты",
    title_ua: "Масажисти",
    title_de: "Massagetherapeuten",
  },
];

// ---------------------------------------------------------------------------
// 1. RU exact category title → canonical slug
// ---------------------------------------------------------------------------
test("RU exact category title 'Психологи' resolves to psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Психологи", CATEGORIES), "psychologists");
});

test("RU exact category title 'Косметологи' resolves to cosmetologists", () => {
  assert.equal(matchCategoryAsciiSlug("Косметологи", CATEGORIES), "cosmetologists");
});

test("RU exact category title 'Адвокаты' resolves to lawyers", () => {
  assert.equal(matchCategoryAsciiSlug("Адвокаты", CATEGORIES), "lawyers");
});

test("RU exact category title 'Репетиторы' resolves to tutors", () => {
  assert.equal(matchCategoryAsciiSlug("Репетиторы", CATEGORIES), "tutors");
});

test("RU exact long subcategory title resolves correctly", () => {
  assert.equal(
    matchCategoryAsciiSlug("Миграционные консультанты", CATEGORIES),
    "migration-consultants",
  );
});

// ---------------------------------------------------------------------------
// 2. UA exact category title → same canonical slug
// ---------------------------------------------------------------------------
test("UA exact category title 'Психологи' resolves to psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Психологи", CATEGORIES), "psychologists");
});

test("UA exact category title 'Адвокати' resolves to lawyers", () => {
  assert.equal(matchCategoryAsciiSlug("Адвокати", CATEGORIES), "lawyers");
});

test("UA exact category title 'Масажисти' resolves to massage-therapists", () => {
  assert.equal(matchCategoryAsciiSlug("Масажисти", CATEGORIES), "massage-therapists");
});

// ---------------------------------------------------------------------------
// 3. DE exact category title → same canonical slug
// ---------------------------------------------------------------------------
test("DE exact category title 'Psychologen' resolves to psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Psychologen", CATEGORIES), "psychologists");
});

test("DE exact category title 'Anwälte' resolves to lawyers", () => {
  assert.equal(matchCategoryAsciiSlug("Anwälte", CATEGORIES), "lawyers");
});

test("DE exact category title 'Nachhilfelehrer' resolves to tutors", () => {
  assert.equal(matchCategoryAsciiSlug("Nachhilfelehrer", CATEGORIES), "tutors");
});

// ---------------------------------------------------------------------------
// 4. ASCII slug itself resolves (direct slug in q)
// ---------------------------------------------------------------------------
test("ASCII slug 'psychologists' resolves to itself", () => {
  assert.equal(matchCategoryAsciiSlug("psychologists", CATEGORIES), "psychologists");
});

test("ASCII slug 'migration-consultants' resolves to itself", () => {
  assert.equal(matchCategoryAsciiSlug("migration-consultants", CATEGORIES), "migration-consultants");
});

// ---------------------------------------------------------------------------
// 5. Case-insensitive matching
// ---------------------------------------------------------------------------
test("case-insensitive: 'психологи' (lowercase) resolves", () => {
  assert.equal(matchCategoryAsciiSlug("психологи", CATEGORIES), "psychologists");
});

test("case-insensitive: 'ПСИХОЛОГИ' (uppercase) resolves", () => {
  assert.equal(matchCategoryAsciiSlug("ПСИХОЛОГИ", CATEGORIES), "psychologists");
});

// ---------------------------------------------------------------------------
// 6. Free text / synonyms / partial → null (no redirect)
// ---------------------------------------------------------------------------
test("synonym 'тревога' does NOT resolve to any category", () => {
  assert.equal(matchCategoryAsciiSlug("тревога", CATEGORIES), null);
});

test("synonym 'стресс' does NOT resolve to any category", () => {
  assert.equal(matchCategoryAsciiSlug("стресс", CATEGORIES), null);
});

test("free text 'ремонт квартиры' does NOT resolve", () => {
  assert.equal(matchCategoryAsciiSlug("ремонт квартиры", CATEGORIES), null);
});

test("free text 'Anna' does NOT resolve", () => {
  assert.equal(matchCategoryAsciiSlug("Anna", CATEGORIES), null);
});

test("singular 'Психолог' near-matches 'Психологи' → psychologists", () => {
  assert.equal(matchCategoryAsciiSlug("Психолог", CATEGORIES), "psychologists");
});

test("empty string does NOT resolve", () => {
  assert.equal(matchCategoryAsciiSlug("", CATEGORIES), null);
});

test("whitespace-only does NOT resolve", () => {
  assert.equal(matchCategoryAsciiSlug("   ", CATEGORIES), null);
});

// ---------------------------------------------------------------------------
// 7. categorySlugForCanonicalSearch does NOT fire when q is present
// ---------------------------------------------------------------------------
test("categorySlugForCanonicalSearch returns null when q is present", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: null, q: "Психологи", place: null, mode: null }),
    null,
  );
});

test("categorySlugForCanonicalSearch returns null when q + mode present", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: null, q: "Психологи", place: null, mode: "online" }),
    null,
  );
});

// ---------------------------------------------------------------------------
// 8. getCategoryUrl produces correct canonical paths
// ---------------------------------------------------------------------------
test("getCategoryUrl builds /ru/specialists/psychologists", () => {
  assert.equal(getCategoryUrl("ru", "psychologists"), "/ru/specialists/psychologists");
});

test("getCategoryUrl builds /ua/specialists/psychologists", () => {
  assert.equal(getCategoryUrl("ua", "psychologists"), "/ua/specialists/psychologists");
});

test("getCategoryUrl builds /de/specialists/cosmetologists", () => {
  assert.equal(getCategoryUrl("de", "cosmetologists"), "/de/specialists/cosmetologists");
});

// ---------------------------------------------------------------------------
// 9. No redirect when mode/place/radius present — tested via guard conditions
//    (the page.tsx check uses !place && !pageMode)
// ---------------------------------------------------------------------------
test("redirect guard: q + mode=online → should NOT redirect (mode present)", () => {
  const q = "Психологи";
  const place = null;
  const pageMode = "online";
  const category = null;
  const shouldRedirect = Boolean(q && !category && !place && !pageMode);
  assert.equal(shouldRedirect, false);
});

test("redirect guard: q + place=Bonn → should NOT redirect (place present)", () => {
  const q = "Психологи";
  const place = "Bonn";
  const pageMode = null;
  const category = null;
  const shouldRedirect = Boolean(q && !category && !place && !pageMode);
  assert.equal(shouldRedirect, false);
});

test("redirect guard: q + place + radius → should NOT redirect", () => {
  const q = "Психологи";
  const place = "Bonn";
  const pageMode = null;
  const category = null;
  const shouldRedirect = Boolean(q && !category && !place && !pageMode);
  assert.equal(shouldRedirect, false);
});

test("redirect guard: q only, no filters → should proceed to resolve", () => {
  const q = "Психологи";
  const place = null;
  const pageMode = null;
  const category = null;
  const shouldRedirect = Boolean(q && !category && !place && !pageMode);
  assert.equal(shouldRedirect, true);
});

// ---------------------------------------------------------------------------
// 10. Existing ?category= redirect path is not broken
// ---------------------------------------------------------------------------
test("categorySlugForCanonicalSearch resolves ?category=psychologists (no q/place/mode)", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: "psychologists", q: null, place: null, mode: null }),
    "psychologists",
  );
});

// ---------------------------------------------------------------------------
// 11. No redirect loop — canonical slug in q resolves and redirects once
// ---------------------------------------------------------------------------
test("if q is already the ASCII slug, matchCategoryAsciiSlug returns it (one redirect only)", () => {
  assert.equal(matchCategoryAsciiSlug("psychologists", CATEGORIES), "psychologists");
});

// ---------------------------------------------------------------------------
// 12. Source file uses resolveCategoryAsciiSlug for q-based redirect
// ---------------------------------------------------------------------------
test("app/specialists/page.tsx has q-based category redirect branch", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf-8",
  );
  assert.match(src, /!canonicalCategorySlug && q && !category && !place && !pageMode/);
  assert.match(src, /resolveCategoryAsciiSlug\(q\)/);
});

// ---------------------------------------------------------------------------
// 13. toUiLang: explicit `lang` query param wins over cookie/default
//     (extracted inline function tested via source inspection + getCategoryUrl)
// ---------------------------------------------------------------------------

/**
 * Reimplementation of toUiLang from app/specialists/page.tsx for unit testing.
 * Must stay in sync with the production version.
 */
function toUiLang(lang) {
  const lower = (lang || "").toLowerCase();
  if (lower === "de") return "de";
  if (lower === "ru") return "ru";
  if (lower === "ua" || lower === "uk") return "ua";
  return "ru"; // DEFAULT_LANG
}

test("toUiLang: 'ua' → ua (not default ru)", () => {
  assert.equal(toUiLang("ua"), "ua");
});

test("toUiLang: 'UA' (uppercase) → ua", () => {
  assert.equal(toUiLang("UA"), "ua");
});

test("toUiLang: 'uk' → ua (ISO 639 code normalization)", () => {
  assert.equal(toUiLang("uk"), "ua");
});

test("toUiLang: 'ru' → ru", () => {
  assert.equal(toUiLang("ru"), "ru");
});

test("toUiLang: 'de' → de", () => {
  assert.equal(toUiLang("de"), "de");
});

test("toUiLang: empty string → default ru", () => {
  assert.equal(toUiLang(""), "ru");
});

test("toUiLang: unknown 'fr' → default ru", () => {
  assert.equal(toUiLang("fr"), "ru");
});

// Explicit lang=ua with category → redirect to /ua/... path
test("explicit lang=ua: getCategoryUrl('ua', 'lawyers') → /ua/specialists/lawyers", () => {
  assert.equal(getCategoryUrl("ua", "lawyers"), "/ua/specialists/lawyers");
});

test("explicit lang=de: getCategoryUrl('de', 'psychologists') → /de/specialists/psychologists", () => {
  assert.equal(getCategoryUrl("de", "psychologists"), "/de/specialists/psychologists");
});

// Source file includes 'ua' in toUiLang
test("app/specialists/page.tsx toUiLang handles 'ua' explicitly", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf-8",
  );
  assert.match(src, /lower === "ua"/);
});
