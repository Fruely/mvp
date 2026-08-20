import type { SupabaseClient } from "@supabase/supabase-js";

import type { SpecialistMediaContext } from "@/lib/specialistMedia/context";
import { buildHomepageSourceStoragePath } from "@/lib/specialistMedia/storage";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/specialistMedia/types";
import {
  homepageSourceIdentityFromPath,
  isManagedHomepageSourcePath,
} from "@/lib/specialists/homepagePhoto";

/**
 * Sign-time checks are policy only (claimed MIME and size).
 * Phase 2B generate will re-fetch Storage bytes and sniff/decode with Sharp.
 * This module performs ZERO database writes. A signed target does not prove upload succeeded.
 */

export const HOMEPAGE_PHOTO_SOURCE_MAX_BYTES = 12 * 1024 * 1024;
export const HOMEPAGE_PHOTO_SOURCE_SIGNED_UPLOAD_TTL_SECONDS = 7200;

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const JPEG_FAMILY = new Set(["image/jpeg", "image/jpg"]);
const SAFE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export type HomepageSourceSignInput = {
  fileName?: string;
  contentType: string;
  size: number;
};

export type HomepageSourceSignSuccessBody = {
  bucket: typeof SPECIALIST_MEDIA_BUCKET;
  path: string;
  token: string;
  signedUrl: string;
  source_identity: string;
  expires_in_seconds: number;
};

export type HomepageSourceSignResult =
  | { ok: true; status: 200; body: HomepageSourceSignSuccessBody }
  | { ok: false; status: number; body: { error: string } };

type SpecialistMediaOkContext = Extract<SpecialistMediaContext, { kind: "ok" }>;

type ResolveMediaContext = (request: Request) => Promise<SpecialistMediaContext>;

function extractClientExtension(fileName: string | undefined): string | null {
  if (typeof fileName !== "string" || !fileName.trim()) return null;
  const base = fileName.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  if (!base || base === "." || base === "..") return null;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return SAFE_EXTENSIONS.has(ext) ? ext : null;
}

function extensionFromContentType(contentType: string): string | null {
  if (JPEG_FAMILY.has(contentType)) return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return null;
}

export function resolveHomepageSourceExtension(contentType: string, fileName?: string): string | null {
  const fromMime = extensionFromContentType(contentType);
  if (!fromMime) return null;
  const fromName = extractClientExtension(fileName);
  if (fromMime === "jpg" && (fromName === "jpg" || fromName === "jpeg")) return fromName;
  return fromMime;
}

export function parseHomepageSourceSignBody(raw: unknown): HomepageSourceSignInput | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "invalid_request" };
  }
  const row = raw as Record<string, unknown>;
  const contentType = typeof row.contentType === "string" ? row.contentType : "";
  const size = row.size;
  const fileName = typeof row.fileName === "string" ? row.fileName : undefined;
  if (typeof size !== "number") {
    return { error: "invalid_file" };
  }
  return { contentType, size, fileName };
}

export function validateHomepageSourceSignInput(
  input: HomepageSourceSignInput,
): { ok: true; contentType: string; safeExt: string } | { ok: false; status: number; error: string } {
  const contentType = input.contentType.trim().toLowerCase();
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  if (!Number.isInteger(input.size) || input.size < 0) {
    return { ok: false, status: 400, error: "invalid_file" };
  }
  if (input.size === 0) {
    return { ok: false, status: 400, error: "empty_file" };
  }
  if (input.size > HOMEPAGE_PHOTO_SOURCE_MAX_BYTES) {
    return { ok: false, status: 413, error: "file_too_large" };
  }

  const safeExt = resolveHomepageSourceExtension(contentType, input.fileName);
  if (!safeExt) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  return { ok: true, contentType, safeExt };
}

async function createHomepageSourceSignedUpload(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<
  | { ok: true; signedUrl: string; token: string; path: string }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error || !data?.token || !data.signedUrl || !data.path) {
    if (error?.message?.includes("Bucket not found")) {
      return { ok: false, status: 503, error: "storage_not_configured" };
    }
    console.error("[homepage-source/sign] createSignedUploadUrl failed");
    return { ok: false, status: 500, error: "sign_failed" };
  }

  return {
    ok: true,
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

export async function signHomepageSourceUpload(
  ctx: SpecialistMediaOkContext,
  input: HomepageSourceSignInput,
): Promise<HomepageSourceSignResult> {
  if (ctx.specialistStatus === "blocked") {
    return { ok: false, status: 403, body: { error: "forbidden" } };
  }

  const validated = validateHomepageSourceSignInput(input);
  if (!validated.ok) {
    return { ok: false, status: validated.status, body: { error: validated.error } };
  }

  const path = buildHomepageSourceStoragePath(ctx.specialistId, validated.safeExt);
  if (!isManagedHomepageSourcePath(path, ctx.specialistId)) {
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const signed = await createHomepageSourceSignedUpload(ctx.supabase, path);
  if (!signed.ok) {
    return { ok: false, status: signed.status, body: { error: signed.error } };
  }

  const sourceIdentity = homepageSourceIdentityFromPath(signed.path, ctx.specialistId);
  if (!sourceIdentity) {
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  return {
    ok: true,
    status: 200,
    body: {
      bucket: SPECIALIST_MEDIA_BUCKET,
      path: signed.path,
      token: signed.token,
      signedUrl: signed.signedUrl,
      source_identity: sourceIdentity,
      expires_in_seconds: HOMEPAGE_PHOTO_SOURCE_SIGNED_UPLOAD_TTL_SECONDS,
    },
  };
}

export async function handleHomepageSourceSignRequest(
  request: Request,
  resolveContext: ResolveMediaContext,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const ctx = await resolveContext(request);
  if (ctx.kind === "error") {
    return { status: ctx.status, body: ctx.body };
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseHomepageSourceSignBody(raw);
  if ("error" in parsed) {
    return { status: 400, body: { error: parsed.error } };
  }

  const result = await signHomepageSourceUpload(ctx, parsed);
  return { status: result.status, body: result.body };
}
