import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  buildIdempotentGalleryStoragePath,
  extractManagedStoragePath,
  validateSpecialistMediaUpload,
} = await import("./storage.ts");
const { uploadSpecialistProfilePhoto, deleteSpecialistProfilePhoto } = await import("./mutatePhoto.ts");
const { addSpecialistGalleryImage, deleteSpecialistGalleryImage } = await import("./mutateGallery.ts");
const { SPECIALIST_MEDIA_BUCKET } = await import("./types.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const SUPABASE_PUBLIC = "https://example.supabase.co";
const OTHER_SPECIALIST_ID = "99999999-9999-9999-9999-999999999999";

const canonicalOriginOptions = { canonicalOrigin: SUPABASE_PUBLIC };

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_PUBLIC;

function managedUrl(path: string) {
  return `${SUPABASE_PUBLIC}/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${path}`;
}

function makeFile(args: { type: string; size?: number; name?: string }) {
  const bytes = args.size ?? 1024;
  const buffer = new Uint8Array(bytes);
  return new File([buffer], args.name ?? "photo.jpg", { type: args.type });
}

type MockState = {
  avatarUrl: string | null;
  photoUrl: string | null;
  photoFocus: unknown;
  galleryUrls: string[];
  profileExists: boolean;
  plan: { plan_code: string; plan_status: string };
  storage: Map<string, Uint8Array>;
  deletedPaths: string[];
  persistFail?: boolean;
};

function createMockSupabase(state: MockState) {
  const storageApi = {
    from(_bucket: string) {
      return {
        upload: async (path: string, file: File) => {
          if (state.persistFail && path.includes("fail-upload")) {
            return { data: null, error: { message: "upload failed" } };
          }
          state.storage.set(path, new Uint8Array(await file.arrayBuffer()));
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: managedUrl(path) } }),
        remove: async (paths: string[]) => {
          for (const path of paths) {
            state.deletedPaths.push(path);
            state.storage.delete(path);
          }
          return { error: null };
        },
      };
    },
  };

  const chain: Record<string, unknown> = {};
  let table = "specialists";
  let updatePayload: Record<string, unknown> | null = null;

  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.maybeSingle = async () => {
    if (table === "specialists") {
      return { data: { id: SPECIALIST_ID, avatar_url: state.avatarUrl, status: "draft" }, error: null };
    }
    if (table === "specialist_profiles") {
      if (!state.profileExists) return { data: null, error: null };
      return {
        data: {
          specialist_id: SPECIALIST_ID,
          photo_url: state.photoUrl,
          photo_focus: state.photoFocus,
          gallery_urls: state.galleryUrls,
        },
        error: null,
      };
    }
    if (table === "specialist_plan") {
      return { data: state.plan, error: null };
    }
    return { data: null, error: null };
  };
  chain.insert = async (payload: Record<string, unknown>) => {
    if (table === "specialist_profiles") {
      state.profileExists = true;
      return { error: null };
    }
    return { error: null };
  };
  chain.update = (payload: Record<string, unknown>) => {
    updatePayload = payload;
    return chain;
  };
  chain.then = (onFulfilled: (value: unknown) => unknown) => {
    if (updatePayload && table === "specialist_profiles") {
      if (state.persistFail) {
        return Promise.resolve({ error: { message: "db fail" } }).then(onFulfilled);
      }
      if ("photo_url" in updatePayload) {
        state.photoUrl = (updatePayload.photo_url as string | null) ?? null;
      }
      if ("photo_focus" in updatePayload) {
        state.photoFocus = updatePayload.photo_focus ?? null;
      }
      if ("gallery_urls" in updatePayload) {
        state.galleryUrls = updatePayload.gallery_urls as string[];
      }
    }
    if (updatePayload && table === "specialists" && "avatar_url" in updatePayload) {
      if (state.persistFail) {
        return Promise.resolve({ error: { message: "db fail" } }).then(onFulfilled);
      }
      state.avatarUrl = (updatePayload.avatar_url as string | null) ?? null;
    }
    updatePayload = null;
    return Promise.resolve({ error: null }).then(onFulfilled);
  };

  return {
    from(nextTable: string) {
      table = nextTable;
      updatePayload = null;
      return chain;
    },
    storage: storageApi,
  };
}

