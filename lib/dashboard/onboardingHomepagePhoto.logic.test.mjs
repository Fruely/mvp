import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const repoRoot = new URL("../../", import.meta.url);

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

const {
  createHomepagePhotoEditorState,
} = await import("../specialistMedia/homepagePhotoEditorState.ts");
const { resolveHomepagePhotoState } = await import("../specialists/homepagePhoto.ts");
const { validatePublication } = await import("./publicationValidator.ts");
const { getFirstIncompleteOnboardingStep } = await import("./onboardingStep.ts");
const { photoIdentityFromStoragePath } = await import("../specialists/photoFocusMetadata.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("../specialistMedia/types.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const ORIGIN = "https://example.supabase.co";
const SOURCE_PATH = `${SPECIALIST_ID}/source/1710000000000-abc12def.jpg`;
const HOMEPAGE_PATH = `${SPECIALIST_ID}/homepage/1710000000001-xyz89abc.jpg`;
const SOURCE_IDENTITY = photoIdentityFromStoragePath(SOURCE_PATH);
const OUTPUT_IDENTITY = photoIdentityFromStoragePath(HOMEPAGE_PATH);

function managedUrl(path) {
  return `${ORIGIN}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

function validMetadata(overrides = {}) {
  return {
    version: 1,
    ratio: "31:20",
    output_width: 1550,
    output_height: 1000,
    source_identity: SOURCE_IDENTITY,
    output_identity: OUTPUT_IDENTITY,
    crop: { x: 10, y: 20, width: 1550, height: 1000 },
    zoom: 1.25,
    updated_at: "2026-08-20T18:00:00.000Z",
    ...overrides,
  };
}

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
  hasAbout: false,
  hasPhoto: false,
  hasGallery: false,
};

test("photo step keeps MAIN avatar uploader and no longer mounts homepage crop editor", () => {
  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  const wizard = source("components/dashboard/onboarding/SpecialistOnboardingWizard.tsx");

  assert.doesNotMatch(photoStep, /HomepagePhotoCropEditor/);
  assert.doesNotMatch(photoStep, /dashboard\.onboarding\.homepagePhoto\.optionalHint/);
  assert.match(photoStep, /SpecialistAvatarImage/);
  assert.match(photoStep, /\/api\/specialist\/avatar\/upload/);
  assert.match(photoStep, /dashboard\.onboarding\.photoStep\.title/);
  assert.match(wizard, /<OnboardingPhotoStep/);
});

test("MAIN uploader remains the only photo concern on the PHOTO step", () => {
  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  const mainFormStart = photoStep.indexOf("id={mainPhotoFormId}");
  const navStart = photoStep.indexOf("dashboard.onboarding.nav.back");

  assert.ok(mainFormStart >= 0);
  assert.ok(navStart > mainFormStart);
  assert.match(photoStep, /form=\{mainPhotoFormId\}/);
  assert.doesNotMatch(photoStep, /\/api\/specialist\/media\/photo/);
  assert.doesNotMatch(photoStep, /generateHomepagePhotoFromEditor/);
  assert.doesNotMatch(photoStep, /uploadNewHomepageSource/);
  assert.doesNotMatch(photoStep, /HOMEPAGE_PHOTO_GENERATE_PATH/);
});

test("Next without a MAIN file continues to review and does not persist homepage state", () => {
  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  assert.match(
    photoStep,
    /if \(!file\) \{\s*router\.push\(reviewHref\);\s*return;/,
  );
  assert.doesNotMatch(photoStep, /beforeunload/);
  assert.doesNotMatch(photoStep, /generateHomepagePhotoFromEditor/);
  assert.doesNotMatch(photoStep, /\/api\/specialist\/media\/homepage-photo/);
  assert.doesNotMatch(photoStep, /\/api\/specialist\/media\/homepage-source\/sign/);
});

test("onboarding PHOTO step no longer loads homepage crop fields into the wizard", () => {
  const page = source("app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx");
  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  const wizard = source("components/dashboard/onboarding/SpecialistOnboardingWizard.tsx");

  assert.doesNotMatch(page, /photo_source_url, homepage_photo_url, homepage_photo/);
  assert.doesNotMatch(page, /resolveHomepagePhotoState/);
  assert.doesNotMatch(page, /homepagePhoto=\{homepagePhoto\}/);
  assert.doesNotMatch(wizard, /homepagePhoto=\{homepagePhoto\}/);
  assert.doesNotMatch(photoStep, /initialSourceUrl=/);
  assert.doesNotMatch(photoStep, /HomepagePhotoCropEditor/);
});

test("valid existing homepage state is ready and invalid metadata does not throw", () => {
  const sourceUrl = managedUrl(SOURCE_PATH);
  const homepageUrl = managedUrl(HOMEPAGE_PATH);
  const ready = resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: sourceUrl,
    homepagePhotoUrl: homepageUrl,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  assert.equal(ready.kind, "ready");

  const readyEditor = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: sourceUrl,
    initialHomepagePhotoUrl: homepageUrl,
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  assert.equal(readyEditor.status, "ready");
  assert.equal(readyEditor.saved?.photo_source_url, sourceUrl);
  assert.equal(readyEditor.saved?.homepage_photo_url, homepageUrl);

  const invalid = resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: sourceUrl,
    homepagePhotoUrl: homepageUrl,
    storedMetadata: { version: 1 },
    canonicalOrigin: ORIGIN,
  });
  assert.equal(invalid.kind, "invalid");

  const invalidEditor = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: sourceUrl,
    initialHomepagePhotoUrl: homepageUrl,
    initialMetadata: { version: 1 },
    canonicalOrigin: ORIGIN,
  });
  assert.equal(invalidEditor.status, "empty");
  assert.equal(invalidEditor.saved, null);
});

test("review no longer recommends the obsolete homepage canonical photo", () => {
  const review = source("components/dashboard/onboarding/OnboardingReviewStep.tsx");
  const page = source("app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx");
  const validator = source("lib/dashboard/publicationValidator.ts");
  const hardItemsBlock = review.slice(
    review.indexOf("const hardItems"),
    review.indexOf("const recommendationPendingLabel"),
  );
  const recommendationsBlock = review.slice(review.indexOf("const recommendations"));

  assert.doesNotMatch(review, /dashboard\.onboarding\.reviewStep\.recommendHomepagePhoto/);
  assert.doesNotMatch(recommendationsBlock, /key: "homepagePhoto"/);
  assert.doesNotMatch(recommendationsBlock, /hasHomepagePhoto/);
  assert.doesNotMatch(hardItemsBlock, /homepagePhoto/);
  assert.doesNotMatch(page, /key: "homepagePhoto"/);
  assert.doesNotMatch(validator, /homepage_photo/);
  assert.doesNotMatch(validator, /homepage_photo_recommended/);
});

test("publication stays ready when homepage crop is missing", () => {
  const validation = validatePublication(BONN);
  assert.equal(validation.ready, true);
  assert.equal(getFirstIncompleteOnboardingStep(validation), "review");
  assert.ok(!validation.blocking.some((issue) => String(issue.code).includes("homepage")));
  assert.ok(!validation.recommendations.some((item) => String(item.code).includes("homepage")));
});

test("only the shared HomepagePhotoCropEditor implementation exists", () => {
  const editorFiles = readdirSync(new URL("components/specialist/", repoRoot)).filter((file) =>
    file.includes("HomepagePhoto"),
  );
  assert.deepEqual(editorFiles.sort(), [
    "HomepagePhotoCardPreview.tsx",
    "HomepagePhotoCropEditor.tsx",
  ]);

  const onboardingFiles = readdirSync(new URL("components/dashboard/onboarding/", repoRoot));
  assert.ok(!onboardingFiles.some((file) => /crop|homepage/i.test(file)));

  const photoStep = source("components/dashboard/onboarding/OnboardingPhotoStep.tsx");
  assert.doesNotMatch(photoStep, /from "react-easy-crop"/);
  assert.match(source("components/specialist/HomepagePhotoCropEditor.tsx"), /from "react-easy-crop"/);
});

test("onboarding locales add contextual homepage photo strings without duplicating the editor dictionary", () => {
  const ru = JSON.parse(source("locales/ru.json"));
  const ua = JSON.parse(source("locales/ua.json"));
  const de = JSON.parse(source("locales/de.json"));

  for (const dict of [ru, ua, de]) {
    assert.equal(typeof dict["dashboard.onboarding.homepagePhoto.optionalHint"], "string");
    assert.equal(typeof dict["dashboard.onboarding.reviewStep.recommendHomepagePhoto"], "string");
    assert.equal(typeof dict["dashboard.homepagePhoto.title"], "string");
    assert.equal(typeof dict["dashboard.homepagePhoto.subtitle"], "string");
    assert.equal(dict["dashboard.onboarding.homepagePhoto.title"], undefined);
  }
});
