import assert from "node:assert/strict";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  buildCategorySearchHref,
  buildSpecialistsSourcePath,
  inferWorkFormatFromSearch,
  parseSearchContext,
  searchContextToAssistedPrefill,
  searchLangToPreferredLanguage,
  splitPlaceForPrefill,
} = await import("./searchContext.ts");
const { assistedPrefillToRequestHref, requestServiceHref } = await import("../serviceRequests/requestServiceHref.ts");

test("searchLangToPreferredLanguage maps uk to ua", () => {
  assert.equal(searchLangToPreferredLanguage("uk"), "ua");
  assert.equal(searchLangToPreferredLanguage("ru"), "ru");
  assert.equal(searchLangToPreferredLanguage("de"), "de");
});

test("inferWorkFormatFromSearch uses mode and place", () => {
  assert.equal(inferWorkFormatFromSearch("online", "50667"), "online");
  assert.equal(inferWorkFormatFromSearch(null, "Berlin"), "offline");
  assert.equal(inferWorkFormatFromSearch(null, null), null);
});

test("parseSearchContext preserves specialists source path", () => {
  const ctx = parseSearchContext({
    lang: "uk",
    q: "tax help",
    place: "50667",
    category: "accounting",
    radius: "30",
  });
  assert.equal(ctx.q, "tax help");
  assert.equal(ctx.place, "50667");
  assert.equal(ctx.category, "accounting");
  assert.equal(ctx.radius, "30");
  assert.match(ctx.sourcePath, /lang=uk/);
  assert.match(ctx.sourcePath, /q=tax/);
});

test("searchContextToAssistedPrefill maps search intent to form prefill", () => {
  const ctx = parseSearchContext({
    lang: "ru",
    q: "psychologist",
    place: "10115",
    mode: "online",
    radius: "50",
  });
  const prefill = searchContextToAssistedPrefill(ctx, { categoryText: "Psychology" });
  assert.equal(prefill.q, "psychologist");
  assert.equal(prefill.place, "10115");
  assert.equal(prefill.preferred_language, "ru");
  assert.equal(prefill.work_format, "online");
  assert.equal(prefill.radius_km, "50");
  assert.equal(prefill.category_text, "Psychology");
});

test("splitPlaceForPrefill detects PLZ vs city", () => {
  assert.deepEqual(splitPlaceForPrefill("50667"), { city: "", postal_code: "50667" });
  assert.deepEqual(splitPlaceForPrefill("Köln"), { city: "Köln", postal_code: "" });
});

test("requestServiceHref carries assisted prefill params", () => {
  const href = requestServiceHref("ru", {
    q: "lawyer",
    place: "80331",
    preferred_language: "ru",
    work_format: "offline",
    radius_km: "30",
    source_path: "/specialists?lang=ru&q=lawyer",
  });
  assert.match(href, /\/ru\/request-service\?/);
  assert.match(href, /q=lawyer/);
  assert.match(href, /place=80331/);
  assert.match(href, /preferred_language=ru/);
  assert.match(href, /work_format=offline/);
  assert.match(href, /radius_km=30/);
});

test("assistedPrefillToRequestHref composes category id with prefill", () => {
  const href = assistedPrefillToRequestHref(
    "ua",
    searchContextToAssistedPrefill(parseSearchContext({ lang: "uk", category: "tutors" })),
    { category_id: "cat-1" },
  );
  assert.match(href, /category_id=cat-1/);
  assert.match(href, /preferred_language=ua/);
});

test("buildCategorySearchHref uses canonical ASCII category path", () => {
  assert.equal(buildCategorySearchHref("ua", "it-support"), "/ua/specialists/it-support");
  assert.equal(buildCategorySearchHref("ru", "psychologists"), "/ru/specialists/psychologists");
  assert.equal(buildCategorySearchHref("de", "psychologists"), "/de/specialists/psychologists");
  assert.equal(
    buildSpecialistsSourcePath({ lang: "de", category: "lawyers" }),
    "/specialists?lang=de&category=lawyers",
  );
});
