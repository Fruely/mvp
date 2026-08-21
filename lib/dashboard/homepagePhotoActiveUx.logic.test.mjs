import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const repoRoot = new URL("../../", import.meta.url);

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

const { validatePublication } = await import("./publicationValidator.ts");

const BONN = {
  name: "Anna",
  categoryId: "cat-child",
  categoryParentId: "cat-root",
  languages: ["de"],
  workFormat: "online",
  countryCode: "DE",
  postalCode: "53115",
  city: "Bonn",
  lat: 50.7374,
  lng: 7.0982,
  serviceRadiusKm: null,
  servicesInSelectedCategory: [{ title: "Consult", price_from: 50, is_active: true }],
  hasAbout: true,
  hasPhoto: true,
  hasGallery: true,
};

test("dashboard overview no longer renders homepage-photo recommendation banner", () => {
  const overview = source(
    "app/[lang]/specialist/(protected)/dashboard/OverviewStatsSection.tsx",
  );
  assert.doesNotMatch(overview, /HomepagePhotoRecommendationBanner/);
  assert.doesNotMatch(overview, /shouldShowHomepagePhotoRecommendation/);
  assert.doesNotMatch(overview, /dashboardHomepagePhotoEditorHref/);
  assert.doesNotMatch(overview, /homepage-photo-editor/);
  assert.match(overview, /dashboard\.home\.blocks\.profileTitle/);
});

test("dashboard profile no longer renders the 31:20 homepage editor", () => {
  const editor = source(
    "app/[lang]/specialist/(protected)/dashboard/SpecialistDashboardEditor.tsx",
  );
  const profile = source("app/[lang]/specialist/(protected)/dashboard/profile/page.tsx");
  assert.doesNotMatch(editor, /HomepagePhotoCropEditor/);
  assert.doesNotMatch(editor, /homepage-photo-editor/);
  assert.doesNotMatch(editor, /dashboard\.homepagePhoto\.title/);
  assert.match(editor, /dashboard\.fields\.avatar/);
  assert.match(editor, /\/api\/specialist\/avatar\/upload/);
  assert.match(profile, /<VerificationBanner/);
  assert.doesNotMatch(profile, /homepagePhoto=/);
});

test("onboarding PHOTO step keeps MAIN uploader and hides homepage crop editor", () => {
  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  assert.match(photoStep, /SpecialistAvatarImage/);
  assert.match(photoStep, /\/api\/specialist\/avatar\/upload/);
  assert.match(photoStep, /dashboard\.onboarding\.photoStep\.title/);
  assert.match(photoStep, /if \(!file\) \{\s*router\.push\(reviewHref\);\s*return;/);
  assert.doesNotMatch(photoStep, /HomepagePhotoCropEditor/);
  assert.doesNotMatch(photoStep, /dashboard\.onboarding\.homepagePhoto\.optionalHint/);
  assert.doesNotMatch(photoStep, /dashboard\.homepagePhoto\.title/);
});

test("onboarding review no longer recommends homepage canonical photo", () => {
  const review = source("components/dashboard/onboarding/OnboardingReviewStep.tsx");
  const page = source("app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx");
  const recommendationsBlock = review.slice(review.indexOf("const recommendations"));
  assert.doesNotMatch(recommendationsBlock, /key: "homepagePhoto"/);
  assert.doesNotMatch(review, /recommendHomepagePhoto/);
  assert.doesNotMatch(page, /key: "homepagePhoto"/);
  assert.match(recommendationsBlock, /key: "photo"/);
  assert.match(recommendationsBlock, /key: "about"/);
});

test("publication remains nonblocked without a homepage canonical photo", () => {
  const validator = source("lib/dashboard/publicationValidator.ts");
  const publishRoute = source("app/api/specialist/dashboard/publish/route.ts");
  const result = validatePublication(BONN);
  assert.equal(result.ready, true);
  assert.ok(!result.blocking.some((issue) => String(issue.code).includes("homepage")));
  assert.doesNotMatch(validator, /homepage_photo/);
  assert.doesNotMatch(publishRoute, /homepage_photo/);
});

test("homepage Variant C still uses MAIN with 1:1 cover 50% 20%", () => {
  const cardSrc = source("components/home/variantC/VariantCSpecialistCard.tsx");
  const fetchSrc = source("lib/homepage/fetchRecommendedSpecialists.ts");
  const selectionSrc = source("lib/homepage/recommendedSelection.ts");
  assert.match(cardSrc, /specialist\.avatar_url/);
  assert.match(cardSrc, /aspect-square/);
  assert.match(cardSrc, /object-cover object-\[50%_20%\]/);
  assert.doesNotMatch(cardSrc, /homepage_photo_url/);
  assert.doesNotMatch(cardSrc, /resolveHomepageCardImage/);
  assert.doesNotMatch(selectionSrc, /homepage_photo/);
  assert.match(fetchSrc, /hasValidServiceForRecommended\(row\.specialist_services\)/);
});

test("media APIs and helpers remain present and unused by active specialist UX", () => {
  const files = [
    "lib/specialists/homepagePhoto.ts",
    "lib/specialistMedia/homepagePhotoClient.ts",
    "lib/specialistMedia/homepagePhotoEditorState.ts",
    "lib/specialistMedia/signHomepageSource.ts",
    "lib/specialistMedia/generateHomepagePhoto.ts",
    "components/specialist/HomepagePhotoCropEditor.tsx",
    "app/api/specialist/media/homepage-photo/route.ts",
    "app/api/specialist/media/homepage-source/sign/route.ts",
  ];
  for (const file of files) {
    assert.equal(existsSync(new URL(file, repoRoot)), true, file);
  }
  assert.match(source("lib/specialists/homepagePhoto.ts"), /export function resolveHomepagePhotoState/);
  assert.match(source("lib/specialists/homepagePhoto.ts"), /photo_source_url/);
  assert.match(source("lib/specialists/homepagePhoto.ts"), /homepage_photo_url/);
  assert.match(source("components/specialist/HomepagePhotoCropEditor.tsx"), /from "react-easy-crop"/);

  const dashboardEditor = source(
    "app/[lang]/specialist/(protected)/dashboard/SpecialistDashboardEditor.tsx",
  );
  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  const overview = source(
    "app/[lang]/specialist/(protected)/dashboard/OverviewStatsSection.tsx",
  );
  assert.doesNotMatch(dashboardEditor, /HomepagePhotoCropEditor/);
  assert.doesNotMatch(photoStep, /HomepagePhotoCropEditor/);
  assert.doesNotMatch(overview, /HomepagePhotoRecommendationBanner/);
});
