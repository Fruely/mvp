import assert from "node:assert/strict";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const {
  HOMEPAGE_PHOTO_OUTPUT_HEIGHT,
  HOMEPAGE_PHOTO_OUTPUT_WIDTH,
  HOMEPAGE_PHOTO_RATIO,
  HOMEPAGE_PHOTO_VERSION,
  homepagePhotoClearOnSourceReplacePatch,
  homepagePhotoIdentityFromUrl,
  homepageSourceIdentityFromPath,
  isHomepagePhotoReady,
  isManagedHomepageSourcePath,
  normalizeHomepagePhotoCrop,
  parseHomepagePhotoMetadata,
  resolveHomepagePhotoState,
} = await import("./homepagePhoto.ts");
const { photoIdentityFromStoragePath } = await import("./photoFocusMetadata.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("../specialistMedia/types.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "99999999-9999-9999-9999-999999999999";
const ORIGIN = "https://example.supabase.co";
const SOURCE_PATH = `${SPECIALIST_ID}/source/1710000000000-abc12def.jpg`;
const HOMEPAGE_PATH = `${SPECIALIST_ID}/homepage/1710000000001-xyz89abc.jpg`;
const OTHER_SOURCE_PATH = `${SPECIALIST_ID}/source/999-other.jpg`;
const MAIN_PATH = `${SPECIALIST_ID}/1710000000000-abc12def.jpg`;

function managedUrl(path) {
  return `${ORIGIN}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

const SOURCE_URL = managedUrl(SOURCE_PATH);
const HOMEPAGE_URL = managedUrl(HOMEPAGE_PATH);
const OTHER_SOURCE_URL = managedUrl(OTHER_SOURCE_PATH);
const MAIN_URL = managedUrl(MAIN_PATH);
const identityOptions = { canonicalOrigin: ORIGIN };

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

function resolve(overrides = {}) {
  return resolveHomepagePhotoState({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
    ...overrides,
  });
}

test("parseHomepagePhotoMetadata accepts valid v1", () => {
  const parsed = parseHomepagePhotoMetadata(validMetadata());
  assert.deepEqual(parsed, validMetadata());
});

test("parseHomepagePhotoMetadata ignores unknown extra keys but keeps required fields", () => {
  const parsed = parseHomepagePhotoMetadata(validMetadata({ extra: "nope" }));
  assert.ok(parsed);
  assert.equal(parsed.version, 1);
  assert.equal("extra" in parsed, false);
});

test("parseHomepagePhotoMetadata rejects wrong version", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ version: 2 })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ version: "1" })), null);
});

test("parseHomepagePhotoMetadata rejects wrong ratio", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ ratio: "16:9" })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ ratio: "31 / 20" })), null);
});

test("parseHomepagePhotoMetadata rejects wrong output dimensions", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ output_width: 1549 })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ output_height: 1001 })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ output_width: "1550" })), null);
});

test("parseHomepagePhotoMetadata rejects malformed crop", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ crop: null })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ crop: [10, 20, 1550, 1000] })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ crop: { x: 10, y: 20, w: 1550, h: 1000 } })), null);
});

test("parseHomepagePhotoMetadata rejects fractional stored crop", () => {
  assert.equal(
    parseHomepagePhotoMetadata(validMetadata({ crop: { x: 10.2, y: 20, width: 1550, height: 1000 } })),
    null,
  );
});

test("parseHomepagePhotoMetadata rejects negative coordinates", () => {
  assert.equal(
    parseHomepagePhotoMetadata(validMetadata({ crop: { x: -1, y: 0, width: 10, height: 10 } })),
    null,
  );
  assert.equal(
    parseHomepagePhotoMetadata(validMetadata({ crop: { x: 0, y: -4, width: 10, height: 10 } })),
    null,
  );
});

test("parseHomepagePhotoMetadata rejects zero crop dimensions", () => {
  assert.equal(
    parseHomepagePhotoMetadata(validMetadata({ crop: { x: 0, y: 0, width: 0, height: 10 } })),
    null,
  );
  assert.equal(
    parseHomepagePhotoMetadata(validMetadata({ crop: { x: 0, y: 0, width: 10, height: 0 } })),
    null,
  );
});

test("parseHomepagePhotoMetadata rejects non-positive zoom", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ zoom: 0 })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ zoom: -1 })), null);
});

test("parseHomepagePhotoMetadata rejects NaN and infinite values", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ zoom: Number.NaN })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ zoom: Number.POSITIVE_INFINITY })), null);
  assert.equal(
    parseHomepagePhotoMetadata(validMetadata({ crop: { x: Number.NaN, y: 0, width: 10, height: 10 } })),
    null,
  );
  assert.equal(
    parseHomepagePhotoMetadata(
      validMetadata({ crop: { x: 0, y: Number.POSITIVE_INFINITY, width: 10, height: 10 } }),
    ),
    null,
  );
});

test("parseHomepagePhotoMetadata rejects invalid timestamp", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ updated_at: "" })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ updated_at: "not-a-date" })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ updated_at: "2026-08-20" })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ updated_at: 1724176800000 })), null);
});

test("parseHomepagePhotoMetadata rejects missing identities", () => {
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ source_identity: "" })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ source_identity: "   " })), null);
  assert.equal(parseHomepagePhotoMetadata(validMetadata({ output_identity: "" })), null);
  const { source_identity: _omit, ...withoutSource } = validMetadata();
  assert.equal(parseHomepagePhotoMetadata(withoutSource), null);
});

test("parseHomepagePhotoMetadata rejects non-objects", () => {
  assert.equal(parseHomepagePhotoMetadata(null), null);
  assert.equal(parseHomepagePhotoMetadata("storage:x"), null);
  assert.equal(parseHomepagePhotoMetadata([]), null);
});

test("homepagePhotoIdentityFromUrl accepts managed source and homepage paths", () => {
  assert.equal(
    homepagePhotoIdentityFromUrl(SOURCE_URL, SPECIALIST_ID, "source", identityOptions),
    photoIdentityFromStoragePath(SOURCE_PATH),
  );
  assert.equal(
    homepagePhotoIdentityFromUrl(HOMEPAGE_URL, SPECIALIST_ID, "homepage", identityOptions),
    photoIdentityFromStoragePath(HOMEPAGE_PATH),
  );
  assert.equal(
    homepagePhotoIdentityFromUrl(`${SOURCE_URL}?v=2`, SPECIALIST_ID, "source", identityOptions),
    photoIdentityFromStoragePath(SOURCE_PATH),
  );
});

test("isManagedHomepageSourcePath accepts specialist source files only", () => {
  assert.equal(isManagedHomepageSourcePath(SOURCE_PATH, SPECIALIST_ID), true);
  assert.equal(isManagedHomepageSourcePath(`${SPECIALIST_ID}/source/a.jpeg`, SPECIALIST_ID), true);
  assert.equal(isManagedHomepageSourcePath(`${SPECIALIST_ID}/source/a.png`, SPECIALIST_ID), true);
  assert.equal(isManagedHomepageSourcePath(`${SPECIALIST_ID}/source/a.webp`, SPECIALIST_ID), true);
  assert.equal(isManagedHomepageSourcePath(HOMEPAGE_PATH, SPECIALIST_ID), false);
  assert.equal(isManagedHomepageSourcePath(`${SPECIALIST_ID}/gallery/a.jpg`, SPECIALIST_ID), false);
  assert.equal(isManagedHomepageSourcePath(MAIN_PATH, SPECIALIST_ID), false);
  assert.equal(isManagedHomepageSourcePath(`${SPECIALIST_ID}/source/nested/a.jpg`, SPECIALIST_ID), false);
  assert.equal(isManagedHomepageSourcePath(`${OTHER_ID}/source/a.jpg`, SPECIALIST_ID), false);
  assert.equal(
    homepageSourceIdentityFromPath(SOURCE_PATH, SPECIALIST_ID),
    photoIdentityFromStoragePath(SOURCE_PATH),
  );
  assert.equal(homepageSourceIdentityFromPath(HOMEPAGE_PATH, SPECIALIST_ID), null);
});

test("homepagePhotoIdentityFromUrl rejects external, MAIN, gallery, and foreign specialist paths", () => {
  assert.equal(
    homepagePhotoIdentityFromUrl("https://evil.example/photo.jpg", SPECIALIST_ID, "source", identityOptions),
    null,
  );
  assert.equal(homepagePhotoIdentityFromUrl(MAIN_URL, SPECIALIST_ID, "source", identityOptions), null);
  assert.equal(homepagePhotoIdentityFromUrl(MAIN_URL, SPECIALIST_ID, "homepage", identityOptions), null);
  assert.equal(
    homepagePhotoIdentityFromUrl(
      managedUrl(`${SPECIALIST_ID}/gallery/a.jpg`),
      SPECIALIST_ID,
      "source",
      identityOptions,
    ),
    null,
  );
  assert.equal(
    homepagePhotoIdentityFromUrl(managedUrl(`${OTHER_ID}/source/a.jpg`), SPECIALIST_ID, "source", identityOptions),
    null,
  );
  assert.equal(
    homepagePhotoIdentityFromUrl(SOURCE_URL, SPECIALIST_ID, "homepage", identityOptions),
    null,
  );
});

test("resolveHomepagePhotoState ready when identities match", () => {
  const state = resolve();
  assert.equal(state.kind, "ready");
  if (state.kind !== "ready") return;
  assert.equal(state.sourceIdentity, photoIdentityFromStoragePath(SOURCE_PATH));
  assert.equal(state.outputIdentity, photoIdentityFromStoragePath(HOMEPAGE_PATH));
  assert.equal(isHomepagePhotoReady({
    specialistId: SPECIALIST_ID,
    photoSourceUrl: SOURCE_URL,
    homepagePhotoUrl: HOMEPAGE_URL,
    storedMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  }), true);
});

test("resolveHomepagePhotoState missing URL", () => {
  assert.equal(resolve({ homepagePhotoUrl: null }).kind, "missing");
  assert.equal(resolve({ homepagePhotoUrl: "   " }).kind, "missing");
});

test("resolveHomepagePhotoState missing metadata", () => {
  assert.equal(resolve({ storedMetadata: null }).kind, "missing");
  assert.equal(resolve({ storedMetadata: undefined }).kind, "missing");
});

test("resolveHomepagePhotoState malformed metadata is invalid", () => {
  assert.equal(resolve({ storedMetadata: { version: 1 } }).kind, "invalid");
  assert.equal(resolve({ storedMetadata: validMetadata({ ratio: "1:1" }) }).kind, "invalid");
});

test("resolveHomepagePhotoState source identity mismatch is stale", () => {
  const state = resolve({ photoSourceUrl: OTHER_SOURCE_URL });
  assert.equal(state.kind, "stale");
  if (state.kind !== "stale") return;
  assert.equal(state.sourceIdentity, photoIdentityFromStoragePath(OTHER_SOURCE_PATH));
  assert.equal(state.outputIdentity, photoIdentityFromStoragePath(HOMEPAGE_PATH));
  assert.equal(state.metadata.source_identity, photoIdentityFromStoragePath(SOURCE_PATH));
});

test("resolveHomepagePhotoState output identity mismatch is invalid", () => {
  const otherHomepage = managedUrl(`${SPECIALIST_ID}/homepage/222-other.jpg`);
  assert.equal(resolve({ homepagePhotoUrl: otherHomepage }).kind, "invalid");
});

test("resolveHomepagePhotoState malformed source URL is invalid", () => {
  assert.equal(resolve({ photoSourceUrl: "https://evil.example/a.jpg" }).kind, "invalid");
  assert.equal(resolve({ photoSourceUrl: MAIN_URL }).kind, "invalid");
  assert.equal(resolve({ photoSourceUrl: "not-a-url" }).kind, "invalid");
});

test("resolveHomepagePhotoState malformed homepage URL is invalid", () => {
  assert.equal(resolve({ homepagePhotoUrl: "https://evil.example/a.jpg" }).kind, "invalid");
  assert.equal(resolve({ homepagePhotoUrl: MAIN_URL }).kind, "invalid");
  assert.equal(resolve({ homepagePhotoUrl: SOURCE_URL }).kind, "invalid");
});

test("resolveHomepagePhotoState null source with otherwise valid metadata is invalid", () => {
  assert.equal(resolve({ photoSourceUrl: null }).kind, "invalid");
  assert.equal(resolve({ photoSourceUrl: "" }).kind, "invalid");
});

test("resolveHomepagePhotoState ignores legacy MAIN fields because they are not inputs", () => {
  const state = resolve();
  assert.equal(state.kind, "ready");
  assert.equal(
    isHomepagePhotoReady({
      specialistId: SPECIALIST_ID,
      photoSourceUrl: SOURCE_URL,
      homepagePhotoUrl: HOMEPAGE_URL,
      storedMetadata: validMetadata(),
      canonicalOrigin: ORIGIN,
    }),
    true,
  );
});

test("homepagePhotoClearOnSourceReplacePatch nulls homepage fields only", () => {
  const patch = homepagePhotoClearOnSourceReplacePatch();
  assert.deepEqual(patch, { homepage_photo_url: null, homepage_photo: null });
  assert.equal("avatar_url" in patch, false);
  assert.equal("photo_url" in patch, false);
  assert.equal("photo_focus" in patch, false);
  assert.equal("photo_source_url" in patch, false);
});

test("normalizeHomepagePhotoCrop keeps a normal integer crop", () => {
  assert.deepEqual(
    normalizeHomepagePhotoCrop({
      sourceWidth: 2000,
      sourceHeight: 1500,
      crop: { x: 40, y: 80, width: 1550, height: 1000 },
    }),
    { x: 40, y: 80, width: 1550, height: 1000 },
  );
});

test("normalizeHomepagePhotoCrop rounds fractional values", () => {
  assert.deepEqual(
    normalizeHomepagePhotoCrop({
      sourceWidth: 2000,
      sourceHeight: 1500,
      crop: { x: 10.4, y: 20.5, width: 100.4, height: 80.6 },
    }),
    { x: 10, y: 21, width: 100, height: 81 },
  );
});

test("normalizeHomepagePhotoCrop clamps negative x/y", () => {
  assert.deepEqual(
    normalizeHomepagePhotoCrop({
      sourceWidth: 400,
      sourceHeight: 300,
      crop: { x: -5.4, y: -2, width: 100, height: 80 },
    }),
    { x: 0, y: 0, width: 100, height: 80 },
  );
});

test("normalizeHomepagePhotoCrop clamps right/bottom overflow", () => {
  assert.deepEqual(
    normalizeHomepagePhotoCrop({
      sourceWidth: 1550,
      sourceHeight: 1000,
      crop: { x: 100, y: 50, width: 1600, height: 1200 },
    }),
    { x: 100, y: 50, width: 1450, height: 950 },
  );
});

test("normalizeHomepagePhotoCrop allows a 1px crop", () => {
  assert.deepEqual(
    normalizeHomepagePhotoCrop({
      sourceWidth: 10,
      sourceHeight: 10,
      crop: { x: 9, y: 9, width: 1, height: 1 },
    }),
    { x: 9, y: 9, width: 1, height: 1 },
  );
});

test("normalizeHomepagePhotoCrop rejects impossible source dimensions", () => {
  assert.equal(
    normalizeHomepagePhotoCrop({
      sourceWidth: 0,
      sourceHeight: 1000,
      crop: { x: 0, y: 0, width: 1, height: 1 },
    }),
    null,
  );
  assert.equal(
    normalizeHomepagePhotoCrop({
      sourceWidth: 100.5,
      sourceHeight: 100,
      crop: { x: 0, y: 0, width: 1, height: 1 },
    }),
    null,
  );
});

test("normalizeHomepagePhotoCrop clamps a crop larger than the source to the full frame", () => {
  assert.deepEqual(
    normalizeHomepagePhotoCrop({
      sourceWidth: 1550,
      sourceHeight: 1000,
      crop: { x: 0, y: 0, width: 4000, height: 3000 },
    }),
    { x: 0, y: 0, width: 1550, height: 1000 },
  );
});

test("normalizeHomepagePhotoCrop rejects NaN and infinity", () => {
  assert.equal(
    normalizeHomepagePhotoCrop({
      sourceWidth: Number.NaN,
      sourceHeight: 1000,
      crop: { x: 0, y: 0, width: 10, height: 10 },
    }),
    null,
  );
  assert.equal(
    normalizeHomepagePhotoCrop({
      sourceWidth: 1000,
      sourceHeight: 1000,
      crop: { x: 0, y: Number.POSITIVE_INFINITY, width: 10, height: 10 },
    }),
    null,
  );
});

test("normalizeHomepagePhotoCrop rejects a crop origin past the source edge", () => {
  assert.equal(
    normalizeHomepagePhotoCrop({
      sourceWidth: 100,
      sourceHeight: 100,
      crop: { x: 100, y: 0, width: 10, height: 10 },
    }),
    null,
  );
});
