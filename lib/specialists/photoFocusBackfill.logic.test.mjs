import assert from "node:assert/strict";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const { PHOTO_FOCUS_ALGORITHM, PHOTO_FOCUS_VERSION, buildUnusablePhotoFocus } = await import(
  "./photoFocusMetadata.ts"
);
const { isPublishedMainPhotoEligible, photoFocusBackfillDecision } = await import(
  "./photoFocusBackfill.ts"
);

const identity = "storage:11111111-1111-1111-1111-111111111111/photo.jpg";

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
    photo_identity: identity,
    analyzed_at: "2026-08-19T00:00:00.000Z",
    ...overrides,
  };
}

test("backfill skips when version + algorithm + identity already match", () => {
  assert.equal(photoFocusBackfillDecision({ stored: okStored(), photoIdentity: identity }), "skip");
});

test("backfill writes when identity changed (replaced photo)", () => {
  assert.equal(
    photoFocusBackfillDecision({ stored: okStored(), photoIdentity: "storage:other/new.jpg" }),
    "write",
  );
});

test("backfill writes when metadata is absent", () => {
  assert.equal(photoFocusBackfillDecision({ stored: null, photoIdentity: identity }), "write");
});

test("failed analysis stamp is skip-stable unless retryFailed", () => {
  const stored = buildUnusablePhotoFocus({
    photoIdentity: identity,
    imageWidth: 800,
    imageHeight: 1066,
  });
  assert.equal(photoFocusBackfillDecision({ stored, photoIdentity: identity }), "skip");
  assert.equal(photoFocusBackfillDecision({ stored, photoIdentity: identity, retryFailed: true }), "write");
});

test("only published visible specialists with a main photo are eligible", () => {
  const published = {
    status: "published_unverified",
    isActive: true,
    isVisible: true,
    billingVisibilityBlocked: false,
    photoUrl: "https://example.supabase.co/storage/v1/object/public/specialist-avatars/x/y.jpg",
  };
  assert.equal(isPublishedMainPhotoEligible(published), true);
  assert.equal(isPublishedMainPhotoEligible({ ...published, status: "draft" }), false);
  assert.equal(isPublishedMainPhotoEligible({ ...published, photoUrl: null }), false);
  assert.equal(isPublishedMainPhotoEligible({ ...published, isVisible: false }), false);
});
