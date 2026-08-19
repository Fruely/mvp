import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "./partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  appendPreservedQuery,
  categorySlugForCanonicalSearch,
  getCategoryUrl,
  getSpecialistPublicSlug,
  getSpecialistUrl,
  hreflangCategory,
  hreflangSpecialist,
  isAsciiPublicPath,
  isAsciiSlug,
} = await import("./publicUrls.ts");
const {
  legacyCategoryRedirectPath,
  matchCategoryAsciiSlug,
} = await import("./categories/matchCategoryAsciiSlug.ts");
const {
  matchPublicSpecialist,
  resolvePublicCanonicalSpecialistSlug,
  specialistCanonicalRedirectPath,
} = await import("./specialists/matchPublicSpecialist.ts");
const { mapLegacySpecialistSlug } = await import("./specialists/legacySlugs.ts");
const {
  persistedCanonicalSpecialistSlug,
  proposeMigratedCanonicalSlug,
  uniqueAsciiSlug,
} = await import("./specialists/canonicalSlug.ts");

function assertCanonicalPublicUrl(url) {
  const path = url.split("?")[0];
  assert.match(path, /^[\x00-\x7F]+$/);
  assert.doesNotMatch(path, /[А-Яа-яЁёІіЇїЄєҐґ]/);
  assert.doesNotMatch(url, /%D0/i);
  assert.doesNotMatch(url, /%D1/i);
  assert.equal(isAsciiPublicPath(url), true);
}

const CATEGORIES = [
  {
    slug: "psychologists",
    title: "Psychologen",
    title_ru: "Психологи",
    title_ua: "Психологи",
    title_de: "Psychologen",
  },
];

const ANNA = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "anna-petrova",
  slug_legacy: "Анна-Петрова",
};

test("persisted ASCII slug is the canonical identifier in every language", () => {
  const specialist = { id: ANNA.id, slug: "anna-petrova" };
  assert.equal(persistedCanonicalSpecialistSlug(specialist.slug), "anna-petrova");
  assert.equal(getSpecialistPublicSlug(specialist), "anna-petrova");
  assert.equal(getSpecialistUrl("ru", specialist), "/ru/specialist/anna-petrova");
  assert.equal(getSpecialistUrl("ua", specialist), "/ua/specialist/anna-petrova");
  assert.equal(getSpecialistUrl("de", specialist), "/de/specialist/anna-petrova");
  for (const lang of ["ru", "ua", "de"]) {
    assertCanonicalPublicUrl(getSpecialistUrl(lang, specialist));
  }
  assert.equal(hreflangSpecialist("anna-petrova").uk, "https://freuly.de/ua/specialist/anna-petrova");
});

test("canonical specialist slug is not computed by runtime transliteration", () => {
  const specialist = { id: ANNA.id, slug: "анна-петрова" };
  assert.equal(persistedCanonicalSpecialistSlug(specialist.slug), null);
  assert.equal(getSpecialistPublicSlug(specialist), ANNA.id);
  assert.notEqual(getSpecialistPublicSlug(specialist), "anna-petrova");
});

test("legacy Cyrillic specialist resolves via slug_legacy to one canonical redirect", () => {
  const row = matchPublicSpecialist("Анна-Петрова", [ANNA]);
  assert.equal(row?.id, ANNA.id);
  assert.equal(row?.slug, "anna-petrova");
  assert.equal(
    specialistCanonicalRedirectPath("ru", "Анна-Петрова", row),
    "/ru/specialist/anna-petrova",
  );
  assert.equal(specialistCanonicalRedirectPath("ru", "anna-petrova", row), null);
});

test("UUID legacy redirects to persisted ASCII slug in one hop", () => {
  const row = matchPublicSpecialist(ANNA.id, [ANNA]);
  assert.equal(row?.slug, "anna-petrova");
  assert.equal(
    specialistCanonicalRedirectPath("de", ANNA.id, row),
    "/de/specialist/anna-petrova",
  );
});

test("known garbled alias maps exactly onto persisted canonical slug", () => {
  assert.equal(mapLegacySpecialistSlug("nhliy-oyimbzeae"), "psychologists-oksana-pantelidi");
  const rows = [{ id: "id-1", slug: "psychologists-oksana-pantelidi", slug_legacy: "nhliy-oyimbzeae" }];
  const byAlias = matchPublicSpecialist("nhliy-oyimbzeae", rows);
  const byLegacyCol = matchPublicSpecialist("nhliy-oyimbzeae", rows);
  assert.equal(byAlias?.slug, "psychologists-oksana-pantelidi");
  assert.equal(byLegacyCol?.slug, "psychologists-oksana-pantelidi");
  assert.equal(
    specialistCanonicalRedirectPath("ua", "nhliy-oyimbzeae", byAlias),
    "/ua/specialist/psychologists-oksana-pantelidi",
  );
  assert.equal(mapLegacySpecialistSlug("nhliy-oyimbzeaf"), null);
});

test("garbled alias still stored as specialists.slug redirects to mapped canonical", () => {
  const specialist = { id: "id-1", slug: "nhliy-oyimbzeae" };
  assert.equal(
    resolvePublicCanonicalSpecialistSlug(specialist.slug),
    "psychologists-oksana-pantelidi",
  );
  assert.equal(
    specialistCanonicalRedirectPath("ru", "nhliy-oyimbzeae", specialist),
    "/ru/specialist/psychologists-oksana-pantelidi",
  );
});

