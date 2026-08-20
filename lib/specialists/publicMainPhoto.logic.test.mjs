import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const {
  PHOTO_FOCUS_ALGORITHM,
  PHOTO_FOCUS_VERSION,
  buildUnusablePhotoFocus,
  photoIdentityFromStoragePath,
} = await import("./photoFocusMetadata.ts");
const { resolvePublicMainPhotoView } = await import("./publicMainPhoto.ts");
const {
  SPECIALIST_PHOTO_COVER_ENV,
  SPECIALIST_PHOTO_COVER_SURFACES,
  isSpecialistPhotoCoverEnabled,
} = await import("./photoFocusGate.ts");
const {
  resolveLiveSpecialistPhotoFit,
  resolveSpecialistPhotoFit,
} = await import("../../components/specialist/specialistMainPhotoFit.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const ORIGIN = "https://example.supabase.co";
const PHOTO_PATH = `${SPECIALIST_ID}/1710000000000-abc12def.jpg`;
const PHOTO_URL = `${ORIGIN}/storage/v1/object/public/specialist-avatars/${PHOTO_PATH}`;
const OTHER_URL = `${ORIGIN}/storage/v1/object/public/specialist-avatars/${SPECIALIST_ID}/999-other.jpg`;

function okStored(overrides = {}) {
  return {
    version: PHOTO_FOCUS_VERSION,
    algorithm: PHOTO_FOCUS_ALGORITHM,
    source: "auto",
    status: "ok",
    focal_x: 0.5,
    focal_y: 0.34,
    subject: { x: 0.22, y: 0.12, w: 0.56, h: 0.82 },
    face: { x: 0.35, y: 0.25, w: 0.3, h: 0.18 },
    confidence: 0.92,
    image_width: 800,
    image_height: 1066,
    photo_identity: photoIdentityFromStoragePath(PHOTO_PATH),
    analyzed_at: "2026-08-19T00:00:00.000Z",
    ...overrides,
  };
}

function liveFit(view, surface = "card") {
  return resolveLiveSpecialistPhotoFit({
    focus: view.photoFocus,
    imageAspect: view.imageAspect,
    surface,
  });
}

test("valid metadata + matching identity + gate OFF => contain", () => {
  const view = resolvePublicMainPhotoView({
    src: PHOTO_URL,
    storedPhotoFocus: okStored(),
    specialistId: SPECIALIST_ID,
  });
  assert.equal(view.src, PHOTO_URL);
  assert.ok(view.photoFocus);
  assert.equal(view.imageAspect, 800 / 1066);
  assert.equal(liveFit(view, "hero").fit, "contain");
  assert.equal(liveFit(view, "card").fit, "contain");
  assert.equal(liveFit(view, "thumb").fit, "contain");
});

test("valid metadata + matching identity + hypothetical gate ON => resolver may cover", () => {
  const view = resolvePublicMainPhotoView({
    src: PHOTO_URL,
    storedPhotoFocus: okStored(),
    specialistId: SPECIALIST_ID,
  });
  const env = { [SPECIALIST_PHOTO_COVER_ENV]: "true" };
  const surfaces = { card: true, thumb: false, hero: false, dashboard: false };
  assert.equal(isSpecialistPhotoCoverEnabled("card", { env, surfaces }), true);
  assert.equal(liveFit(view, "card").fit, "contain", "production live gate remains OFF");
  const ungated = resolveSpecialistPhotoFit({
    focus: view.photoFocus,
    imageAspect: view.imageAspect,
    surface: "card",
  });
  assert.equal(ungated.fit, "cover");
});

test("valid metadata but identity mismatch => contain", () => {
  const view = resolvePublicMainPhotoView({
    src: OTHER_URL,
    storedPhotoFocus: okStored(),
    specialistId: SPECIALIST_ID,
  });
  assert.equal(view.photoFocus, null);
  assert.equal(view.imageAspect, null);
  assert.equal(liveFit(view).fit, "contain");
});

test("null metadata => contain", () => {
  const view = resolvePublicMainPhotoView({
    src: PHOTO_URL,
    storedPhotoFocus: null,
    specialistId: SPECIALIST_ID,
  });
  assert.equal(view.photoFocus, null);
  assert.equal(view.imageAspect, null);
  assert.equal(liveFit(view, "hero").fit, "contain");
});

test("malformed metadata => contain", () => {
  const view = resolvePublicMainPhotoView({
    src: PHOTO_URL,
    storedPhotoFocus: { version: 2, photo_identity: "nope" },
    specialistId: SPECIALIST_ID,
  });
  assert.equal(view.photoFocus, null);
  assert.equal(view.imageAspect, null);
  assert.equal(liveFit(view).fit, "contain");
});

test("status unusable => contain", () => {
  const stored = buildUnusablePhotoFocus({
    photoIdentity: photoIdentityFromStoragePath(PHOTO_PATH),
    imageWidth: 800,
    imageHeight: 1066,
  });
  const view = resolvePublicMainPhotoView({
    src: PHOTO_URL,
    storedPhotoFocus: stored,
    specialistId: SPECIALIST_ID,
  });
  assert.equal(view.photoFocus, null);
  assert.equal(view.imageAspect, null);
  assert.equal(liveFit(view).fit, "contain");
});

test("missing/invalid dimensions => contain", () => {
  for (const stored of [
    okStored({ image_width: 0, image_height: 1066 }),
    okStored({ image_width: 800, image_height: -1 }),
    okStored({ image_width: null, image_height: 1066 }),
  ]) {
    const view = resolvePublicMainPhotoView({
      src: PHOTO_URL,
      storedPhotoFocus: stored,
      specialistId: SPECIALIST_ID,
    });
    assert.equal(view.photoFocus, null);
    assert.equal(view.imageAspect, null);
    assert.equal(liveFit(view).fit, "contain");
  }
});

test("Victoria-like null case => contain", () => {
  const view = resolvePublicMainPhotoView({
    src: PHOTO_URL,
    storedPhotoFocus: null,
    specialistId: "f2298df1-eb60-4d7a-8767-4f434909676c",
  });
  assert.equal(view.photoFocus, null);
  assert.equal(view.imageAspect, null);
  assert.equal(liveFit(view, "hero").fit, "contain");
  assert.equal(liveFit(view, "card").fit, "contain");
  assert.equal(liveFit(view, "thumb").fit, "contain");
});

test("avatar/photo fallback surface ignores metadata for a different src identity", () => {
  const avatarUrl = PHOTO_URL;
  const photoUrl = OTHER_URL;
  const stored = okStored();
  const categorySrc = photoUrl;
  const view = resolvePublicMainPhotoView({
    src: categorySrc,
    storedPhotoFocus: stored,
    specialistId: SPECIALIST_ID,
  });
  assert.notEqual(categorySrc, avatarUrl);
  assert.equal(view.src, categorySrc);
  assert.equal(view.photoFocus, null);
  assert.equal(view.imageAspect, null);
  assert.equal(liveFit(view, "card").fit, "contain");
});

test("production cover surfaces remain all false", () => {
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.card, false);
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.thumb, false);
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.hero, false);
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.dashboard, false);
  assert.equal(isSpecialistPhotoCoverEnabled("card"), false);
});

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(relativePath) {
  return readFileSync(join(root, relativePath), "utf-8");
}

