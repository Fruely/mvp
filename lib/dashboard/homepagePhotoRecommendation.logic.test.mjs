import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const {
  HOMEPAGE_PHOTO_EDITOR_ELEMENT_ID,
  dashboardHomepagePhotoEditorHref,
  shouldShowHomepagePhotoRecommendation,
} = await import("./homepagePhotoRecommendation.ts");
const {
  HOMEPAGE_PHOTO_OUTPUT_HEIGHT,
  HOMEPAGE_PHOTO_OUTPUT_WIDTH,
  HOMEPAGE_PHOTO_RATIO,
  HOMEPAGE_PHOTO_VERSION,
  resolveHomepagePhotoState,
} = await import("../specialists/homepagePhoto.ts");
const { photoIdentityFromStoragePath } = await import("../specialists/photoFocusMetadata.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("../specialistMedia/types.ts");
const { validatePublication } = await import("./publicationValidator.ts");

const repoRoot = new URL("../../", import.meta.url);
const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const ORIGIN = "https://example.supabase.co";
const SOURCE_PATH = `${SPECIALIST_ID}/source/1710000000000-abc12def.jpg`;
const HOMEPAGE_PATH = `${SPECIALIST_ID}/homepage/1710000000001-xyz89abc.jpg`;
const OTHER_SOURCE_PATH = `${SPECIALIST_ID}/source/999-other.jpg`;

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

function managedUrl(path) {
  return `${ORIGIN}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

const SOURCE_URL = managedUrl(SOURCE_PATH);
const HOMEPAGE_URL = managedUrl(HOMEPAGE_PATH);
const OTHER_SOURCE_URL = managedUrl(OTHER_SOURCE_PATH);

function validMetadata(overrides = {}) {
  return {
    version: HOMEPAGE_PHOTO_VERSION,
    ratio: HOMEPAGE_PHOTO_RATIO,
    output_width: HOMEPAGE_PHOTO_OUTPUT_WIDTH,
    output_height: HOMEPAGE_PHOTO_OUTPUT_HEIGHT,
    source_identity: photoIdentityFromStoragePath(SOURCE_PATH),
    output_identity: photoIdentityFromStoragePath(HOMEPAGE_PATH),
    crop: { x: 10, y: 20, width: 1550, height: 1000 },
    zoom: 1.25,
    updated_at: "2026-08-20T18:00:00.000Z",
    ...overrides,
  };
}

function recommend(overrides = {}) {
  return shouldShowHomepagePhotoRecommendation({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
    ...overrides,
  });
}

test("ready canonical homepage photo hides the dashboard recommendation banner", () => {
  assert.equal(resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  }).kind, "ready");
  assert.equal(recommend(), false);
});

test("missing homepage photo shows the dashboard recommendation banner", () => {
  assert.equal(recommend({ homepagePhotoUrl: null, storedMetadata: null }), true);
  assert.equal(recommend({ storedMetadata: null }), true);
});

test("stale homepage photo shows the dashboard recommendation banner", () => {
  assert.equal(resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: OTHER_SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  }).kind, "stale");
  assert.equal(recommend({ photoSourceUrl: OTHER_SOURCE_URL }), true);
});

test("invalid homepage photo shows the dashboard recommendation banner", () => {
  assert.equal(resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: { version: 1 },
    canonicalOrigin: ORIGIN,
  }).kind, "invalid");
  assert.equal(recommend({ storedMetadata: { version: 1 } }), true);
});

test("published dashboard overview no longer renders the homepage-photo recommendation banner", () => {
  const overview = source(
    "app/[lang]/specialist/(protected)/dashboard/OverviewStatsSection.tsx",
  );
  const editor = source(
    "app/[lang]/specialist/(protected)/dashboard/SpecialistDashboardEditor.tsx",
  );
  const banner = source("components/dashboard/HomepagePhotoRecommendationBanner.tsx");

  assert.equal(
    dashboardHomepagePhotoEditorHref("de"),
    "/de/specialist/dashboard/profile#homepage-photo-editor",
  );
  assert.equal(HOMEPAGE_PHOTO_EDITOR_ELEMENT_ID, "homepage-photo-editor");
  assert.doesNotMatch(overview, /dashboardHomepagePhotoEditorHref/);
  assert.doesNotMatch(overview, /shouldShowHomepagePhotoRecommendation/);
  assert.doesNotMatch(overview, /HomepagePhotoRecommendationBanner/);
  assert.doesNotMatch(overview, /homepage-photo-editor/);
  assert.doesNotMatch(editor, /id=\{HOMEPAGE_PHOTO_EDITOR_ELEMENT_ID\}/);
  assert.doesNotMatch(editor, /<HomepagePhotoCropEditor/);
  assert.match(banner, /dashboard\.home\.homepagePhoto\.recommendCta/);
  assert.match(banner, /dashboard\.homepagePhoto\.title/);
});

test("dormant recommendation helper still reuses resolveHomepagePhotoState", () => {
  const helper = source("lib/dashboard/homepagePhotoRecommendation.ts");
  const overview = source(
    "app/[lang]/specialist/(protected)/dashboard/OverviewStatsSection.tsx",
  );
  assert.match(helper, /import \{ resolveHomepagePhotoState \} from "@\/lib\/specialists\/homepagePhoto"/);
  assert.match(helper, /resolveHomepagePhotoState\(input\)\.kind !== "ready"/);
  assert.doesNotMatch(helper, /parseHomepagePhotoMetadata/);
  assert.doesNotMatch(helper, /function resolveHomepagePhotoState/);
  assert.doesNotMatch(overview, /shouldShowHomepagePhotoRecommendation\(/);
  assert.doesNotMatch(overview, /photo_source_url, homepage_photo_url, homepage_photo/);
});

test("publication and visibility logic remain independent of the homepage-photo banner", () => {
  const overview = source(
    "app/[lang]/specialist/(protected)/dashboard/OverviewStatsSection.tsx",
  );
  const validator = source("lib/dashboard/publicationValidator.ts");
  const publicationReady = source("lib/dashboard/publicationReadiness.ts");
  const recommended = source("lib/homepage/fetchRecommendedSpecialists.ts");
  const selection = source("lib/homepage/recommendedSelection.ts");

  const publishCall = overview.slice(
    overview.indexOf("isPublicationReadyForDashboard("),
    overview.indexOf("const profileHref"),
  );
  assert.doesNotMatch(publishCall, /homepage_photo/);
  assert.doesNotMatch(overview, /improvements\.push\(\{[\s\S]*key: "homepagePhoto"/);
  assert.doesNotMatch(validator, /homepage_photo/);
  assert.doesNotMatch(publicationReady, /homepage_photo/);
  assert.doesNotMatch(recommended, /HomepagePhotoRecommendationBanner/);
  assert.doesNotMatch(selection, /HomepagePhotoRecommendationBanner/);
  assert.doesNotMatch(selection, /shouldShowHomepagePhotoRecommendation/);

  const result = validatePublication({
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
  });
  assert.equal(result.ready, true);
  assert.ok(!result.blocking.some((issue) => String(issue.code).includes("homepage")));
});

test("no duplicate crop editor is introduced for the dashboard banner", () => {
  const banner = source("components/dashboard/HomepagePhotoRecommendationBanner.tsx");
  const onboardingFiles = readdirSync(new URL("components/dashboard/onboarding/", repoRoot));
  assert.doesNotMatch(banner, /react-easy-crop/);
  assert.doesNotMatch(banner, /HomepagePhotoCropEditor/);
  assert.ok(!onboardingFiles.some((file) => /crop/i.test(file)));
  assert.match(source("components/specialist/HomepagePhotoCropEditor.tsx"), /from "react-easy-crop"/);
  assert.equal(
    [...source("app/[lang]/specialist/(protected)/dashboard/SpecialistDashboardEditor.tsx").matchAll(/<HomepagePhotoCropEditor/g)].length,
    0,
  );
});

test("banner copy exists in ru, ua, and de without duplicating the editor dictionary", () => {
  const ru = JSON.parse(source("locales/ru.json"));
  const ua = JSON.parse(source("locales/ua.json"));
  const de = JSON.parse(source("locales/de.json"));
  for (const dict of [ru, ua, de]) {
    assert.equal(typeof dict["dashboard.home.homepagePhoto.recommendBody"], "string");
    assert.equal(typeof dict["dashboard.home.homepagePhoto.recommendCta"], "string");
    assert.equal(typeof dict["dashboard.homepagePhoto.title"], "string");
    assert.equal(dict["dashboard.home.homepagePhoto.title"], undefined);
  }
});
