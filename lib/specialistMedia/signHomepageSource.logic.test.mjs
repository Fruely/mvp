import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  HOMEPAGE_PHOTO_SOURCE_MAX_BYTES,
  HOMEPAGE_PHOTO_SOURCE_SIGNED_UPLOAD_TTL_SECONDS,
  handleHomepageSourceSignRequest,
  parseHomepageSourceSignBody,
  resolveHomepageSourceExtension,
  signHomepageSourceUpload,
  validateHomepageSourceSignInput,
} = await import("./signHomepageSource.ts");
const { buildHomepageSourceStoragePath } = await import("./storage.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("./types.ts");
const { homepageSourceIdentityFromPath, isManagedHomepageSourcePath } = await import(
  "../specialists/homepagePhoto.ts"
);
const { photoIdentityFromStoragePath } = await import("../specialists/photoFocusMetadata.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_SPECIALIST_ID = "99999999-9999-9999-9999-999999999999";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const SERVICE_KEY = "super-secret-service-role-key";

function validInput(overrides = {}) {
  return {
    fileName: "photo.jpg",
    contentType: "image/jpeg",
    size: 1024,
    ...overrides,
  };
}

function createSignMock({ fail = false, leak = "Bucket exploded" } = {}) {
  let dbCalls = 0;
  const signedCalls = [];
  return {
    dbCalls: () => dbCalls,
    signedCalls,
    supabase: {
      from() {
        dbCalls += 1;
        throw new Error("unexpected database access");
      },
      storage: {
        from(bucket) {
          return {
            async createSignedUploadUrl(path, options) {
              signedCalls.push({ bucket, path, options });
              if (fail) {
                return { data: null, error: { message: leak } };
              }
              return {
                data: {
                  signedUrl: `https://example.supabase.co/storage/v1/object/upload/sign/${bucket}/${path}?token=signed-token`,
                  token: "signed-token",
                  path,
                },
                error: null,
              };
            },
          };
        },
      },
    },
  };
}

function okCtx(supabase, specialistStatus = "draft") {
  return {
    kind: "ok",
    supabase,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    specialistStatus,
  };
}

test("unauthenticated context is rejected before signing", async () => {
  const result = await handleHomepageSourceSignRequest(
    new Request("https://freuly.test/api/specialist/media/homepage-source/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validInput()),
    }),
    async () => ({ kind: "error", status: 401, body: { error: "unauthorized" } }),
  );
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "unauthorized" });
});

test("blocked specialist is rejected", async () => {
  const mock = createSignMock();
  const result = await signHomepageSourceUpload(okCtx(mock.supabase, "blocked"), validInput());
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: "forbidden" });
  assert.equal(mock.signedCalls.length, 0);
  assert.equal(mock.dbCalls(), 0);
});

test("JPEG PNG WebP and image/jpg are allowed", () => {
  for (const contentType of ["image/jpeg", "image/png", "image/webp", "image/jpg"]) {
    const result = validateHomepageSourceSignInput(validInput({ contentType, fileName: "a.bin" }));
    assert.equal(result.ok, true, contentType);
  }
});

