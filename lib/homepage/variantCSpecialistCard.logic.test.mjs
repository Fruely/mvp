import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const repoRoot = new URL("../../", import.meta.url);

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

const cardSrc = source("components/home/variantC/VariantCSpecialistCard.tsx");
const homeSrc = source("app/[lang]/HomeClient.tsx");
const selectionSrc = source("lib/homepage/recommendedSelection.ts");
const fetchSrc = source("lib/homepage/fetchRecommendedSpecialists.ts");

test("homepage card uses MAIN even when a canonical homepage image field exists", () => {
  assert.match(cardSrc, /specialist\.avatar_url/);
  assert.doesNotMatch(cardSrc, /canonicalHomepageImage/);
  assert.doesNotMatch(cardSrc, /homepage_card_image_url\s*\?\?/);
  assert.doesNotMatch(cardSrc, /homepage_photo_url/);
  assert.doesNotMatch(cardSrc, /resolveHomepageCardImage/);
  assert.doesNotMatch(cardSrc, /resolveHomepagePhotoState/);
});

test("homepage teaser omits about, city, CTA, and speaks label", () => {
  assert.doesNotMatch(cardSrc, /specialist\.about_line/);
  assert.doesNotMatch(cardSrc, /specialist\.city/);
  assert.doesNotMatch(cardSrc, /home\.recommended\.newSpecialist/);
  assert.doesNotMatch(cardSrc, /MapPin/);
  assert.doesNotMatch(cardSrc, /search\.results\.viewProfile/);
  assert.doesNotMatch(cardSrc, /ChevronRight/);
  assert.doesNotMatch(cardSrc, /home\.variantC\.recommended\.speaks/);
  assert.doesNotMatch(cardSrc, /italic/);
});

test("homepage teaser keeps name, category, and languages", () => {
  assert.match(cardSrc, /truncate text-\[20px\] font-bold leading-6/);
  assert.match(cardSrc, /truncate text-sm leading-\[17px\]/);
  assert.match(cardSrc, /languageList\.slice\(0, 3\)/);
  assert.match(cardSrc, /flex h-7 min-h-7 flex-nowrap/);
  assert.match(cardSrc, /getCategoryTitle/);
});

test("language display caps at 3 chips with optional \+N on the same row", () => {
  assert.match(cardSrc, /slice\(0, 3\)/);
  assert.match(cardSrc, /extraLanguageCount/);
  assert.match(cardSrc, /\+\{extraLanguageCount\}/);
  assert.doesNotMatch(cardSrc, /flex-wrap gap-2/);
});

test("whole-card navigation uses existing specialist URL helper", () => {
  assert.match(cardSrc, /getSpecialistUrl\(lang, specialist\)/);
  assert.match(cardSrc, /<Link[\s\S]*href=\{profileHref\}/);
  assert.match(cardSrc, /aria-label=\{name\}/);
  assert.doesNotMatch(cardSrc, /<Link[\s\S]*search\.results\.viewProfile/);
});

test("homepage recommended skeleton matches compact square card", () => {
  const recommendedBlock = homeSrc.slice(
    homeSrc.indexOf("{/* Recommended specialists */}"),
    homeSrc.indexOf("{/* Story */}"),
  );
  assert.match(recommendedBlock, /aspect-square animate-pulse/);
  assert.doesNotMatch(recommendedBlock, /h-\[200px\]/);
  assert.match(recommendedBlock, /h-7 w-24 rounded-full/);
});

test("recommendation selection and fetch stay independent of homepage-photo readiness", () => {
  assert.doesNotMatch(selectionSrc, /homepage_photo/);
  assert.doesNotMatch(selectionSrc, /resolveHomepagePhotoState/);
  assert.doesNotMatch(selectionSrc, /resolveHomepageCardImage/);
  assert.match(fetchSrc, /hasValidServiceForRecommended\(row\.specialist_services\)/);
  assert.match(fetchSrc, /\.in\("status", \[\.\.\.VISIBLE_PUBLIC_SPECIALIST_STATUSES\]\)/);
});

test("other specialist surfaces were not rewritten by this homepage patch", () => {
  const files = [
    "components/public/SpecialistResultCard.tsx",
    "components/specialist/SpecialistPreviewCard.tsx",
    "components/specialist/SpecialistHeroContent.tsx",
  ];
  for (const file of files) {
    const src = source(file);
    assert.match(src, /resolveLiveSpecialistPhotoFit\(/, file);
    assert.doesNotMatch(src, /object-\[50%_20%\]/, file);
  }
});