test("public MAIN photo callers resolve the view model and pass imageAspect to the live resolver", () => {
  for (const relative of [
    "components/specialist/SpecialistHeroContent.tsx",
    "components/specialist/SpecialistPreviewCard.tsx",
    "components/public/SpecialistResultCard.tsx",
    "components/home/variantC/VariantCSpecialistCard.tsx",
  ]) {
    const src = readSrc(relative);
    assert.match(src, /resolvePublicMainPhotoView\(/, relative);
    assert.match(src, /resolveLiveSpecialistPhotoFit\(/, relative);
    assert.match(src, /imageAspect:\s*mainPhoto\.imageAspect/, relative);
    assert.match(src, /focus:\s*mainPhoto\.photoFocus/, relative);
  }
});

test("loaders select photo_focus only where MAIN photos are rendered", () => {
  assert.match(readSrc("lib/specialists/publicProfile.ts"), /select\("about_me, city, photo_focus"\)/);
  assert.match(
    readSrc("app/api/specialists/[id]/route.ts"),
    /photo_url, photo_focus, video_url/,
  );
  assert.match(
    readSrc("app/api/specialists/list/route.ts"),
    /specialist_id, photo_url, photo_focus, city/,
  );
  assert.match(
    readSrc("lib/search/specialistSearch.ts"),
    /select\("specialist_id, photo_focus"\)/,
  );
  assert.match(
    readSrc("lib/homepage/fetchRecommendedSpecialists.ts"),
    /specialist_id, city, photo_url, photo_focus, about_me/,
  );
});

test("unrelated small avatars keep object-cover and do not use the MAIN view model", () => {
  const mini = readSrc("components/specialist/SpecialistMiniCard.tsx");
  assert.match(mini, /className="h-full w-full object-cover/);
  assert.doesNotMatch(mini, /resolvePublicMainPhotoView/);

  const home = readSrc("app/[lang]/HomeClient.tsx");
  assert.match(home, /className="h-full w-full object-cover"/);
  assert.doesNotMatch(home, /resolvePublicMainPhotoView/);

  const profile = readSrc("components/specialist/SpecialistProfileClient.tsx");
  assert.match(profile, /className="object-cover"/);
});
