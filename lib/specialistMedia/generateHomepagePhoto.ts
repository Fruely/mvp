import sharp, { type OutputInfo } from "sharp";

import type { SpecialistMediaContext } from "@/lib/specialistMedia/context";
import {
  buildHomepageOutputStoragePath,
  deleteManagedStoragePaths,
  ensureSpecialistProfileRow,
  getPublicUrlForStoragePath,
  uploadSpecialistMediaBytes,
} from "@/lib/specialistMedia/storage";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/specialistMedia/types";
import {
  HOMEPAGE_PHOTO_MIN_ORIENTED_HEIGHT,
  HOMEPAGE_PHOTO_MIN_ORIENTED_WIDTH,
  HOMEPAGE_PHOTO_OUTPUT_HEIGHT,
  HOMEPAGE_PHOTO_OUTPUT_WIDTH,
  HOMEPAGE_PHOTO_RATIO_HEIGHT,
  HOMEPAGE_PHOTO_RATIO_WIDTH,
  HOMEPAGE_PHOTO_SOURCE_KIND,
  HOMEPAGE_PHOTO_SOURCE_MAX_BYTES,
  buildHomepagePhotoMetadata,
  homepageOutputIdentityFromPath,
  homepagePhotoIdentityFromUrl,
  homepageSourceIdentityFromPath,
  isHomepagePhotoCropAspectValid,
  isManagedHomepageOutputPath,
  normalizeHomepagePhotoCrop,
  parseHomepagePhotoMetadata,
  parseManagedHomepageSourceIdentity,
  resolveHomepagePhotoState,
  type HomepagePhotoCrop,
  type HomepagePhotoMetadata,
} from "@/lib/specialists/homepagePhoto";

/**
 * Authoritative homepage derivative generation.
 * Sign-time MIME/size from Phase 2A is not trusted. Sharp is the decoder boundary.
 */

const ALLOWED_SHARP_FORMATS = new Set(["jpeg", "jpg", "png", "webp"]);
const JPEG_QUALITY = 82;

export type HomepagePhotoGenerateInput = {
  source_identity: string;
  crop: { x: number; y: number; width: number; height: number };
  zoom: number;
  expected_homepage_photo_updated_at?: string | null;
};

export type HomepagePhotoGenerateSuccessBody = {
  photo_source_url: string;
  homepage_photo_url: string;
  homepage_photo: HomepagePhotoMetadata;
  state: "ready";
};

export type HomepagePhotoGenerateResult =
  | { ok: true; status: 200; body: HomepagePhotoGenerateSuccessBody }
  | { ok: false; status: number; body: { error: string } };

type SpecialistMediaOkContext = Extract<SpecialistMediaContext, { kind: "ok" }>;
type ResolveMediaContext = (request: Request) => Promise<SpecialistMediaContext>;

export type HomepagePhotoProfileRow = {
  photo_source_url: string | null;
  homepage_photo_url: string | null;
  homepage_photo: unknown;
};

export type HomepagePhotoGenerateIo = {
  nowIso: () => string;
  canonicalOrigin?: string | null;
  publicUrlForPath: (path: string) => string;
  statSource: (path: string) => Promise<{ found: boolean; size: number | null }>;
  downloadSource: (path: string) => Promise<{ bytes: Buffer } | { notFound: true } | { error: true }>;
  uploadHomepage: (
    path: string,
    bytes: Buffer,
  ) => Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; status: number; error: string }>;
  ensureProfile: () => Promise<{ ok: true } | { ok: false; status: number; error: string }>;
  readProfile: () => Promise<HomepagePhotoProfileRow | null | { error: true }>;
  writeProfile: (
    patch: {
      photo_source_url: string;
      homepage_photo_url: string;
      homepage_photo: HomepagePhotoMetadata;
    },
    lock: { updatedAt: string | null },
  ) => Promise<{ ok: true; row: HomepagePhotoProfileRow } | { ok: false; conflict: true } | { ok: false; error: true }>;
  deleteHomepageObject: (path: string) => Promise<void>;
};

