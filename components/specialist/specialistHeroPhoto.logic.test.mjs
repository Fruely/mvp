import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { registerPartnerTestHooks } from "../../lib/partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const hero = source("components/specialist/SpecialistHeroContent.tsx");
const photoFrame = hero.slice(
  hero.indexOf("<div className=\"relative"),
  hero.indexOf("{trimmed ?"),
);
const imageBlock = hero.slice(hero.indexOf("{trimmed ?"), hero.indexOf("{aboutPreview ?"));

test("public hero uses MAIN image with object-cover and 50% 20%", () => {
  assert.match(imageBlock, /src=\{trimmed\}/);
  assert.match(imageBlock, /className="object-cover object-\[50%_20%\]"/);
  assert.doesNotMatch(imageBlock, /object-contain/);
  assert.doesNotMatch(imageBlock, /specialistMainPhotoFitClass/);
  assert.doesNotMatch(imageBlock, /photoFit\.objectPosition/);
});

test("desktop hero photo frame stays a 380 square; mobile is square too", () => {
  assert.match(photoFrame, /aspect-square w-full/);
  assert.match(photoFrame, /md:h-\[380px\] md:w-\[380px\]/);
  assert.doesNotMatch(photoFrame, /h-\[280px\]/);
  assert.match(photoFrame, /overflow-hidden/);
});

test("hero keeps the existing no-photo fallback and does not introduce homepage/focus logic", () => {
  assert.match(hero, /text-5xl text-freuly-primary/);
  assert.doesNotMatch(hero, /homepage_photo_url/);
  assert.doesNotMatch(hero, /homepage_card_image_url/);
  assert.doesNotMatch(hero, /resolveHomepageCardImage/);
  assert.doesNotMatch(hero, /resolveHomepagePhotoState/);
  assert.doesNotMatch(hero, /resolvePublicMainPhotoView/);
  assert.doesNotMatch(hero, /resolveLiveSpecialistPhotoFit/);
  assert.doesNotMatch(hero, /photo_focus/);
});

test("category cards, search results, and homepage cards were not rewritten by the hero patch", () => {
  const preview = source("components/specialist/SpecialistPreviewCard.tsx");
  const result = source("components/public/SpecialistResultCard.tsx");
  const homepage = source("components/home/variantC/VariantCSpecialistCard.tsx");
  const profile = source("components/specialist/SpecialistProfileClient.tsx");

  assert.match(preview, /resolveLiveSpecialistPhotoFit\(/);
  assert.match(result, /resolveLiveSpecialistPhotoFit\(/);
  assert.doesNotMatch(preview, /object-\[50%_20%\]/);
  assert.doesNotMatch(result, /object-\[50%_20%\]/);
  assert.match(homepage, /object-cover object-\[50%_20%\]/);
  assert.match(homepage, /aspect-square/);
  assert.match(profile, /h-40 w-full border-0 md:h-\[280px\]/);
});
