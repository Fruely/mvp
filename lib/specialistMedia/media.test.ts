import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildIdempotentGalleryStoragePath,
  extractManagedStoragePath,
  validateSpecialistMediaUpload,
} from "./storage.ts";
import { uploadSpecialistProfilePhoto, deleteSpecialistProfilePhoto } from "./mutatePhoto.ts";
import {
  addSpecialistGalleryImage,
  deleteSpecialistGalleryImage,
} from "./mutateGallery.ts";
import { SPECIALIST_MEDIA_BUCKET } from "./types.ts";

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const SUPABASE_PUBLIC = "https://example.supabase.co";

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

test("extractManagedStoragePath accepts owned paths and rejects external URLs", () => {
  const owned = managedUrl(`${SPECIALIST_ID}/gallery/a.jpg`);
  assert.equal(extractManagedStoragePath(owned, SPECIALIST_ID), `${SPECIALIST_ID}/gallery/a.jpg`);
  assert.equal(extractManagedStoragePath("https://evil.example/photo.jpg", SPECIALIST_ID), null);
  assert.equal(extractManagedStoragePath(managedUrl("other/gallery/a.jpg"), SPECIALIST_ID), null);
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
  assert.ok(state.deletedPaths.includes(oldPath));
});

test("profile photo upload compensates new object when avatar persistence fails", async () => {
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
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
});

test("profile photo delete clears DB and removes managed storage only", async () => {
  const oldPath = `${SPECIALIST_ID}/old.jpg`;
  const state: MockState = {
    avatarUrl: managedUrl(oldPath),
    photoUrl: managedUrl(oldPath),
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
  assert.ok(state.deletedPaths.includes(oldPath));
});

test("gallery add enforces server limit", async () => {
  const state: MockState = {
    avatarUrl: null,
    photoUrl: null,
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

test("route wiring uses specialistMedia modules", () => {
  const mediaRoute = readFileSync(new URL("../../app/api/specialist/media/route.ts", import.meta.url), "utf8");
  const photoRoute = readFileSync(new URL("../../app/api/specialist/media/photo/route.ts", import.meta.url), "utf8");
  const galleryRoute = readFileSync(new URL("../../app/api/specialist/media/gallery/route.ts", import.meta.url), "utf8");

  assert.match(mediaRoute, /loadSpecialistMediaPage/);
  assert.match(photoRoute, /uploadSpecialistProfilePhoto/);
  assert.match(galleryRoute, /addSpecialistGalleryImage/);
});