export type GeneratedHomepageJpeg = {
  jpeg: Buffer;
  crop: HomepagePhotoCrop;
  orientedWidth: number;
  orientedHeight: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sniffForbiddenFormat(bytes: Buffer): "gif" | "svg" | "heif" | null {
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "gif";
  }
  if (bytes.length >= 12) {
    const box = bytes.subarray(4, 8).toString("ascii");
    const brand = bytes.subarray(8, 12).toString("ascii").toLowerCase();
    if (box === "ftyp" && ["heic", "heif", "mif1", "msf1", "heix", "hevc"].includes(brand)) {
      return "heif";
    }
  }
  const head = bytes.subarray(0, Math.min(bytes.length, 512)).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return "svg";
  }
  return null;
}

async function toBuffer(data: { arrayBuffer: () => Promise<ArrayBuffer> } | Buffer | Uint8Array): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  return Buffer.from(await data.arrayBuffer());
}

export function parseHomepagePhotoGenerateBody(raw: unknown): HomepagePhotoGenerateInput | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "invalid_request" };
  }
  const row = raw as Record<string, unknown>;
  if (typeof row.source_identity !== "string") {
    return { error: "invalid_source_identity" };
  }
  if (!isFiniteNumber(row.zoom) || !(row.zoom > 0)) {
    return { error: "invalid_request" };
  }
  const crop = row.crop;
  if (!crop || typeof crop !== "object" || Array.isArray(crop)) {
    return { error: "invalid_crop" };
  }
  const cropRow = crop as Record<string, unknown>;
  const x = cropRow.x;
  const y = cropRow.y;
  const width = cropRow.width;
  const height = cropRow.height;
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(width) || !isFiniteNumber(height)) {
    return { error: "invalid_crop" };
  }

  const parsed: HomepagePhotoGenerateInput = {
    source_identity: row.source_identity,
    zoom: row.zoom,
    crop: { x, y, width, height },
  };

  if ("expected_homepage_photo_updated_at" in row) {
    const expected = row.expected_homepage_photo_updated_at;
    if (expected !== null && typeof expected !== "string") {
      return { error: "invalid_request" };
    }
    parsed.expected_homepage_photo_updated_at = expected;
  }

  return parsed;
}

export function evaluateHomepagePhotoConcurrency(input: {
  specialistId: string;
  requestSourceIdentity: string;
  current: HomepagePhotoProfileRow | null;
  expectedUpdatedAt?: string | null;
  canonicalOrigin?: string | null;
}): "ok" | "stale_save" | "stale_source" {
  const currentMeta = parseHomepagePhotoMetadata(input.current?.homepage_photo ?? null);
  const currentUpdatedAt = currentMeta?.updated_at ?? null;
  const currentSourceIdentity = homepagePhotoIdentityFromUrl(
    input.current?.photo_source_url,
    input.specialistId,
    HOMEPAGE_PHOTO_SOURCE_KIND,
    { canonicalOrigin: input.canonicalOrigin },
  );

  if (input.expectedUpdatedAt !== undefined) {
    const expected = input.expectedUpdatedAt === "" ? null : input.expectedUpdatedAt;
    if (expected !== currentUpdatedAt) return "stale_save";
  }

  if (currentSourceIdentity && currentSourceIdentity !== input.requestSourceIdentity) {
    if (input.expectedUpdatedAt === undefined) return "stale_source";
  }

  return "ok";
}

export async function generateHomepageJpegFromSourceBytes(
  bytes: Buffer,
  crop: { x: number; y: number; width: number; height: number },
): Promise<
  | { ok: true; value: GeneratedHomepageJpeg }
  | { ok: false; status: number; error: string }