const okCtx = (state: MockState) => ({
  kind: "ok" as const,
  supabase: createMockSupabase(state) as never,
  userId: USER_ID,
  specialistId: SPECIALIST_ID,
  specialistStatus: "draft",
});

const stubMediaPage = async () => ({
  data: {
    profile_photo_url: null,
    gallery_urls: [],
    gallery_count: 0,
    gallery_limit: 5,
    gallery_enabled: true,
    can_upload_gallery: true,
    gallery_over_limit: false,
    public_gallery_urls: [],
    effective_paid_plan: null,
  },
  onboarding_gate: "incomplete" as const,
  publication_ready: false,
  public_profile_available: false,
});

const stubDeps = { loadMediaPage: stubMediaPage };

test("extractManagedStoragePath accepts canonical owned paths and rejects untrusted origins", () => {
  const owned = managedUrl(`${SPECIALIST_ID}/gallery/a.jpg`);
  assert.equal(
    extractManagedStoragePath(owned, SPECIALIST_ID, canonicalOriginOptions),
    `${SPECIALIST_ID}/gallery/a.jpg`,
  );
  assert.equal(extractManagedStoragePath("https://evil.example/photo.jpg", SPECIALIST_ID, canonicalOriginOptions), null);
  assert.equal(
    extractManagedStoragePath(managedUrl(`${OTHER_SPECIALIST_ID}/gallery/a.jpg`), SPECIALIST_ID, canonicalOriginOptions),
    null,
  );

  const mimickedPath = `/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${SPECIALIST_ID}/gallery/foo.jpg`;
  assert.equal(
    extractManagedStoragePath(`https://evil.example${mimickedPath}`, SPECIALIST_ID, canonicalOriginOptions),
    null,
  );
  assert.equal(
    extractManagedStoragePath(
      `https://other-project.supabase.co${mimickedPath}`,
      SPECIALIST_ID,
      canonicalOriginOptions,
    ),
    null,
  );
  assert.equal(
    extractManagedStoragePath(
      managedUrl(`${SPECIALIST_ID}/gallery/${encodeURIComponent("..")}/x.jpg`),
      SPECIALIST_ID,
      canonicalOriginOptions,
    ),
    null,
  );
  assert.equal(extractManagedStoragePath("not-a-url", SPECIALIST_ID, canonicalOriginOptions), null);
});

test("extractManagedStoragePath uses configured Supabase origin from env", () => {
  const owned = managedUrl(`${SPECIALIST_ID}/photo.jpg`);
  assert.equal(extractManagedStoragePath(owned, SPECIALIST_ID), `${SPECIALIST_ID}/photo.jpg`);
});

