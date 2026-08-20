import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicProfileSource = readFileSync(
  new URL("../specialists/publicProfile.ts", import.meta.url),
  "utf8"
);
const specialistPageSource = readFileSync(
  new URL("../../app/[lang]/specialist/[id]/page.tsx", import.meta.url),
  "utf8"
);
const specialistApiSource = readFileSync(
  new URL("../../app/api/specialists/[id]/route.ts", import.meta.url),
  "utf8"
);

test("SSR public profile and API use the same localization facade", () => {
  for (const source of [publicProfileSource, specialistApiSource]) {
    assert.match(source, /from "@\/lib\/localization"/);
    assert.match(source, /toContentLocale/);
    assert.match(source, /resolveProfileContent/);
    assert.match(source, /resolveServiceContent/);
    assert.doesNotMatch(source, /profileResolver|serviceResolver|locales\.ts/);
    assert.doesNotMatch(source, /specialist_profile_translations/);
    assert.doesNotMatch(source, /specialist_service_translations/);
  }
});

test("public profile preserves shape and localized legacy fallback", () => {
  const publicFields = [
    "id",
    "slug",
    "name",
    "description",
    "city",
    "postalCode",
    "workFormat",
    "categoryTitle",
    "languages",
    "avatarUrl",
    "photoFocus",
    "createdAt",
    "services",
  ];
  const serviceFields = [
    "id",
    "title",
    "price_from",
    "price_to",
    "currency",
  ];

  for (const field of publicFields) {
    assert.match(publicProfileSource, new RegExp(`\\b${field}:`));
  }
  for (const field of serviceFields) {
    assert.match(publicProfileSource, new RegExp(`\\b${field}:`));
  }

  assert.match(
    publicProfileSource,
    /profileContentById\?\.get\(String\(specialist\.id\)\)\?\.aboutMe\s*\?\?\s*profile\?\.about_me\s*\?\?\s*null/s
  );
  assert.match(
    publicProfileSource,
    /title:\s*localized\?\.title\s*\?\?\s*service\.title\s*\?\?\s*null/s
  );
});

test("route lang feeds localized SSR, initial hydration, and JSON-LD", () => {
  assert.match(
    specialistPageSource,
    /getPublicSpecialistProfile\(params\.id, params\.lang\)/
  );
  assert.match(
    publicProfileSource,
    /const locale = toContentLocale\(lang\)/
  );
  assert.match(
    specialistPageSource,
    /description:\s*profile\.description\s*\?\?\s*undefined/
  );
  assert.match(
    specialistPageSource,
    /title:\s*service\.title\s*\?\?\s*""/
  );
  assert.match(
    specialistPageSource,
    /description:\s*profile\.description\s*\?\?\s*undefined/
  );
  assert.match(
    specialistPageSource,
    /makesOffer:\s*services\.map[\s\S]*name:\s*service\.title[\s\S]*name:\s*service\.title/
  );
});

test("metadata remains independent of localized profile and service UGC", () => {
  const metadataSection = specialistPageSource.slice(
    specialistPageSource.indexOf("export async function generateMetadata"),
    specialistPageSource.indexOf("function escapeJsonLd")
  );
  assert.doesNotMatch(metadataSection, /profile\?\.description|profile\?\.services/);
});