> {
  if (!bytes || bytes.length === 0) {
    return { ok: false, status: 400, error: "empty_file" };
  }
  if (bytes.length > HOMEPAGE_PHOTO_SOURCE_MAX_BYTES) {
    return { ok: false, status: 413, error: "source_too_large" };
  }

  const sniffed = sniffForbiddenFormat(bytes);
  if (sniffed) {
    return { ok: false, status: 415, error: "unsupported_image" };
  }

  let format: string | undefined;
  try {
    const probe = await sharp(bytes, { failOn: "error", animated: false, sequentialRead: true }).metadata();
    format = probe.format;
    if (probe.pages && probe.pages > 1) {
      return { ok: false, status: 415, error: "unsupported_image" };
    }
  } catch {
    return { ok: false, status: 422, error: "corrupt_image" };
  }

  if (!format || !ALLOWED_SHARP_FORMATS.has(format) || format === "svg" || format === "gif" || format === "heif" || format === "tiff") {
    return { ok: false, status: 415, error: "unsupported_image" };
  }

  let oriented: { data: Buffer; info: OutputInfo };
  try {
    oriented = await sharp(bytes, { failOn: "error", animated: false, sequentialRead: true })
      .rotate()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, status: 422, error: "corrupt_image" };
  }

  const orientedWidth = oriented.info.width;
  const orientedHeight = oriented.info.height;
  if (orientedWidth < HOMEPAGE_PHOTO_MIN_ORIENTED_WIDTH || orientedHeight < HOMEPAGE_PHOTO_MIN_ORIENTED_HEIGHT) {
    return { ok: false, status: 422, error: "insufficient_dimensions" };
  }

  const normalized = normalizeHomepagePhotoCrop({
    sourceWidth: orientedWidth,
    sourceHeight: orientedHeight,
    crop,
  });
  if (!normalized) {
    return { ok: false, status: 400, error: "invalid_crop" };
  }
  if (normalized.width < HOMEPAGE_PHOTO_RATIO_WIDTH || normalized.height < HOMEPAGE_PHOTO_RATIO_HEIGHT) {
    return { ok: false, status: 422, error: "insufficient_dimensions" };
  }
  if (!isHomepagePhotoCropAspectValid(normalized.width, normalized.height)) {
    return { ok: false, status: 400, error: "invalid_crop_aspect" };
  }

  let jpeg: Buffer;
  let outputInfo: OutputInfo;
  try {
    const generated = await sharp(oriented.data)
      .extract({
        left: normalized.x,
        top: normalized.y,
        width: normalized.width,
        height: normalized.height,
      })
      .resize(HOMEPAGE_PHOTO_OUTPUT_WIDTH, HOMEPAGE_PHOTO_OUTPUT_HEIGHT, { fit: "fill" })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    jpeg = generated.data;
    outputInfo = generated.info;
  } catch {
    console.error("[homepage-photo/generate] Sharp output failed");
    return { ok: false, status: 500, error: "generation_failed" };
  }

  if (outputInfo.width !== HOMEPAGE_PHOTO_OUTPUT_WIDTH || outputInfo.height !== HOMEPAGE_PHOTO_OUTPUT_HEIGHT) {
    return { ok: false, status: 500, error: "generation_failed" };
  }

  try {
    const verified = await sharp(jpeg, { failOn: "error" }).metadata();
    if (verified.format !== "jpeg" || verified.width !== HOMEPAGE_PHOTO_OUTPUT_WIDTH || verified.height !== HOMEPAGE_PHOTO_OUTPUT_HEIGHT) {
      return { ok: false, status: 500, error: "generation_failed" };
    }
  } catch {
    return { ok: false, status: 500, error: "generation_failed" };
  }

  return {
    ok: true,
    value: {
      jpeg,
      crop: normalized,
      orientedWidth,
      orientedHeight,
    },
  };
}

