import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const specialistsPage = readFileSync(
  new URL("../../app/specialists/page.tsx", import.meta.url),
  "utf8",
);
const homeClient = readFileSync(
  new URL("../../app/[lang]/HomeClient.tsx", import.meta.url),
  "utf8",
);
const categoryPage = readFileSync(
  new URL("../../app/[lang]/category/[slug]/page.tsx", import.meta.url),
  "utf8",
);
const requestForm = readFileSync(
  new URL("../../components/serviceRequests/ServiceRequestForm.tsx", import.meta.url),
  "utf8",
);

test("specialists page uses assisted matching continuation for empty results", () => {
  assert.match(specialistsPage, /AssistedMatchingContinuation/);
  assert.match(specialistsPage, /search\.assistedMatching\.title/);
  assert.doesNotMatch(specialistsPage, /SearchResultsEmptyState/);
  assert.doesNotMatch(specialistsPage, /search\.noResults\.title/);
});

test("specialists page redirects missing intent to service search", () => {
  assert.match(specialistsPage, /redirect\(serviceSearchHref/);
});

test("homepage category tiles do not show public specialist counts", () => {
  assert.doesNotMatch(homeClient, /category\.parent\.found/);
  assert.doesNotMatch(homeClient, /tCount/);
  assert.match(homeClient, /home\.variantC\.categories\.tileHint/);
  assert.match(homeClient, /buildCategorySearchHref/);
});

test("homepage does not hide categories solely because count is zero", () => {
  assert.doesNotMatch(homeClient, /specialists_count > 0/);
});

test("category page removes pre-search specialist count and empty dead end copy", () => {
  assert.doesNotMatch(categoryPage, /category\.found/);
  assert.doesNotMatch(categoryPage, /category\.empty\.subtitle/);
  assert.doesNotMatch(categoryPage, /category\.parent\.found/);
  assert.match(categoryPage, /buildCategorySearchHref/);
});

test("assisted request form is not auto-created on the client", () => {
  assert.match(requestForm, /async function handleSubmit/);
  assert.match(requestForm, /fetch\("\/api\/service-requests"/);
  assert.doesNotMatch(requestForm, /if \(empty\)[\s\S]*fetch\("\/api\/service-requests"/);
});

test("canonical success copy does not mention lack of specialists", () => {
  for (const locale of ["ru", "ua", "de"]) {
    const dict = JSON.parse(
      readFileSync(new URL(`../../locales/${locale}.json`, import.meta.url), "utf8"),
    );
    const body = dict.serviceRequest.success.body.toLowerCase();
    assert.doesNotMatch(body, /no specialist|kein.*spezialist|немає.*спеціаліст|нет.*специалист|zero result/i);
  }
});
