import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const {
  HOMEPAGE_PHOTO_GENERATE_PATH,
  HOMEPAGE_SOURCE_SIGN_PATH,
  buildHomepagePhotoGenerateBody,
  buildHomepageSourceSignRequest,
  generateHomepagePhotoFromEditor,
  homepagePhotoErrorMessageKey,
  parseHomepagePhotoGenerateSuccess,
  uploadNewHomepageSource,
  validateHomepageSourceFile,
} = await import("./homepagePhotoClient.ts");
const {
  HOMEPAGE_PHOTO_CROP_ASPECT,
  HOMEPAGE_PHOTO_CROP_RECONSTRUCTION_LIMITATION,
  HOMEPAGE_PHOTO_EDITOR_DEFAULT_ZOOM,
  applyCropComplete,
  applyEditorError,
  applyGenerateSuccess,
  applyWorkingSource,
  applyZoom,
  canSaveHomepagePhotoEditor,
  createHomepagePhotoEditorState,
  expectedUpdatedAtForSave,
  markDirty,
  resetHomepagePhotoEditor,
} = await import("./homepagePhotoEditorState.ts");
const { photoIdentityFromStoragePath } = await import("../specialists/photoFocusMetadata.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("./types.ts");
const { HOMEPAGE_PHOTO_SOURCE_MAX_BYTES } = await import("../specialists/homepagePhoto.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const ORIGIN = "https://example.supabase.co";
const SOURCE_PATH = `${SPECIALIST_ID}/source/1710000000000-abc12def.jpg`;
const HOMEPAGE_PATH = `${SPECIALIST_ID}/homepage/1710000000001-xyz89abc.jpg`;
const SOURCE_IDENTITY = photoIdentityFromStoragePath(SOURCE_PATH);
const OUTPUT_IDENTITY = photoIdentityFromStoragePath(HOMEPAGE_PATH);

function managedUrl(path) {
  return `${ORIGIN}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

function makeFile({ type = "image/jpeg", size = 2048, name = "photo.jpg" } = {}) {
  return new File([new Uint8Array(size)], name, { type });
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

function successBody(overrides = {}) {
  return {
    photo_source_url: managedUrl(SOURCE_PATH),
    homepage_photo_url: managedUrl(HOMEPAGE_PATH),
    homepage_photo: validMetadata(),
    state: "ready",
    ...overrides,
  };
}

test("empty initial state has no working source and cannot save", () => {
  const state = createHomepagePhotoEditorState({ specialistId: SPECIALIST_ID, canonicalOrigin: ORIGIN });
  assert.equal(state.status, "empty");
  assert.equal(state.saved, null);
  assert.equal(state.workingImageUrl, null);
  assert.equal(canSaveHomepagePhotoEditor(state), false);
});

test("existing saved canonical photo reconstructs identity and keeps saved preview until dirty save", () => {
  const state = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  assert.equal(state.status, "ready");
  assert.equal(state.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
  assert.equal(state.workingSourceIdentity, SOURCE_IDENTITY);
  assert.equal(state.zoom, 1.25);
  assert.deepEqual(state.initialCroppedAreaPixels, { x: 10, y: 20, width: 1550, height: 1000 });
  assert.equal(state.dirty, false);
  assert.equal(canSaveHomepagePhotoEditor(state), false);
  assert.match(HOMEPAGE_PHOTO_CROP_RECONSTRUCTION_LIMITATION, /EXIF/);
});

test("selecting valid file builds sign request and uploads to returned path/token before generate", async () => {
  const file = makeFile();
  const signBody = buildHomepageSourceSignRequest(file);
  assert.deepEqual(signBody, { fileName: "photo.jpg", contentType: "image/jpeg", size: 2048 });

  const calls = [];
  const result = await uploadNewHomepageSource(file, {
    async fetch(url, init) {
      calls.push({ url, init });
      assert.equal(url, HOMEPAGE_SOURCE_SIGN_PATH);
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body, signBody);
      return {
        status: 200,
        async json() {
          return {
            bucket: SPECIALIST_MEDIA_BUCKET,
            path: SOURCE_PATH,
            token: "signed-token",
            signedUrl: "https://example.supabase.co/upload",
            source_identity: SOURCE_IDENTITY,
            expires_in_seconds: 7200,
          };
        },
      };
    },
    async uploadToSignedUrl(path, token, uploadedFile) {
      calls.push({ path, token, file: uploadedFile });
      assert.equal(path, SOURCE_PATH);
      assert.equal(token, "signed-token");
      assert.equal(uploadedFile, file);
      return { error: null };
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.source_identity, SOURCE_IDENTITY);
  assert.equal(calls.length, 2);
});

test("invalid MIME and oversized files are rejected before sign", async () => {
  assert.equal(validateHomepageSourceFile(makeFile({ type: "image/gif" })).error, "unsupported_media_type");
  assert.equal(
    validateHomepageSourceFile(makeFile({ size: HOMEPAGE_PHOTO_SOURCE_MAX_BYTES + 1 })).error,
    "file_too_large",
  );
  const gif = await uploadNewHomepageSource(makeFile({ type: "image/gif" }), {
    fetch() {
      throw new Error("sign should not run");
    },
    uploadToSignedUrl() {
      throw new Error("upload should not run");
    },
  });
  assert.equal(gif.ok, false);
  if (!gif.ok) assert.equal(gif.error, "unsupported_media_type");
});

test("empty file is rejected", () => {
  assert.equal(validateHomepageSourceFile(makeFile({ size: 0 })).error, "empty_file");
});

test("replace source marks dirty and does not clear saved snapshot", () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  const replaced = applyWorkingSource(initial, {
    objectUrl: "blob:working",
    sourceIdentity: "storage:new-source.jpg",
  });
  assert.equal(replaced.dirty, true);
  assert.equal(replaced.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
  assert.equal(replaced.initialCroppedAreaPixels, null);
  assert.equal(replaced.zoom, HOMEPAGE_PHOTO_EDITOR_DEFAULT_ZOOM);
});

test("reset restores initial saved editor state", () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  const dirty = markDirty(applyZoom(initial, 2));
  const reset = resetHomepagePhotoEditor(dirty, initial);
  assert.equal(reset.dirty, false);
  assert.equal(reset.zoom, 1.25);
  assert.equal(reset.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
});

test("zoom change and crop complete update editor pixels", () => {
  let state = createHomepagePhotoEditorState({ specialistId: SPECIALIST_ID, canonicalOrigin: ORIGIN });
  state = applyWorkingSource(state, { objectUrl: "blob:x", sourceIdentity: SOURCE_IDENTITY });
  state = applyZoom(state, 2);
  state = applyCropComplete(state, { x: 1, y: 2, width: 775, height: 500 });
  assert.equal(state.zoom, 2);
  assert.deepEqual(state.croppedAreaPixels, { x: 1, y: 2, width: 775, height: 500 });
  assert.equal(canSaveHomepagePhotoEditor(state), true);
});

test("generate body sends source_identity, croppedAreaPixels, zoom, and expected updated_at", () => {
  const body = buildHomepagePhotoGenerateBody({
    source_identity: SOURCE_IDENTITY,
    crop: { x: 5, y: 6, width: 775, height: 500 },
    zoom: 1.4,
    expectedUpdatedAt: "2026-08-20T18:00:00.000Z",
  });
  assert.deepEqual(body, {
    source_identity: SOURCE_IDENTITY,
    crop: { x: 5, y: 6, width: 775, height: 500 },
    zoom: 1.4,
    expected_homepage_photo_updated_at: "2026-08-20T18:00:00.000Z",
  });
});

test("generate is not called when sign fails", async () => {
  const result = await uploadNewHomepageSource(makeFile(), {
    async fetch() {
      return { status: 500, async json() { return { error: "sign_failed" }; } };
    },
    uploadToSignedUrl() {
      throw new Error("upload should not run");
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "sign_failed");
});

test("generate is not called when direct upload fails", async () => {
  const result = await uploadNewHomepageSource(makeFile(), {
    async fetch() {
      return {
        status: 200,
        async json() {
          return {
            path: SOURCE_PATH,
            token: "t",
            signedUrl: "https://example.supabase.co/u",
            source_identity: SOURCE_IDENTITY,
          };
        },
      };
    },
    async uploadToSignedUrl() {
      return { error: { message: "network" } };
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "upload_failed");
});

test("generate success becomes saved state; failure does not mutate saved snapshot", async () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  let working = applyWorkingSource(initial, { objectUrl: "blob:x", sourceIdentity: SOURCE_IDENTITY });
  working = applyCropComplete(working, { x: 0, y: 0, width: 775, height: 500 });
  assert.equal(expectedUpdatedAtForSave(working), "2026-08-20T18:00:00.000Z");

  const failed = applyEditorError(working, "stale_save");
  assert.equal(failed.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
  assert.equal(failed.status, "error");

  const generated = await generateHomepagePhotoFromEditor(
    {
      source_identity: SOURCE_IDENTITY,
      crop: { x: 0, y: 0, width: 775, height: 500 },
      zoom: 1,
      expectedUpdatedAt: expectedUpdatedAtForSave(working),
    },
    {
      async fetch(url, init) {
        assert.equal(url, HOMEPAGE_PHOTO_GENERATE_PATH);
        const body = JSON.parse(String(init.body));
        assert.equal(body.source_identity, SOURCE_IDENTITY);
        assert.deepEqual(body.crop, { x: 0, y: 0, width: 775, height: 500 });
        assert.equal(body.expected_homepage_photo_updated_at, "2026-08-20T18:00:00.000Z");
        return { status: 200, async json() { return successBody(); } };
      },
    },
  );
  assert.equal(generated.ok, true);
  if (generated.ok) {
    const next = applyGenerateSuccess(working, generated.body);
    assert.equal(next.status, "success");
    assert.equal(next.dirty, false);
    assert.equal(next.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
    assert.equal(parseHomepagePhotoGenerateSuccess(generated.body)?.state, "ready");
  }
});

test("stale_save generate error keeps previous saved snapshot", async () => {
  const result = await generateHomepagePhotoFromEditor(
    { source_identity: SOURCE_IDENTITY, crop: { x: 0, y: 0, width: 775, height: 500 }, zoom: 1 },
    {
      async fetch() {
        return { status: 409, async json() { return { error: "stale_save" }; } };
      },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "stale_save");
});

test("thrown sign fetch becomes error state without upload or generate", async () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  const uploading = { ...initial, status: "uploading", error: null };
  let uploaded = false;
  const result = await uploadNewHomepageSource(makeFile(), {
    async fetch() {
      throw new Error("Failed to fetch: getaddrinfo ENOTFOUND");
    },
    uploadToSignedUrl() {
      uploaded = true;
      throw new Error("upload should not run");
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "sign_failed");
    assert.doesNotMatch(result.error, /ENOTFOUND|Failed to fetch/);
  }
  assert.equal(uploaded, false);
  const next = applyEditorError(uploading, result.ok ? "unused" : result.error);
  assert.equal(next.status, "error");
  assert.notEqual(next.status, "uploading");
  assert.notEqual(next.status, "saving");
  assert.equal(next.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
  assert.equal(homepagePhotoErrorMessageKey("sign_failed"), "dashboard.homepagePhoto.errors.signFailed");
});

test("thrown uploadToSignedUrl becomes error state without generate", async () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  const working = applyWorkingSource(initial, {
    objectUrl: "blob:selected",
    sourceIdentity: SOURCE_IDENTITY,
  });
  const uploading = { ...working, status: "uploading", error: null };
  const result = await uploadNewHomepageSource(makeFile(), {
    async fetch() {
      return {
        status: 200,
        async json() {
          return {
            path: SOURCE_PATH,
            token: "t",
            signedUrl: "https://example.supabase.co/u",
            source_identity: SOURCE_IDENTITY,
          };
        },
      };
    },
    async uploadToSignedUrl() {
      throw new Error("StorageApiError: Invalid Compact JWS");
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "upload_failed");
    assert.doesNotMatch(result.error, /StorageApiError|JWS/);
  }
  const next = applyEditorError(uploading, result.ok ? "unused" : result.error);
  assert.equal(next.status, "error");
  assert.equal(next.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
  assert.equal(next.workingImageUrl, "blob:selected");
  assert.equal(next.workingSourceIdentity, SOURCE_IDENTITY);
  assert.equal(homepagePhotoErrorMessageKey("upload_failed"), "dashboard.homepagePhoto.errors.uploadFailed");
});

test("thrown generate fetch clears saving and keeps crop for retry", async () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  let working = applyWorkingSource(initial, { objectUrl: "blob:x", sourceIdentity: SOURCE_IDENTITY });
  working = applyCropComplete(working, { x: 8, y: 9, width: 775, height: 500 });
  const saving = { ...working, status: "saving", error: null };
  const result = await generateHomepagePhotoFromEditor(
    {
      source_identity: SOURCE_IDENTITY,
      crop: { x: 8, y: 9, width: 775, height: 500 },
      zoom: working.zoom,
      expectedUpdatedAt: expectedUpdatedAtForSave(working),
    },
    {
      async fetch() {
        throw new TypeError("network request failed");
      },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "generation_failed");
    assert.doesNotMatch(result.error, /network request failed|TypeError/);
  }
  const next = applyEditorError(saving, result.ok ? "unused" : result.error);
  assert.equal(next.status, "error");
  assert.notEqual(next.status, "saving");
  assert.equal(next.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
  assert.equal(next.workingImageUrl, "blob:x");
  assert.equal(next.workingSourceIdentity, SOURCE_IDENTITY);
  assert.deepEqual(next.croppedAreaPixels, { x: 8, y: 9, width: 775, height: 500 });
  assert.equal(canSaveHomepagePhotoEditor(next), true);
  assert.equal(
    homepagePhotoErrorMessageKey("generation_failed"),
    "dashboard.homepagePhoto.errors.generateFailed",
  );
});

test("server error codes still map without mutating saved snapshot", async () => {
  const initial = createHomepagePhotoEditorState({
    specialistId: SPECIALIST_ID,
    initialSourceUrl: managedUrl(SOURCE_PATH),
    initialHomepagePhotoUrl: managedUrl(HOMEPAGE_PATH),
    initialMetadata: validMetadata(),
    canonicalOrigin: ORIGIN,
  });
  const codes = ["stale_save", "stale_source", "sign_failed", "upload_failed", "generation_failed", "persistence_failed"];
  for (const code of codes) {
    const next = applyEditorError(initial, code);
    assert.equal(next.status, "error");
    assert.equal(next.saved?.homepage_photo_url, managedUrl(HOMEPAGE_PATH));
    assert.match(homepagePhotoErrorMessageKey(code), /^dashboard\.homepagePhoto\.errors\./);
  }
});

test("client helpers never call MAIN avatar or media/photo routes", () => {
  const clientSrc = readFileSync(new URL("./homepagePhotoClient.ts", import.meta.url), "utf8");
  const editorSrc = readFileSync(
    new URL("../../components/specialist/HomepagePhotoCropEditor.tsx", import.meta.url),
    "utf8",
  );
  const previewSrc = readFileSync(
    new URL("../../components/specialist/HomepagePhotoCardPreview.tsx", import.meta.url),
    "utf8",
  );
  const forbidden = [/\/api\/specialist\/avatar\/upload/, /\/api\/specialist\/media\/photo(?!s)/];
  for (const src of [clientSrc, editorSrc, previewSrc]) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(src, pattern);
    }
  }
  assert.match(clientSrc, /homepage-source\/sign/);
  assert.match(clientSrc, /homepage-photo/);
  assert.match(clientSrc, /uploadToSignedUrl/);
});

test("editor layout keeps 31:20 viewport and mobile-safe controls", () => {
  const editorSrc = readFileSync(
    new URL("../../components/specialist/HomepagePhotoCropEditor.tsx", import.meta.url),
    "utf8",
  );
  const previewSrc = readFileSync(
    new URL("../../components/specialist/HomepagePhotoCardPreview.tsx", import.meta.url),
    "utf8",
  );
  assert.match(editorSrc, /aspect=\{\s*HOMEPAGE_PHOTO_CROP_ASPECT\s*\}/);
  assert.match(editorSrc, /aspect-\[31\/20\]/);
  assert.match(editorSrc, /max-w-\[620px\]/);
  assert.match(editorSrc, /min-h-11/);
  assert.match(editorSrc, /sr-only/);
  assert.match(editorSrc, /aria-live="polite"/);
  assert.match(editorSrc, /htmlFor=\{zoomInputId\}/);
  assert.match(editorSrc, /htmlFor=\{fileInputId\}/);
  assert.match(editorSrc, /zoomWithScroll/);
  assert.doesNotMatch(editorSrc, /VariantCSpecialistCard/);
  assert.doesNotMatch(editorSrc, /onRotationChange/);
  assert.match(previewSrc, /aspect-\[31\/20\]/);
  assert.match(previewSrc, /max-w-\[310px\]/);
  assert.doesNotMatch(previewSrc, /VariantCSpecialistCard/);
  assert.equal(Number(HOMEPAGE_PHOTO_CROP_ASPECT.toFixed(4)), Number((31 / 20).toFixed(4)));
});

test("dashboard profile no longer hosts the 31:20 editor; MAIN avatar upload remains", () => {
  const dashboardSrc = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/dashboard/SpecialistDashboardEditor.tsx", import.meta.url),
    "utf8",
  );
  const profileSrc = readFileSync(
    new URL("../../app/[lang]/specialist/(protected)/dashboard/profile/page.tsx", import.meta.url),
    "utf8",
  );
  const onboardingSrc = readFileSync(
    new URL("../../components/dashboard/onboarding/OnboardingPhotoStep.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(dashboardSrc, /HomepagePhotoCropEditor/);
  assert.match(dashboardSrc, /\/api\/specialist\/avatar\/upload/);
  assert.match(dashboardSrc, /dashboard\.fields\.avatar/);
  assert.doesNotMatch(dashboardSrc, /\/api\/specialist\/media\/photo/);
  assert.doesNotMatch(profileSrc, /photo_source_url, homepage_photo_url, homepage_photo/);
  assert.doesNotMatch(onboardingSrc, /HomepagePhotoCropEditor/);
  assert.match(onboardingSrc, /\/api\/specialist\/avatar\/upload/);
});

test("category list search and hero still ignore homepage_photo_url", () => {
  const files = [
    "../../components/public/SpecialistResultCard.tsx",
    "../../components/specialist/SpecialistPreviewCard.tsx",
    "../../components/specialist/SpecialistHeroContent.tsx",
    "../search/specialistSearch.ts",
    "../../app/api/specialists/list/route.ts",
  ];
  for (const relative of files) {
    const src = readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.doesNotMatch(src, /homepage_photo_url/, relative);
  }
});