function createDefaultIo(ctx: SpecialistMediaOkContext): HomepagePhotoGenerateIo {
  return {
    nowIso: () => new Date().toISOString(),
    canonicalOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    publicUrlForPath: (path) => getPublicUrlForStoragePath(ctx.supabase, path),
    async statSource(path) {
      const { data, error } = await ctx.supabase.storage.from(SPECIALIST_MEDIA_BUCKET).info(path);
      if (error || !data) {
        const message = error?.message ?? "";
        if (/not found|404/i.test(message)) return { found: false, size: null };
        return { found: true, size: null };
      }
      return { found: true, size: typeof data.size === "number" ? data.size : null };
    },
    async downloadSource(path) {
      const { data, error } = await ctx.supabase.storage.from(SPECIALIST_MEDIA_BUCKET).download(path);
      if (error || !data) {
        const message = error?.message ?? "";
        if (/not found|404/i.test(message)) return { notFound: true };
        console.error("[homepage-photo/generate] source download failed");
        return { error: true };
      }
      return { bytes: await toBuffer(data) };
    },
    async uploadHomepage(path, bytes) {
      return uploadSpecialistMediaBytes(ctx.supabase, path, bytes, "image/jpeg", false);
    },
    async ensureProfile() {
      return ensureSpecialistProfileRow(ctx.supabase, ctx.specialistId);
    },
    async readProfile() {
      const { data, error } = await ctx.supabase
        .from("specialist_profiles")
        .select("photo_source_url, homepage_photo_url, homepage_photo")
        .eq("specialist_id", ctx.specialistId)
        .maybeSingle();
      if (error) {
        console.error("[homepage-photo/generate] profile read failed");
        return { error: true };
      }
      if (!data) return null;
      return {
        photo_source_url: typeof data.photo_source_url === "string" ? data.photo_source_url : null,
        homepage_photo_url: typeof data.homepage_photo_url === "string" ? data.homepage_photo_url : null,
        homepage_photo: data.homepage_photo ?? null,
      };
    },
    async writeProfile(patch, lock) {
      let query = ctx.supabase
        .from("specialist_profiles")
        .update(patch)
        .eq("specialist_id", ctx.specialistId);
      query = lock.updatedAt
        ? query.filter("homepage_photo->>updated_at", "eq", lock.updatedAt)
        : query.is("homepage_photo", null);
      const { data, error } = await query
        .select("photo_source_url, homepage_photo_url, homepage_photo")
        .maybeSingle();
      if (error) {
        console.error("[homepage-photo/generate] profile write failed");
        return { ok: false, error: true };
      }
      if (!data) return { ok: false, conflict: true };
      return {
        ok: true,
        row: {
          photo_source_url: typeof data.photo_source_url === "string" ? data.photo_source_url : null,
          homepage_photo_url: typeof data.homepage_photo_url === "string" ? data.homepage_photo_url : null,
          homepage_photo: data.homepage_photo ?? null,
        },
      };
    },
    async deleteHomepageObject(path) {
      await deleteManagedStoragePaths(ctx.supabase, [path]);
    },
  };
}