test("validateSpecialistMediaUpload rejects unsupported MIME and oversized files", () => {
  assert.equal(validateSpecialistMediaUpload(makeFile({ type: "image/svg+xml" })).ok, false);
  const oversized = makeFile({ type: "image/jpeg", size: 6 * 1024 * 1024 });
  const result = validateSpecialistMediaUpload(oversized);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("profile photo upload persists before deleting previous managed object", async () => {
  const oldPath = `${SPECIALIST_ID}/old.jpg`;
  const state: MockState = {
    avatarUrl: managedUrl(oldPath),
    photoUrl: managedUrl(oldPath),
    photoFocus: null,
    galleryUrls: [],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map([[oldPath, new Uint8Array([1])]]),
    deletedPaths: [],
  };

  const result = await uploadSpecialistProfilePhoto(okCtx(state), makeFile({ type: "image/jpeg" }), "de", stubDeps);
  assert.equal(result.ok, true);
  assert.ok(state.photoUrl?.includes(SPECIALIST_ID));
  assert.equal(state.avatarUrl, state.photoUrl);
  assert.equal(state.photoFocus, null);
  assert.ok(state.deletedPaths.includes(oldPath));
});

test("profile photo upload invalidates previous focus metadata", async () => {
  const oldPath = `${SPECIALIST_ID}/old.jpg`;
  const state: MockState = {
    avatarUrl: managedUrl(oldPath),
    photoUrl: managedUrl(oldPath),
    photoFocus: { version: 1, photo_identity: `storage:${oldPath}` },
    galleryUrls: [],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map([[oldPath, new Uint8Array([1])]]),
    deletedPaths: [],
  };

  const result = await uploadSpecialistProfilePhoto(okCtx(state), makeFile({ type: "image/jpeg" }), "de", stubDeps);
  assert.equal(result.ok, true);
  assert.equal(state.photoFocus, null);
});

test("profile photo upload compensates new object when avatar persistence fails", async () => {
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
    photoFocus: null,
    galleryUrls: [],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map(),
    deletedPaths: [],
    persistFail: true,
  };

  const result = await uploadSpecialistProfilePhoto(okCtx(state), makeFile({ type: "image/jpeg" }), "de", stubDeps);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 500);
  assert.equal(state.photoUrl, null);
  assert.equal(state.avatarUrl, null);
});

test("profile photo delete clears DB and removes managed storage only", async () => {
  const oldPath = `${SPECIALIST_ID}/old.jpg`;
  const state: MockState = {
    avatarUrl: managedUrl(oldPath),
    photoUrl: managedUrl(oldPath),
    photoFocus: { version: 1, photo_identity: `storage:${oldPath}` },
    galleryUrls: [],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map([[oldPath, new Uint8Array([1])]]),
    deletedPaths: [],
  };

  const result = await deleteSpecialistProfilePhoto(okCtx(state), "de", stubDeps);
  assert.equal(result.ok, true);
  assert.equal(state.photoUrl, null);
  assert.equal(state.avatarUrl, null);
  assert.equal(state.photoFocus, null);
  assert.ok(state.deletedPaths.includes(oldPath));
});

test("gallery add enforces server limit", async () => {
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
    photoFocus: null,
    galleryUrls: Array.from({ length: 5 }, (_, index) => managedUrl(`${SPECIALIST_ID}/gallery/${index}.jpg`)),
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map(),
    deletedPaths: [],
  };

  const result = await addSpecialistGalleryImage(okCtx(state), makeFile({ type: "image/png", name: "a.png" }), "de", null, stubDeps);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.equal((result.body as { error?: string }).error, "gallery_limit_reached");
  }
});

test("gallery add with idempotency key replays without duplicate reference", async () => {
  const idempotencyKey = "native:specialist-gallery:abc12345";
  const idempotentPath = buildIdempotentGalleryStoragePath(SPECIALIST_ID, idempotencyKey, "jpg");
  const existingUrl = managedUrl(idempotentPath);
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
    photoFocus: null,
    galleryUrls: [existingUrl],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map([[idempotentPath, new Uint8Array([1])]]),
    deletedPaths: [],
  };

  const result = await addSpecialistGalleryImage(
    okCtx(state),
    makeFile({ type: "image/jpeg" }),
    "de",
    "native:specialist-gallery:abc12345",
    stubDeps,
  );
  assert.equal(result.ok, true);
  assert.equal(state.galleryUrls.length, 1);
});

