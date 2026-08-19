/**
 * MAIN specialist profile photo must use contain (no automatic crop).
 * Unrelated image surfaces must keep their existing cover/contain behavior.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerPartnerTestHooks } from "../../lib/partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const { SPECIALIST_MAIN_PHOTO_FIT_CLASS } = await import("./specialistMainPhotoFit.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(relativePath) {
  return readFileSync(join(root, relativePath), "utf-8");
}

function mainPhotoClassAssignment(src) {
  const match = src.match(/className=\{SPECIALIST_MAIN_PHOTO_FIT_CLASS\}/g);
  return match ? match.length : 0;
}

test("shared MAIN photo fit rule is contain + center, not cover", () => {
  assert.equal(SPECIALIST_MAIN_PHOTO_FIT_CLASS, "object-contain object-center");
  assert.doesNotMatch(SPECIALIST_MAIN_PHOTO_FIT_CLASS, /object-cover/);
});

test("SpecialistHeroContent main photo uses contain fit rule", () => {
  const src = readSrc("components/specialist/SpecialistHeroContent.tsx");
  assert.equal(mainPhotoClassAssignment(src), 1);
  assert.match(src, /SPECIALIST_MAIN_PHOTO_FIT_CLASS/);
  assert.doesNotMatch(src, /object-cover/);
});

test("SpecialistPreviewCard main photo uses contain fit rule", () => {
  const src = readSrc("components/specialist/SpecialistPreviewCard.tsx");
  assert.equal(mainPhotoClassAssignment(src), 1);
  assert.doesNotMatch(src, /object-cover/);
});

test("SpecialistResultCard main photo uses contain fit rule", () => {
  const src = readSrc("components/public/SpecialistResultCard.tsx");
  assert.equal(mainPhotoClassAssignment(src), 1);
  assert.doesNotMatch(src, /object-cover/);
});

test("VariantCSpecialistCard main photo uses contain fit rule", () => {
  const src = readSrc("components/home/variantC/VariantCSpecialistCard.tsx");
  assert.equal(mainPhotoClassAssignment(src), 1);
  assert.doesNotMatch(src, /object-cover/);
});

test("SpecialistAvatarImage dashboard/onboarding photo uses the same contain rule", () => {
  const src = readSrc("components/specialist/SpecialistAvatarImage.tsx");
  assert.equal(mainPhotoClassAssignment(src), 1);
  assert.doesNotMatch(src, /object-cover/);
});

test("hero and listing card frames keep existing geometry (no size change)", () => {
  const hero = readSrc("components/specialist/SpecialistHeroContent.tsx");
  assert.match(
    hero,
    /h-\[280px\] w-full shrink-0 overflow-hidden rounded-2xl bg-freuly-primary-light md:h-\[380px\] md:w-\[380px\]/,
  );

  const preview = readSrc("components/specialist/SpecialistPreviewCard.tsx");
  assert.match(preview, /relative h-\[200px\] overflow-hidden bg-freuly-page/);

  const result = readSrc("components/public/SpecialistResultCard.tsx");
  assert.match(
    result,
    /h-\[54px\] w-\[54px\] shrink-0 overflow-hidden rounded-freuly-md bg-freuly-page sm:h-24 sm:w-24/,
  );

  const variantC = readSrc("components/home/variantC/VariantCSpecialistCard.tsx");
  assert.match(
    variantC,
    /relative h-\[200px\] w-full overflow-hidden bg-freuly-border-subtle sm:h-\[220px\]/,
  );
});

test("negative: category images keep object-cover", () => {
  const src = readSrc("components/CategoryCard.jsx");
  assert.match(src, /className="object-cover"/);
  assert.doesNotMatch(src, /SPECIALIST_MAIN_PHOTO_FIT_CLASS/);
});

test("negative: service images keep object-cover", () => {
  const src = readSrc("components/ServiceCard.jsx");
  assert.match(src, /className="object-cover"/);
  assert.doesNotMatch(src, /SPECIALIST_MAIN_PHOTO_FIT_CLASS/);
});

test("negative: dashboard TopBar circular avatar keeps object-cover", () => {
  const src = readSrc("components/dashboard/TopBar.tsx");
  assert.match(src, /object-cover/);
  assert.doesNotMatch(src, /SPECIALIST_MAIN_PHOTO_FIT_CLASS/);
});

test("negative: homepage trust-stack avatars keep object-cover", () => {
  const src = readSrc("app/[lang]/HomeClient.tsx");
  assert.match(src, /className="h-full w-full object-cover"/);
  assert.doesNotMatch(src, /SPECIALIST_MAIN_PHOTO_FIT_CLASS/);
});

test("negative: public profile gallery thumbs keep object-cover", () => {
  const src = readSrc("components/specialist/SpecialistProfileClient.tsx");
  assert.match(src, /className="object-cover"/);
  assert.doesNotMatch(src, /SPECIALIST_MAIN_PHOTO_FIT_CLASS/);
});