test("empty size is rejected", () => {
  const result = validateHomepageSourceSignInput(validInput({ size: 0 }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.error, "empty_file");
});

test("size above 12 MB is rejected", () => {
  const result = validateHomepageSourceSignInput(validInput({ size: HOMEPAGE_PHOTO_SOURCE_MAX_BYTES + 1 }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
  assert.equal(result.error, "file_too_large");
});

test("exactly 12 MB is allowed", () => {
  const result = validateHomepageSourceSignInput(validInput({ size: HOMEPAGE_PHOTO_SOURCE_MAX_BYTES }));
  assert.equal(result.ok, true);
});

test("unsupported MIME types are rejected", () => {
  for (const contentType of [
    "image/heic",
    "image/heif",
    "image/svg+xml",
    "image/gif",
    "image/bmp",
    "application/octet-stream",
    "text/plain",
    "",
  ]) {
    const result = validateHomepageSourceSignInput(validInput({ contentType }));
    assert.equal(result.ok, false, contentType);
    assert.equal(result.status, 415, contentType);
    assert.equal(result.error, "unsupported_media_type", contentType);
  }
});

test("generated path is specialist source with unique suffix", () => {
  const first = buildHomepageSourceStoragePath(SPECIALIST_ID, "jpg");
  const second = buildHomepageSourceStoragePath(SPECIALIST_ID, "jpg");
  const pattern = new RegExp(`^${SPECIALIST_ID}/source/\\d+-[a-z0-9]+\\.jpg$`);
  assert.match(first, pattern);
  assert.match(second, pattern);
  assert.notEqual(first, second);
  assert.equal(first.includes("/homepage/"), false);
  assert.equal(first.includes("/gallery/"), false);
});

test("extension is canonicalized from MIME and ignores nested filename paths", () => {
  assert.equal(resolveHomepageSourceExtension("image/jpeg", "../../etc/passwd.jpg"), "jpg");
  assert.equal(resolveHomepageSourceExtension("image/jpeg", `${OTHER_SPECIALIST_ID}/homepage/x.jpeg`), "jpeg");
  assert.equal(resolveHomepageSourceExtension("image/png", "nested/dir/photo.PNG"), "png");
  assert.equal(resolveHomepageSourceExtension("image/webp", "C:\\\\Windows\\\\photo.webp"), "webp");
  assert.equal(resolveHomepageSourceExtension("image/jpeg", "photo.png"), "jpg");
  assert.equal(resolveHomepageSourceExtension("image/jpg", "no-ext"), "jpg");
});

test("client specialistId and extra path fields cannot influence parsed input", () => {
  const parsed = parseHomepageSourceSignBody({
    fileName: `${OTHER_SPECIALIST_ID}/gallery/hack.jpg`,
    contentType: "image/jpeg",
    size: 2048,
    specialistId: OTHER_SPECIALIST_ID,
    path: `${OTHER_SPECIALIST_ID}/homepage/x.jpg`,
    bucket: "other-bucket",
    publicUrl: "https://evil.example/photo.jpg",
  });
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;
  assert.deepEqual(parsed, {
    fileName: `${OTHER_SPECIALIST_ID}/gallery/hack.jpg`,
    contentType: "image/jpeg",
    size: 2048,
  });
});

test("signed upload uses session specialistId under source/ only", async () => {
  const mock = createSignMock();
  const result = await signHomepageSourceUpload(
    okCtx(mock.supabase),
    validInput({
      fileName: `${OTHER_SPECIALIST_ID}/homepage/nested.gif`,
      specialistId: OTHER_SPECIALIST_ID,
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(mock.signedCalls.length, 1);
  assert.equal(mock.signedCalls[0].bucket, SPECIALIST_MEDIA_BUCKET);
  assert.deepEqual(mock.signedCalls[0].options, { upsert: false });
  assert.match(result.body.path, new RegExp(`^${SPECIALIST_ID}/source/\\d+-[a-z0-9]+\\.jpg$`));
  assert.equal(result.body.path.includes(OTHER_SPECIALIST_ID), false);
  assert.equal(result.body.path.includes("/homepage/"), false);
  assert.equal(result.body.path.includes("/gallery/"), false);
  assert.equal(mock.dbCalls(), 0);
});

test("response contains signed-upload contract and matching source_identity", async () => {
  const mock = createSignMock();
  const result = await signHomepageSourceUpload(okCtx(mock.supabase), validInput());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.bucket, SPECIALIST_MEDIA_BUCKET);
  assert.equal(typeof result.body.token, "string");
  assert.ok(result.body.token.length > 0);
  assert.equal(typeof result.body.signedUrl, "string");
  assert.match(result.body.signedUrl, /\/object\/upload\/sign\//);
  assert.equal(result.body.source_identity, photoIdentityFromStoragePath(result.body.path));
  assert.equal(result.body.source_identity, homepageSourceIdentityFromPath(result.body.path, SPECIALIST_ID));
  assert.equal(result.body.expires_in_seconds, HOMEPAGE_PHOTO_SOURCE_SIGNED_UPLOAD_TTL_SECONDS);
  assert.equal(isManagedHomepageSourcePath(result.body.path, SPECIALIST_ID), true);
  const serialized = JSON.stringify(result.body);
  assert.equal(serialized.includes(SERVICE_KEY), false);
  assert.equal(serialized.toLowerCase().includes("service_role"), false);
  assert.equal(serialized.toLowerCase().includes("service-role"), false);
  assert.equal("photo_source_url" in result.body, false);
  assert.equal("homepage_photo_url" in result.body, false);
  assert.equal("homepage_photo" in result.body, false);
});

test("Supabase signed-url failure returns controlled error without DB writes", async () => {
  const mock = createSignMock({ fail: true, leak: `secret=${SERVICE_KEY}` });
  const result = await signHomepageSourceUpload(okCtx(mock.supabase), validInput());
  assert.equal(result.ok, false);
  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { error: "sign_failed" });
  assert.equal(JSON.stringify(result.body).includes(SERVICE_KEY), false);
  assert.equal(mock.dbCalls(), 0);
  assert.equal(mock.signedCalls.length, 1);
});

test("route uses media context and sign helper with no DB writes in source", () => {
  const route = readFileSync(
    new URL("../../app/api/specialist/media/homepage-source/sign/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /resolveSpecialistMediaContext/);
  assert.match(route, /handleHomepageSourceSignRequest/);
  assert.doesNotMatch(route, /\.from\(/);
  assert.doesNotMatch(route, /\.update\(/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /photo_source_url/);
  assert.doesNotMatch(route, /homepage_photo_url/);
  assert.doesNotMatch(route, /homepage_photo/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("sign helper source contains no database mutations", () => {
  const src = readFileSync(new URL("./signHomepageSource.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\.from\(["']specialist/);
  assert.doesNotMatch(src, /\.update\(/);
  assert.doesNotMatch(src, /\.insert\(/);
  assert.doesNotMatch(src, /photo_source_url/);
  assert.doesNotMatch(src, /homepage_photo_url/);
  assert.match(src, /createSignedUploadUrl/);
  assert.match(src, /upsert: false/);
  assert.match(src, /ZERO database writes/);
  assert.match(src, /Phase 2B/);
});