test("gallery delete rejects non-member URL", async () => {
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
    photoFocus: null,
    galleryUrls: [managedUrl(`${SPECIALIST_ID}/gallery/1.jpg`)],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map(),
    deletedPaths: [],
  };

  const result = await deleteSpecialistGalleryImage(
    okCtx(state),
    "https://external.example/other.jpg",
    "de",
    stubDeps,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("gallery delete of external member removes DB reference without Storage remove", async () => {
  const externalUrl = "https://cdn.example.com/legacy-gallery.jpg";
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
    photoFocus: null,
    galleryUrls: [externalUrl, managedUrl(`${SPECIALIST_ID}/gallery/managed.jpg`)],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map([[`${SPECIALIST_ID}/gallery/managed.jpg`, new Uint8Array([1])]]),
    deletedPaths: [],
  };

  const deleteExternal = await deleteSpecialistGalleryImage(okCtx(state), externalUrl, "de", stubDeps);
  assert.equal(deleteExternal.ok, true);
  assert.deepEqual(state.galleryUrls, [managedUrl(`${SPECIALIST_ID}/gallery/managed.jpg`)]);
  assert.equal(state.deletedPaths.length, 0);

  const deleteManaged = await deleteSpecialistGalleryImage(
    okCtx(state),
    managedUrl(`${SPECIALIST_ID}/gallery/managed.jpg`),
    "de",
    stubDeps,
  );
  assert.equal(deleteManaged.ok, true);
  assert.equal(state.galleryUrls.length, 0);
  assert.deepEqual(state.deletedPaths, [`${SPECIALIST_ID}/gallery/managed.jpg`]);
});

test("profile replace with external previous photo does not Storage-delete external URL", async () => {
  const externalPrevious = `https://evil.example/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/${SPECIALIST_ID}/old.jpg`;
  const state: MockState = {
    avatarUrl: externalPrevious,
    photoUrl: externalPrevious,
    photoFocus: null,
    galleryUrls: [],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map(),
    deletedPaths: [],
  };

  const result = await uploadSpecialistProfilePhoto(okCtx(state), makeFile({ type: "image/jpeg" }), "de", stubDeps);
  assert.equal(result.ok, true);
  assert.equal(state.deletedPaths.length, 0);
  assert.ok(state.photoUrl?.startsWith(SUPABASE_PUBLIC));
});

test("profile delete with external current photo clears DB without Storage remove", async () => {
  const externalPrevious = "https://cdn.example.com/avatar.jpg";
  const state: MockState = {
    avatarUrl: externalPrevious,
    photoUrl: externalPrevious,
    photoFocus: null,
    galleryUrls: [],
    profileExists: true,
    plan: { plan_code: "basic", plan_status: "active" },
    storage: new Map(),
    deletedPaths: [],
  };

  const result = await deleteSpecialistProfilePhoto(okCtx(state), "de", stubDeps);
  assert.equal(result.ok, true);
  assert.equal(state.photoUrl, null);
  assert.equal(state.avatarUrl, null);
  assert.equal(state.deletedPaths.length, 0);
});

test("route wiring uses specialistMedia modules", () => {
  const mediaRoute = readFileSync(new URL("../../app/api/specialist/media/route.ts", import.meta.url), "utf8");
  const photoRoute = readFileSync(new URL("../../app/api/specialist/media/photo/route.ts", import.meta.url), "utf8");
  const galleryRoute = readFileSync(new URL("../../app/api/specialist/media/gallery/route.ts", import.meta.url), "utf8");

  assert.match(mediaRoute, /loadSpecialistMediaPage/);
  assert.match(photoRoute, /uploadSpecialistProfilePhoto/);
  assert.match(galleryRoute, /addSpecialistGalleryImage/);

  const avatarUpload = readFileSync(new URL("../../app/api/specialist/avatar/upload/route.ts", import.meta.url), "utf8");
  assert.match(avatarUpload, /photo_focus: null/);

  const homepageSourceSign = readFileSync(
    new URL("../../app/api/specialist/media/homepage-source/sign/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(homepageSourceSign, /resolveSpecialistMediaContext/);
  assert.match(homepageSourceSign, /handleHomepageSourceSignRequest/);

  const homepagePhotoGenerate = readFileSync(
    new URL("../../app/api/specialist/media/homepage-photo/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(homepagePhotoGenerate, /runtime = "nodejs"/);
  assert.match(homepagePhotoGenerate, /handleHomepagePhotoGenerateRequest/);
  assert.match(homepagePhotoGenerate, /resolveSpecialistMediaContext/);
  assert.doesNotMatch(homepagePhotoGenerate, /runtime = "edge"/);
});