test("canonical ASCII specialist request stays 200 without redirect target", () => {
  const specialist = { id: ANNA.id, slug: "anna-petrova" };
  assert.equal(specialistCanonicalRedirectPath("ru", "anna-petrova", specialist), null);
  assert.equal(
    specialistCanonicalRedirectPath("ru", "psychologists-oksana-pantelidi", {
      id: "id-1",
      slug: "psychologists-oksana-pantelidi",
    }),
    null,
  );
});

test("legacy specialist redirect preserves open=form query", () => {
  const dest = specialistCanonicalRedirectPath("ru", "nhliy-oyimbzeae", {
    id: "id-1",
    slug: "nhliy-oyimbzeae",
  });
  const query = new URLSearchParams();
  query.set("open", "form");
  assert.equal(appendPreservedQuery(dest, query), "/ru/specialist/psychologists-oksana-pantelidi?open=form");
});

test("non-ASCII persisted slug has no canonical redirect target", () => {
  const specialist = { id: ANNA.id, slug: "анна-петрова" };
  assert.equal(resolvePublicCanonicalSpecialistSlug(specialist.slug), null);
  assert.equal(specialistCanonicalRedirectPath("ru", "анна-петрова", specialist), null);
  assert.equal(specialistCanonicalRedirectPath("ru", ANNA.id, specialist), null);
});

test("specialist canonical redirect does not loop through alias target", () => {
  const dest = specialistCanonicalRedirectPath("ru", "psychologists-oksana-pantelidi", {
    id: "id-1",
    slug: "psychologists-oksana-pantelidi",
  });
  assert.equal(dest, null);
  const fromGarbled = specialistCanonicalRedirectPath("ru", "nhliy-oyimbzeae", {
    id: "id-1",
    slug: "nhliy-oyimbzeae",
  });
  assert.equal(fromGarbled, "/ru/specialist/psychologists-oksana-pantelidi");
  assert.equal(specialistCanonicalRedirectPath("ru", "psychologists-oksana-pantelidi", {
    id: "id-1",
    slug: "nhliy-oyimbzeae",
  }), null);
});

test("unknown specialist identifier does not resolve", () => {
  assert.equal(matchPublicSpecialist("does-not-exist-at-all", [ANNA]), null);
});

test("slug collisions use deterministic -2 suffix", () => {
  assert.equal(uniqueAsciiSlug("anna-petrova", []), "anna-petrova");
  assert.equal(uniqueAsciiSlug("anna-petrova", ["anna-petrova"]), "anna-petrova-2");
  assert.equal(
    uniqueAsciiSlug("anna-petrova", ["anna-petrova", "anna-petrova-2"]),
    "anna-petrova-3",
  );
  assert.equal(
    proposeMigratedCanonicalSlug("анна-петрова", ["anna-petrova"]),
    "anna-petrova-2",
  );
});

test("legacy category title redirects in one hop to ASCII canonical", () => {
  assert.equal(
    legacyCategoryRedirectPath("ru", "Психологи", CATEGORIES),
    "/ru/specialists/psychologists",
  );
  assert.equal(
    legacyCategoryRedirectPath("ua", "Психологи", CATEGORIES),
    "/ua/specialists/psychologists",
  );
  assert.equal(
    legacyCategoryRedirectPath("de", "Psychologen", CATEGORIES),
    "/de/specialists/psychologists",
  );
  const dest = legacyCategoryRedirectPath("ru", encodeURIComponent("Психологи"), CATEGORIES);
  assert.equal(dest, "/ru/specialists/psychologists");
  assert.doesNotMatch(dest, /specialists\/Психологи/);
  assert.equal(dest.split("/specialists/").length, 2);
  assertCanonicalPublicUrl(dest);
});

test("next.config category redirect only matches ASCII slugs", () => {
  const src = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");
  assert.match(src, /\/:lang\(ru\|ua\|de\)\/category\/:slug\(\[a-z0-9-\]\+\)/);
  const page = readFileSync(
    new URL("../app/[lang]/category/[slug]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /permanentRedirect\(appendPreservedQuery\(getCategoryUrl/);
  assert.doesNotMatch(page, /specialists\/\$\{requested\}/);
});

test("canonical category URLs share one ASCII slug across RU/UA/DE", () => {
  assert.equal(getCategoryUrl("ru", "psychologists"), "/ru/specialists/psychologists");
  assert.equal(getCategoryUrl("ua", "psychologists"), "/ua/specialists/psychologists");
  assert.equal(getCategoryUrl("de", "psychologists"), "/de/specialists/psychologists");
  assert.equal(matchCategoryAsciiSlug("psychologists", CATEGORIES), "psychologists");
  assert.equal(hreflangCategory("psychologists").ru, "https://freuly.de/ru/specialists/psychologists");
});

test("free-text q stays on search and is not forced to category canonical", () => {
  assert.equal(
    categorySlugForCanonicalSearch({ category: "psychologists", q: "психолог" }),
    null,
  );
  assert.equal(categorySlugForCanonicalSearch({ category: "psychologists" }), "psychologists");
});

test("share/canonical URLs stay ASCII without percent-encoded Cyrillic", () => {
  const share = getSpecialistUrl("ru", { id: ANNA.id, slug: "anna-petrova" });
  const category = getCategoryUrl("ua", "psychologists");
  assertCanonicalPublicUrl(share);
  assertCanonicalPublicUrl(`${share}?open=form`);
  assertCanonicalPublicUrl(category);
  assert.equal(isAsciiSlug("anna-petrova"), true);
});