export async function generateHomepagePhoto(
  ctx: SpecialistMediaOkContext,
  input: HomepagePhotoGenerateInput,
  io: HomepagePhotoGenerateIo = createDefaultIo(ctx),
): Promise<HomepagePhotoGenerateResult> {
  if (ctx.specialistStatus === "blocked") {
    return { ok: false, status: 403, body: { error: "forbidden" } };
  }

  const sourcePath = parseManagedHomepageSourceIdentity(input.source_identity, ctx.specialistId);
  if (!sourcePath) {
    return { ok: false, status: 400, body: { error: "invalid_source_identity" } };
  }
  const requestSourceIdentity = homepageSourceIdentityFromPath(sourcePath, ctx.specialistId);
  if (!requestSourceIdentity) {
    return { ok: false, status: 400, body: { error: "invalid_source_identity" } };
  }

  const current = await io.readProfile();
  if (current && "error" in current) {
    return { ok: false, status: 500, body: { error: "persistence_failed" } };
  }
  const currentRow = current && !("error" in current) ? current : null;

  const early = evaluateHomepagePhotoConcurrency({
    specialistId: ctx.specialistId,
    requestSourceIdentity,
    current: currentRow,
    expectedUpdatedAt: input.expected_homepage_photo_updated_at,
    canonicalOrigin: io.canonicalOrigin,
  });
  if (early === "stale_save") return { ok: false, status: 409, body: { error: "stale_save" } };
  if (early === "stale_source") return { ok: false, status: 409, body: { error: "stale_source" } };

  const stat = await io.statSource(sourcePath);
  if (!stat.found) {
    return { ok: false, status: 404, body: { error: "source_not_found" } };
  }
  if (stat.size === 0) {
    return { ok: false, status: 400, body: { error: "empty_file" } };
  }
  if (stat.size != null && stat.size > HOMEPAGE_PHOTO_SOURCE_MAX_BYTES) {
    return { ok: false, status: 413, body: { error: "source_too_large" } };
  }

  const downloaded = await io.downloadSource(sourcePath);
  if ("notFound" in downloaded) {
    return { ok: false, status: 404, body: { error: "source_not_found" } };
  }
  if ("error" in downloaded) {
    return { ok: false, status: 500, body: { error: "storage_failed" } };
  }

  const generated = await generateHomepageJpegFromSourceBytes(downloaded.bytes, input.crop);
  if (!generated.ok) {
    return { ok: false, status: generated.status, body: { error: generated.error } };
  }

  const outputPath = buildHomepageOutputStoragePath(ctx.specialistId);
  if (!isManagedHomepageOutputPath(outputPath, ctx.specialistId)) {
    return { ok: false, status: 500, body: { error: "generation_failed" } };
  }

  const uploaded = await io.uploadHomepage(outputPath, generated.value.jpeg);
  if (!uploaded.ok) {
    return { ok: false, status: uploaded.status, body: { error: uploaded.error } };
  }

  const outputIdentity = homepageOutputIdentityFromPath(uploaded.path, ctx.specialistId);
  if (!outputIdentity) {
    await io.deleteHomepageObject(uploaded.path);
    return { ok: false, status: 500, body: { error: "generation_failed" } };
  }

  const sourcePublicUrl = io.publicUrlForPath(sourcePath);

  const latest = await io.readProfile();
  if (latest && "error" in latest) {
    await io.deleteHomepageObject(uploaded.path);
    return { ok: false, status: 500, body: { error: "persistence_failed" } };
  }
  const latestRow = latest && !("error" in latest) ? latest : null;
  const latestLock = evaluateHomepagePhotoConcurrency({
    specialistId: ctx.specialistId,
    requestSourceIdentity,
    current: latestRow,
    expectedUpdatedAt: input.expected_homepage_photo_updated_at,
    canonicalOrigin: io.canonicalOrigin,
  });
  if (latestLock !== "ok") {
    await io.deleteHomepageObject(uploaded.path);
    return {
      ok: false,
      status: 409,
      body: { error: latestLock === "stale_save" ? "stale_save" : "stale_source" },
    };
  }

  const latestMeta = parseHomepagePhotoMetadata(latestRow?.homepage_photo ?? null);
  const lockUpdatedAt = latestMeta?.updated_at ?? null;

  const metadata = buildHomepagePhotoMetadata({
    source_identity: requestSourceIdentity,
    output_identity: outputIdentity,
    crop: generated.value.crop,
    zoom: input.zoom,
    updated_at: io.nowIso(),
  });
  if (!metadata) {
    await io.deleteHomepageObject(uploaded.path);
    return { ok: false, status: 500, body: { error: "generation_failed" } };
  }

  const ensured = await io.ensureProfile();
  if (!ensured.ok) {
    await io.deleteHomepageObject(uploaded.path);
    return { ok: false, status: ensured.status, body: { error: "persistence_failed" } };
  }

  const patch = {
    photo_source_url: sourcePublicUrl,
    homepage_photo_url: uploaded.publicUrl,
    homepage_photo: metadata,
  };

  const written = await io.writeProfile(patch, { updatedAt: lockUpdatedAt });
  if (!written.ok) {
    await io.deleteHomepageObject(uploaded.path);
    if ("conflict" in written && written.conflict) {
      return { ok: false, status: 409, body: { error: "stale_save" } };
    }
    return { ok: false, status: 500, body: { error: "persistence_failed" } };
  }

  const state = resolveHomepagePhotoState({
    specialistId: ctx.specialistId,
    photoSourceUrl: written.row.photo_source_url,
    homepagePhotoUrl: written.row.homepage_photo_url,
    storedMetadata: written.row.homepage_photo,
    canonicalOrigin: io.canonicalOrigin,
  });
  if (state.kind !== "ready") {
    console.error("[homepage-photo/generate] post-write state was not ready");
    return { ok: false, status: 500, body: { error: "persistence_failed" } };
  }

  return {
    ok: true,
    status: 200,
    body: {
      photo_source_url: written.row.photo_source_url as string,
      homepage_photo_url: written.row.homepage_photo_url as string,
      homepage_photo: metadata,
      state: "ready",
    },
  };
}

export async function handleHomepagePhotoGenerateRequest(
  request: Request,
  resolveContext: ResolveMediaContext,
  ioFactory?: (ctx: SpecialistMediaOkContext) => HomepagePhotoGenerateIo,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const ctx = await resolveContext(request);
  if (ctx.kind === "error") {
    return { status: ctx.status, body: ctx.body };
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseHomepagePhotoGenerateBody(raw);
  if ("error" in parsed) {
    return { status: 400, body: { error: parsed.error } };
  }

  const result = await generateHomepagePhoto(ctx, parsed, ioFactory ? ioFactory(ctx) : createDefaultIo(ctx));
  return { status: result.status, body: result.body };
}
