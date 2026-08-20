import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const {
  evaluateHomepagePhotoConcurrency,
  generateHomepageJpegFromSourceBytes,
  generateHomepagePhoto,
  handleHomepagePhotoGenerateRequest,
  parseHomepagePhotoGenerateBody,
} = await import("./generateHomepagePhoto.ts");
const { HOMEPAGE_PHOTO_SOURCE_MAX_BYTES } = await import("../specialists/homepagePhoto.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("./types.ts");
const { photoIdentityFromStoragePath } = await import("../specialists/photoFocusMetadata.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "99999999-9999-9999-9999-999999999999";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const ORIGIN = "https://example.supabase.co";
const SOURCE_PATH = `${SPECIALIST_ID}/source/1710000000000-abc12def.jpg`;
const OTHER_SOURCE_PATH = `${SPECIALIST_ID}/source/999-other.jpg`;
const HOMEPAGE_PATH = `${SPECIALIST_ID}/homepage/1710000000001-xyz89abc.jpg`;

function managedUrl(path) {
  return `${ORIGIN}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

function okCtx(status = "draft") {
  return {
    kind: "ok",
    supabase: {},
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    specialistStatus: status,
  };
}

async function makeRaster(width, height, format = "jpeg") {
  const image = sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 80, b: 120 } },
  });
  if (format === "png") return image.png().toBuffer();
  if (format === "webp") return image.webp().toBuffer();
  if (format === "gif") return image.gif().toBuffer();
  return image.jpeg().toBuffer();
}

const VALID_CROP = { x: 0, y: 0, width: 775, height: 500 };

function validBody(overrides = {}) {
  return {
    source_identity: photoIdentityFromStoragePath(SOURCE_PATH),
    crop: { ...VALID_CROP },
    zoom: 1,
    ...overrides,
  };
}

function createIo({
  bytes,
  current = null,
  uploadFail = false,
  writeFail = false,
  writeConflict = false,
  downloadFail = false,
  missing = false,
  statSize = null,
} = {}) {
  const uploads = [];
  const deleted = [];
  const writes = [];
  const specialistWrites = [];
  let profile = current;

  return {
    uploads,
    deleted,
    writes,
    specialistWrites,
    io: {
      nowIso: () => "2026-08-20T20:00:00.000Z",
      canonicalOrigin: ORIGIN,
      publicUrlForPath: managedUrl,
      async statSource() {
        if (missing) return { found: false, size: null };
        return { found: true, size: statSize ?? bytes?.length ?? 0 };
      },
      async downloadSource() {
        if (missing) return { notFound: true };
        if (downloadFail) return { error: true };
        return { bytes };
      },
      async uploadHomepage(path, data) {
        uploads.push({ path, bytes: data.length, bucket: SPECIALIST_MEDIA_BUCKET });
        if (uploadFail) return { ok: false, status: 500, error: "storage_failed" };
        return { ok: true, path, publicUrl: managedUrl(path) };
      },
      async ensureProfile() {
        return { ok: true };
      },
      async readProfile() {
        return profile;
      },
      async writeProfile(patch, lock) {
        writes.push({ patch, lock, tables: ["specialist_profiles"] });
        if (writeFail) return { ok: false, error: true };
        if (writeConflict) return { ok: false, conflict: true };
        profile = patch;
        return { ok: true, row: patch };
      },
      async deleteHomepageObject(path) {
        deleted.push(path);
      },
    },
  };
}

test("unauthenticated generate request is rejected", async () => {
  const result = await handleHomepagePhotoGenerateRequest(
    new Request("https://freuly.test/api/specialist/media/homepage-photo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody()),
    }),
    async () => ({ kind: "error", status: 401, body: { error: "unauthorized" } }),
  );
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "unauthorized" });
});

test("blocked specialist is rejected", async () => {
  const bytes = await makeRaster(800, 600);
  const mock = createIo({ bytes });
  const result = await generateHomepagePhoto(okCtx("blocked"), validBody(), mock.io);
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: "forbidden" });
  assert.equal(mock.writes.length, 0);
});

test("request parse ignores specialistId and requires crop/zoom", () => {
  const parsed = parseHomepagePhotoGenerateBody({
    ...validBody(),
    specialistId: OTHER_ID,
    path: `${OTHER_ID}/homepage/x.jpg`,
    bucket: "other",
  });
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;
  assert.equal(parsed.source_identity, photoIdentityFromStoragePath(SOURCE_PATH));
  assert.equal("specialistId" in parsed, false);

  assert.equal(parseHomepagePhotoGenerateBody({ crop: VALID_CROP, zoom: 1 }).error, "invalid_source_identity");
  assert.equal(parseHomepagePhotoGenerateBody(validBody({ zoom: 0 })).error, "invalid_request");
  assert.equal(parseHomepagePhotoGenerateBody(validBody({ crop: { x: 0, y: 0 } })).error, "invalid_crop");
});

test("generate rejects foreign, homepage, gallery, MAIN, URL, and malformed identities", async () => {
  const bytes = await makeRaster(800, 600);
  const mock = createIo({ bytes });
  const identities = [
    photoIdentityFromStoragePath(`${OTHER_ID}/source/a.jpg`),
    photoIdentityFromStoragePath(HOMEPAGE_PATH),
    photoIdentityFromStoragePath(`${SPECIALIST_ID}/gallery/a.jpg`),
    photoIdentityFromStoragePath(`${SPECIALIST_ID}/1710000000000-abc12def.jpg`),
    managedUrl(SOURCE_PATH),
    "https://evil.example/photo.jpg",
    "storage:",
    `storage:${SPECIALIST_ID}/source/nested/a.jpg`,
  ];
  for (const source_identity of identities) {
    const result = await generateHomepagePhoto(okCtx(), validBody({ source_identity }), mock.io);
    assert.equal(result.ok, false, source_identity);
    assert.equal(result.status, 400, source_identity);
    assert.equal(result.body.error, "invalid_source_identity", source_identity);
  }
  assert.equal(mock.writes.length, 0);
});

test("JPEG PNG and WebP decode to exact 1550x1000 JPEG", async () => {
  for (const format of ["jpeg", "png", "webp"]) {
    const bytes = await makeRaster(800, 600, format);
    const result = await generateHomepageJpegFromSourceBytes(bytes, VALID_CROP);
    assert.equal(result.ok, true, format);
    if (!result.ok) continue;
    const meta = await sharp(result.value.jpeg).metadata();
    assert.equal(meta.format, "jpeg", format);
    assert.equal(meta.width, 1550, format);
    assert.equal(meta.height, 1000, format);
    assert.deepEqual(result.value.crop, VALID_CROP);
  }
});

test("GIF SVG corrupt empty and oversized actual bytes are rejected", async () => {
  const gif = await makeRaster(40, 40, "gif");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="red"/></svg>');
  const corrupt = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const empty = Buffer.alloc(0);
  const huge = Buffer.alloc(HOMEPAGE_PHOTO_SOURCE_MAX_BYTES + 1);

  const gifResult = await generateHomepageJpegFromSourceBytes(gif, VALID_CROP);
  assert.equal(gifResult.ok, false);
  assert.equal(gifResult.status, 415);

  const svgResult = await generateHomepageJpegFromSourceBytes(svg, VALID_CROP);
  assert.equal(svgResult.ok, false);
  assert.equal(svgResult.status, 415);

  const corruptResult = await generateHomepageJpegFromSourceBytes(corrupt, VALID_CROP);
  assert.equal(corruptResult.ok, false);
  assert.equal(corruptResult.status, 422);

  const emptyResult = await generateHomepageJpegFromSourceBytes(empty, VALID_CROP);
  assert.equal(emptyResult.ok, false);
  assert.equal(emptyResult.status, 400);

  const hugeResult = await generateHomepageJpegFromSourceBytes(huge, VALID_CROP);
  assert.equal(hugeResult.ok, false);
  assert.equal(hugeResult.status, 413);
});

test("crop uses dimensions after EXIF orientation", async () => {
  const unoriented = await sharp({
    create: { width: 500, height: 775, channels: 3, background: { r: 12, g: 34, b: 56 } },
  })
    .jpeg()
    .toBuffer();
  const withExif = await sharp(unoriented).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const stored = await sharp(withExif).metadata();
  assert.equal(stored.width, 500);
  assert.equal(stored.height, 775);
  assert.equal(stored.orientation, 6);

  const tooWideForUnoriented = await generateHomepageJpegFromSourceBytes(withExif, VALID_CROP);
  assert.equal(tooWideForUnoriented.ok, true);
  if (tooWideForUnoriented.ok) {
    assert.equal(tooWideForUnoriented.value.orientedWidth, 775);
    assert.equal(tooWideForUnoriented.value.orientedHeight, 500);
  }
});

test("crop floats normalize, out-of-bounds clamp, wrong aspect and zero rejected", async () => {
  const bytes = await makeRaster(800, 600);
  const floats = await generateHomepageJpegFromSourceBytes(bytes, { x: 0.4, y: 0.4, width: 775.4, height: 500.4 });
  assert.equal(floats.ok, true);
  if (floats.ok) assert.deepEqual(floats.value.crop, VALID_CROP);

  const clamped = await generateHomepageJpegFromSourceBytes(bytes, { x: -8, y: 0, width: 775, height: 500 });
  assert.equal(clamped.ok, true);
  if (clamped.ok) assert.equal(clamped.value.crop.x, 0);

  const wrongAspect = await generateHomepageJpegFromSourceBytes(bytes, { x: 0, y: 0, width: 400, height: 400 });
  assert.equal(wrongAspect.ok, false);
  assert.equal(wrongAspect.status, 400);
  assert.equal(wrongAspect.error, "invalid_crop_aspect");

  const zero = await generateHomepageJpegFromSourceBytes(bytes, { x: 0, y: 0, width: 0, height: 500 });
  assert.equal(zero.ok, false);

  const negative = await generateHomepageJpegFromSourceBytes(bytes, { x: 0, y: 0, width: -775, height: 500 });
  assert.equal(negative.ok, false);

  const overflowBreaksAspect = await generateHomepageJpegFromSourceBytes(bytes, {
    x: 100,
    y: 50,
    width: 1600,
    height: 1200,
  });
  assert.equal(overflowBreaksAspect.ok, false);
  assert.equal(overflowBreaksAspect.error, "invalid_crop_aspect");
});

test("successful persist writes only homepage fields and resolves ready", async () => {
  const bytes = await makeRaster(800, 600);
  const mock = createIo({ bytes });
  const result = await generateHomepagePhoto(okCtx(), validBody(), mock.io);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, 200);
  assert.equal(result.body.state, "ready");
  assert.equal(result.body.photo_source_url, managedUrl(SOURCE_PATH));
  assert.match(result.body.homepage_photo_url, new RegExp(`${SPECIALIST_ID}/homepage/\\d+-[a-z0-9]+\\.jpg`));
  assert.equal(result.body.homepage_photo.version, 1);
  assert.equal(result.body.homepage_photo.ratio, "31:20");
  assert.equal(result.body.homepage_photo.output_width, 1550);
  assert.equal(result.body.homepage_photo.output_height, 1000);
  assert.equal(result.body.homepage_photo.source_identity, photoIdentityFromStoragePath(SOURCE_PATH));
  assert.equal(result.body.homepage_photo.output_identity, `storage:${result.body.homepage_photo_url.split("/specialist-avatars/")[1]}`);
  assert.deepEqual(result.body.homepage_photo.crop, VALID_CROP);
  assert.equal(result.body.homepage_photo.zoom, 1);
  assert.equal(mock.writes.length, 1);
  assert.deepEqual(Object.keys(mock.writes[0].patch).sort(), [
    "homepage_photo",
    "homepage_photo_url",
    "photo_source_url",
  ]);
  assert.equal("avatar_url" in mock.writes[0].patch, false);
  assert.equal("photo_url" in mock.writes[0].patch, false);
  assert.equal("photo_focus" in mock.writes[0].patch, false);
  assert.equal(mock.specialistWrites.length, 0);
  assert.equal(mock.deleted.length, 0);
  assert.equal(mock.uploads.length, 1);
  assert.match(mock.uploads[0].path, /\/homepage\//);
  assert.equal(JSON.stringify(result.body).includes("service_role"), false);
});

test("generation failure does not write DB", async () => {
  const mock = createIo({ bytes: Buffer.from("not-an-image") });
  const result = await generateHomepagePhoto(okCtx(), validBody(), mock.io);
  assert.equal(result.ok, false);
  assert.equal(mock.writes.length, 0);
  assert.equal(mock.uploads.length, 0);
});

test("storage derivative failure does not write DB", async () => {
  const bytes = await makeRaster(800, 600);
  const mock = createIo({ bytes, uploadFail: true });
  const result = await generateHomepagePhoto(okCtx(), validBody(), mock.io);
  assert.equal(result.ok, false);
  assert.equal(result.body.error, "storage_failed");
  assert.equal(mock.writes.length, 0);
});

test("DB failure after upload deletes the new homepage object and preserves prior state", async () => {
  const bytes = await makeRaster(800, 600);
  const prior = {
    photo_source_url: managedUrl(OTHER_SOURCE_PATH),
    homepage_photo_url: managedUrl(HOMEPAGE_PATH),
    homepage_photo: {
      version: 1,
      ratio: "31:20",
      output_width: 1550,
      output_height: 1000,
      source_identity: photoIdentityFromStoragePath(OTHER_SOURCE_PATH),
      output_identity: photoIdentityFromStoragePath(HOMEPAGE_PATH),
      crop: VALID_CROP,
      zoom: 1,
      updated_at: "2026-08-20T18:00:00.000Z",
    },
  };
  const mock = createIo({
    bytes,
    current: prior,
    writeFail: true,
  });
  const result = await generateHomepagePhoto(
    okCtx(),
    validBody({
      source_identity: photoIdentityFromStoragePath(OTHER_SOURCE_PATH),
      expected_homepage_photo_updated_at: "2026-08-20T18:00:00.000Z",
    }),
    mock.io,
  );
  assert.equal(result.ok, false);
  assert.equal(result.body.error, "persistence_failed");
  assert.equal(mock.uploads.length, 1);
  assert.equal(mock.deleted.length, 1);
  assert.equal(mock.deleted[0], mock.uploads[0].path);
  assert.notEqual(mock.deleted[0], HOMEPAGE_PATH);
  assert.notEqual(mock.deleted[0], SOURCE_PATH);
});

test("first save from null is allowed", async () => {
  const bytes = await makeRaster(800, 600);
  const mock = createIo({ bytes, current: null });
  const result = await generateHomepagePhoto(okCtx(), validBody(), mock.io);
  assert.equal(result.ok, true);
  assert.equal(mock.writes[0].lock.updatedAt, null);
});

test("expected timestamp match allows save; mismatch returns 409", async () => {
  const bytes = await makeRaster(800, 600);
  const current = {
    photo_source_url: managedUrl(SOURCE_PATH),
    homepage_photo_url: managedUrl(HOMEPAGE_PATH),
    homepage_photo: {
      version: 1,
      ratio: "31:20",
      output_width: 1550,
      output_height: 1000,
      source_identity: photoIdentityFromStoragePath(SOURCE_PATH),
      output_identity: photoIdentityFromStoragePath(HOMEPAGE_PATH),
      crop: VALID_CROP,
      zoom: 1,
      updated_at: "2026-08-20T18:00:00.000Z",
    },
  };

  const okMock = createIo({ bytes, current: { ...current } });
  const ok = await generateHomepagePhoto(
    okCtx(),
    validBody({ expected_homepage_photo_updated_at: "2026-08-20T18:00:00.000Z" }),
    okMock.io,
  );
  assert.equal(ok.ok, true);

  const staleMock = createIo({ bytes, current: { ...current } });
  const stale = await generateHomepagePhoto(
    okCtx(),
    validBody({ expected_homepage_photo_updated_at: "2026-08-20T17:00:00.000Z" }),
    staleMock.io,
  );
  assert.equal(stale.ok, false);
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, "stale_save");
  assert.equal(staleMock.uploads.length, 0);
});

test("different persisted source without expected timestamp is stale_source", () => {
  const decision = evaluateHomepagePhotoConcurrency({
    specialistId: SPECIALIST_ID,
    requestSourceIdentity: photoIdentityFromStoragePath(SOURCE_PATH),
    current: {
      photo_source_url: managedUrl(OTHER_SOURCE_PATH),
      homepage_photo_url: managedUrl(HOMEPAGE_PATH),
      homepage_photo: {
        version: 1,
        ratio: "31:20",
        output_width: 1550,
        output_height: 1000,
        source_identity: photoIdentityFromStoragePath(OTHER_SOURCE_PATH),
        output_identity: photoIdentityFromStoragePath(HOMEPAGE_PATH),
        crop: VALID_CROP,
        zoom: 1,
        updated_at: "2026-08-20T18:00:00.000Z",
      },
    },
    canonicalOrigin: ORIGIN,
  });
  assert.equal(decision, "stale_source");
});

test("route is Node runtime and does not write MAIN fields", () => {
  const src = readFileSync(new URL("./generateHomepagePhoto.ts", import.meta.url), "utf8");
  assert.match(src, /photo_source_url/);
  assert.match(src, /homepage_photo_url/);
  assert.match(src, /image\/jpeg", false\)/);
  assert.doesNotMatch(src, /avatar_url/);
  assert.doesNotMatch(src, /photo_focus/);
  assert.doesNotMatch(src, /\.from\(["']specialists["']\)/);

  const route = readFileSync(new URL("../../app/api/specialist/media/homepage-photo/route.ts", import.meta.url), "utf8");
  assert.match(route, /runtime = "nodejs"/);
  assert.doesNotMatch(route, /edge/);
});
