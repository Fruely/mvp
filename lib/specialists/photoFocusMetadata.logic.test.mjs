import assert from "node:assert/strict";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const {
  PHOTO_FOCUS_ALGORITHM,
  PHOTO_FOCUS_VERSION,
  buildUnusablePhotoFocus,
  parseStoredPhotoFocus,
  photoFocusClearPatch,
  photoFocusForDisplayedUrl,
  photoIdentityChanged,
  photoIdentityFromStoragePath,
  photoIdentityFromUrl,
} = await import("./photoFocusMetadata.ts");
const { resolveLiveSpecialistPhotoFit, resolveSpecialistPhotoFit } = await import(
  "../../components/specialist/specialistMainPhotoFit.ts"
);

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const ORIGIN = "https://example.supabase.co";
const PHOTO_PATH = `${SPECIALIST_ID}/1710000000000-abc12def.jpg`;
const PHOTO_URL = `${ORIGIN}/storage/v1/object/public/specialist-avatars/${PHOTO_PATH}`;
const OTHER_URL = `${ORIGIN}/storage/v1/object/public/specialist-avatars/${SPECIALIST_ID}/999-other.jpg`;

const safePortraitFocus = {
  focalX: 0.5,
  focalY: 0.34,
  confidence: 0.92,
  source: "auto",
  face: { x: 0.35, y: 0.25, w: 0.3, h: 0.18 },
  subject: { x: 0.22, y: 0.12, w: 0.56, h: 0.82 },
};

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

test("managed storage URL identity ignores query strings", () => {
  const identity = photoIdentityFromUrl(`${PHOTO_URL}?v=2`, SPECIALIST_ID);
  assert.equal(identity, `storage:${PHOTO_PATH}`);
});

test("photo replacement changes identity", () => {
  assert.equal(photoIdentityChanged(SPECIALIST_ID, PHOTO_URL, OTHER_URL), true);
  assert.equal(photoIdentityChanged(SPECIALIST_ID, PHOTO_URL, PHOTO_URL), false);
  assert.equal(photoIdentityChanged(SPECIALIST_ID, PHOTO_URL, null), true);
});

test("metadata absent → no PhotoFocus", () => {
  assert.equal(
    photoFocusForDisplayedUrl({ stored: null, displayedUrl: PHOTO_URL, specialistId: SPECIALIST_ID }),
    null,
  );
});

test("stale photo_identity is ignored", () => {
  const stored = okStored();
  assert.equal(
    photoFocusForDisplayedUrl({
      stored,
      displayedUrl: OTHER_URL,
      specialistId: SPECIALIST_ID,
    }),
    null,
  );
});

test("unsupported algorithm/version is ignored", () => {
  assert.equal(parseStoredPhotoFocus(okStored({ version: 2 })), null);
  assert.equal(parseStoredPhotoFocus(okStored({ algorithm: "mediapipe" })), null);
});

test("matching stored metadata becomes PhotoFocus", () => {
  const focus = photoFocusForDisplayedUrl({
    stored: okStored(),
    displayedUrl: PHOTO_URL,
    specialistId: SPECIALIST_ID,
  });
  assert.ok(focus);
  assert.equal(focus.focalX, 0.5);
  assert.equal(focus.source, "auto");
  assert.equal(focus.confidence, 0.92);
});

test("unusable analysis stamp does not become PhotoFocus", () => {
  const stored = buildUnusablePhotoFocus({
    photoIdentity: photoIdentityFromStoragePath(PHOTO_PATH),
    imageWidth: 800,
    imageHeight: 1066,
  });
  assert.equal(parseStoredPhotoFocus(stored)?.status, "unusable");
  assert.equal(
    photoFocusForDisplayedUrl({
      stored,
      displayedUrl: PHOTO_URL,
      specialistId: SPECIALIST_ID,
    }),
    null,
  );
});

test("low confidence matching metadata still yields PhotoFocus; resolver contains", () => {
  const stored = okStored({ confidence: 0.2 });
  const focus = photoFocusForDisplayedUrl({
    stored,
    displayedUrl: PHOTO_URL,
    specialistId: SPECIALIST_ID,
  });
  assert.ok(focus);
  const fit = resolveSpecialistPhotoFit({
    focus,
    surface: "card",
    imageAspect: 800 / 1066,
  });
  assert.equal(fit.fit, "contain");
});

test("metadata present but live cover gate OFF → contain", () => {
  const focus = photoFocusForDisplayedUrl({
    stored: okStored(),
    displayedUrl: PHOTO_URL,
    specialistId: SPECIALIST_ID,
  });
  const fit = resolveLiveSpecialistPhotoFit({
    focus,
    surface: "card",
    imageAspect: 800 / 1066,
  });
  assert.equal(fit.fit, "contain");
  assert.equal(fit.objectPosition, "50% 50%");
});

test("pure resolver can still cover when tests pass trusted focus (evaluator path)", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: safePortraitFocus,
    surface: "card",
    imageAspect: 3 / 4,
  });
  assert.equal(fit.fit, "cover");
});

test("clear patch is a nullable jsonb wipe", () => {
  assert.deepEqual(photoFocusClearPatch(), { photo_focus: null });
});
