import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const { resolveHomepageCardImage } = await import("./homepageCardImage.ts");
const {
  HOMEPAGE_PHOTO_OUTPUT_HEIGHT,
  HOMEPAGE_PHOTO_OUTPUT_WIDTH,
  HOMEPAGE_PHOTO_RATIO,
  HOMEPAGE_PHOTO_VERSION,
  resolveHomepagePhotoState,
} = await import("../specialists/homepagePhoto.ts");
const { photoIdentityFromStoragePath } = await import("../specialists/photoFocusMetadata.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("../specialistMedia/types.ts");

const repoRoot = new URL("../../", import.meta.url);
const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const ORIGIN = "https://example.supabase.co";
const SOURCE_PATH = `${SPECIALIST_ID}/source/1710000000000-abc12def.jpg`;
const HOMEPAGE_PATH = `${SPECIALIST_ID}/homepage/1710000000001-xyz89abc.jpg`;
const OTHER_SOURCE_PATH = `${SPECIALIST_ID}/source/999-other.jpg`;
const MAIN_PATH = `${SPECIALIST_ID}/1710000000000-abc12def.jpg`;

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

function managedUrl(path) {
  return `${ORIGIN}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

const SOURCE_URL = managedUrl(SOURCE_PATH);
const HOMEPAGE_URL = managedUrl(HOMEPAGE_PATH);
const OTHER_SOURCE_URL = managedUrl(OTHER_SOURCE_PATH);
const MAIN_URL = managedUrl(MAIN_PATH);

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

function cardImage(overrides = {}) {
  return resolveHomepageCardImage({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
    fallbackUrl: MAIN_URL,
    ...overrides,
  });
}

test("ready canonical homepage photo is used instead of MAIN fallback", () => {
  const state = resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  const image = cardImage();
  assert.equal(state.kind, "ready");
  assert.equal(image.usesCanonicalHomepagePhoto, true);
  assert.equal(image.src, HOMEPAGE_URL);
  assert.notEqual(image.src, MAIN_URL);
});

test("missing homepage photo falls back to previous MAIN behavior", () => {
  const missingUrl = cardImage({ homepagePhotoUrl: null, storedMetadata: null });
  const missingMeta = cardImage({ storedMetadata: null });
  assert.deepEqual(missingUrl, { src: MAIN_URL, usesCanonicalHomepagePhoto: false });
  assert.deepEqual(missingMeta, { src: MAIN_URL, usesCanonicalHomepagePhoto: false });
});

test("invalid homepage metadata falls back to MAIN", () => {
  const image = cardImage({ storedMetadata: { version: 1 } });
  assert.equal(resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: { version: 1 },
    canonicalOrigin: ORIGIN,
  }).kind, "invalid");
  assert.deepEqual(image, { src: MAIN_URL, usesCanonicalHomepagePhoto: false });
});

test("stale homepage metadata falls back to MAIN", () => {
  const image = cardImage({ photoSourceUrl: OTHER_SOURCE_URL });
  assert.equal(resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: OTHER_SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  }).kind, "stale");
  assert.deepEqual(image, { src: MAIN_URL, usesCanonicalHomepagePhoto: false });
});

test("fallback remains null when MAIN is also missing", () => {
  const image = cardImage({
    homepagePhotoUrl: null,
    storedMetadata: null,
    fallbackUrl: null,
  });
  assert.deepEqual(image, { src: null, usesCanonicalHomepagePhoto: false });
});

test("homepage query loads homepage photo fields after eligibility selection", () => {
  const fetchSrc = source("lib/homepage/fetchRecommendedSpecialists.ts");
  const visibleQueryBlock = fetchSrc.slice(
    fetchSrc.indexOf("function visibleQuery"),
    fetchSrc.indexOf("function selectRecommendedRows"),
  );
  const profileSelect = fetchSrc.slice(
    fetchSrc.indexOf(".from(\"specialist_profiles\")"),
    fetchSrc.indexOf(".in(\"specialist_id\", specialistIds)"),
  );

  assert.doesNotMatch(visibleQueryBlock, /homepage_photo/);
  assert.doesNotMatch(visibleQueryBlock, /photo_source_url/);
  assert.match(
    profileSelect,
    /specialist_id, city, photo_url, photo_source_url, homepage_photo_url, homepage_photo, photo_focus, about_me/,
  );
  assert.match(fetchSrc, /resolveHomepageCardImage\(/);
  assert.match(fetchSrc, /avatar_url: mainPhotoUrl/);
  assert.match(fetchSrc, /homepage_card_image_url: homepageCardImage\.usesCanonicalHomepagePhoto/);
});

test("homepage eligibility helpers remain independent of homepage photo state", () => {
  const selection = source("lib/homepage/recommendedSelection.ts");
  const fetchSrc = source("lib/homepage/fetchRecommendedSpecialists.ts");
  assert.doesNotMatch(selection, /homepage_photo/);
  assert.doesNotMatch(selection, /resolveHomepagePhotoState/);
  assert.doesNotMatch(selection, /resolveHomepageCardImage/);
  assert.match(fetchSrc, /hasValidServiceForRecommended\(row\.specialist_services\)/);
  assert.match(fetchSrc, /\.in\("status", \[\.\.\.VISIBLE_PUBLIC_SPECIALIST_STATUSES\]\)/);
});

test("homepage Variant C card renders MAIN with 1:1 cover and ignores canonical src-swap", () => {
  const cardSrc = source("components/home/variantC/VariantCSpecialistCard.tsx");
  assert.match(cardSrc, /specialist\.avatar_url/);
  assert.doesNotMatch(cardSrc, /homepage_photo_url/);
  assert.doesNotMatch(cardSrc, /canonicalHomepageImage/);
  assert.doesNotMatch(cardSrc, /resolveHomepageCardImage/);
  assert.doesNotMatch(cardSrc, /resolveHomepagePhotoState/);
  assert.doesNotMatch(cardSrc, /resolvePublicMainPhotoView/);
  assert.doesNotMatch(cardSrc, /resolveLiveSpecialistPhotoFit/);
  assert.doesNotMatch(cardSrc, /storedPhotoFocus|mainPhoto\.photoFocus/);
  assert.match(cardSrc, /aspect-square/);
  assert.match(cardSrc, /object-cover object-\[50%_20%\]/);
});

test("category, list, search, and hero rendering stay on MAIN photos", () => {
  const files = [
    "components/public/SpecialistResultCard.tsx",
    "components/specialist/SpecialistPreviewCard.tsx",
    "components/specialist/SpecialistHeroContent.tsx",
    "lib/search/specialistSearch.ts",
    "app/api/specialists/list/route.ts",
    "app/[lang]/specialists/[categorySlug]/CategoryHubClient.tsx",
  ];
  for (const file of files) {
    const src = source(file);
    assert.doesNotMatch(src, /homepage_photo_url/, file);
    assert.doesNotMatch(src, /homepage_card_image_url/, file);
    assert.doesNotMatch(src, /resolveHomepageCardImage/, file);
    assert.doesNotMatch(src, /resolveHomepagePhotoState/, file);
  }
});

test("only resolveHomepagePhotoState classifies homepage photo readiness", () => {
  const helperSrc = source("lib/homepage/homepageCardImage.ts");
  const homepagePhotoSrc = source("lib/specialists/homepagePhoto.ts");
  const fetchSrc = source("lib/homepage/fetchRecommendedSpecialists.ts");

  assert.match(helperSrc, /import \{ resolveHomepagePhotoState \} from "@\/lib\/specialists\/homepagePhoto"/);
  assert.match(helperSrc, /resolveHomepagePhotoState\(/);
  assert.doesNotMatch(helperSrc, /parseHomepagePhotoMetadata/);
  assert.doesNotMatch(helperSrc, /function resolveHomepagePhotoState/);
  assert.match(homepagePhotoSrc, /export function resolveHomepagePhotoState/);
  assert.doesNotMatch(fetchSrc, /parseHomepagePhotoMetadata/);
  assert.equal(
    [...homepagePhotoSrc.matchAll(/export function resolveHomepagePhotoState/g)].length,
    1,
  );
});
