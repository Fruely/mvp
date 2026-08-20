import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SPECIALIST_MEDIA_ALLOWED_TYPES,
  SPECIALIST_MEDIA_BUCKET,
  SPECIALIST_MEDIA_MAX_BYTES,
} from "@/lib/specialistMedia/types";
import {
  extractManagedStoragePath,
  resolveCanonicalSupabaseOrigin,
  type ExtractManagedStoragePathOptions,
} from "@/lib/specialistMedia/storagePath";

export {
  extractManagedStoragePath,
  resolveCanonicalSupabaseOrigin,
  type ExtractManagedStoragePathOptions,
};

const SAFE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export type UploadValidationResult =
  | { ok: true; contentType: string; safeExt: string }
  | { ok: false; status: number; error: string };

export function resolveSafeExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return SAFE_EXTENSIONS.has(ext) ? ext : "jpg";
}

export function validateSpecialistMediaUpload(file: File): UploadValidationResult {
  if (!file || !(file instanceof File)) {
    return { ok: false, status: 400, error: "invalid_file" };
  }

  const contentType = file.type.trim().toLowerCase();
  if (!SPECIALIST_MEDIA_ALLOWED_TYPES.includes(contentType as (typeof SPECIALIST_MEDIA_ALLOWED_TYPES)[number])) {
    return { ok: false, status: 415, error: "unsupported_media_type" };
  }

  if (file.size > SPECIALIST_MEDIA_MAX_BYTES) {
    return { ok: false, status: 413, error: "file_too_large" };
  }

  return { ok: true, contentType, safeExt: resolveSafeExtension(file.name) };
}

export function buildProfilePhotoStoragePath(specialistId: string, safeExt: string): string {
  return `${specialistId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
}

export function buildGalleryStoragePath(specialistId: string, safeExt: string): string {
  return `${specialistId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
}

export function buildHomepageSourceStoragePath(specialistId: string, safeExt: string): string {
  return `${specialistId}/source/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
}

export function buildHomepageOutputStoragePath(specialistId: string): string {
  return `${specialistId}/homepage/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

export function buildIdempotentGalleryStoragePath(
  specialistId: string,
  idempotencyKey: string,
  safeExt: string,
): string {
  const digest = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 16);
  return `${specialistId}/gallery/idempotent/${digest}.${safeExt}`;
}

export function getPublicUrlForStoragePath(supabase: SupabaseClient, storagePath: string): string {
  const { data } = supabase.storage.from(SPECIALIST_MEDIA_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadSpecialistMediaObject(
  supabase: SupabaseClient,
  storagePath: string,
  file: File,
  contentType: string,
  upsert = false,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase.storage.from(SPECIALIST_MEDIA_BUCKET).upload(storagePath, file, {
    contentType,
    cacheControl: "3600",
    upsert,
  });

  if (error) {
    if (error.message?.includes("Bucket not found")) {
      return { ok: false, status: 503, error: "storage_not_configured" };
    }
    return { ok: false, status: 500, error: "upload_failed" };
  }

  return {
    ok: true,
    path: data.path,
    publicUrl: getPublicUrlForStoragePath(supabase, data.path),
  };
}

export async function uploadSpecialistMediaBytes(
  supabase: SupabaseClient,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
  upsert = false,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase.storage.from(SPECIALIST_MEDIA_BUCKET).upload(storagePath, bytes, {
    contentType,
    cacheControl: "3600",
    upsert,
  });

  if (error) {
    if (error.message?.includes("Bucket not found")) {
      return { ok: false, status: 503, error: "storage_not_configured" };
    }
    return { ok: false, status: 500, error: "storage_failed" };
  }

  return {
    ok: true,
    path: data.path,
    publicUrl: getPublicUrlForStoragePath(supabase, data.path),
  };
}

export async function deleteManagedStoragePaths(
  supabase: SupabaseClient,
  paths: Array<string | null | undefined>,
): Promise<void> {
  const unique = Array.from(
    new Set(paths.filter((path): path is string => typeof path === "string" && path.length > 0)),
  );
  if (unique.length === 0) return;

  const { error } = await supabase.storage.from(SPECIALIST_MEDIA_BUCKET).remove(unique);
  if (error) {
    console.warn("[specialistMedia/storage] delete failed", error.message);
  }
}

export async function ensureSpecialistProfileRow(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("specialist_profiles")
    .select("specialist_id")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (profileLookupError) {
    console.error("[specialistMedia] profile lookup failed", profileLookupError.message);
    return { ok: false, status: 500, error: "server_error" };
  }

  if (existingProfile?.specialist_id) {
    return { ok: true };
  }

  const { error: profileCreateError } = await supabase.from("specialist_profiles").insert({
    specialist_id: specialistId,
    created_at: new Date().toISOString(),
  });

  if (profileCreateError) {
    console.error("[specialistMedia] profile create failed", profileCreateError.message);
    return { ok: false, status: 500, error: "server_error" };
  }

  return { ok: true };
}
