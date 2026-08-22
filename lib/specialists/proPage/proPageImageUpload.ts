import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRO_PAGE_DRAFT_SELECT,
  mapDraftRowToEditorPayload,
  mapProPageDraftRowFromDb,
} from "@/lib/specialists/proPage/rowMapping";
import { draftFieldForProPageImageSlot, type ProPageEditorialImageSlot } from "@/lib/specialists/proPage/proPageImageSlots";

export const PRO_PAGE_IMAGE_BUCKET = "specialist-avatars";
export const PRO_PAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRO_PAGE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export function sanitizeProPageImageExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
}

export function buildProPageEditorialStoragePath(
  specialistId: string,
  slot: ProPageEditorialImageSlot,
  fileName: string,
): string {
  const folder = slot === "why_me" ? "why-me" : "final-cta";
  const safeExt = sanitizeProPageImageExtension(fileName);
  return `${specialistId}/pro/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
}

export function parseManagedProPageImageStoragePath(
  publicUrl: string,
  specialistId: string,
): string | null {
  const marker = `/storage/v1/object/public/${PRO_PAGE_IMAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split("?")[0] ?? "");
  if (!path.startsWith(`${specialistId}/pro/`)) return null;
  if (!path.includes("/why-me/") && !path.includes("/final-cta/")) return null;
  return path;
}

export function validateProPageImageFile(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (!PRO_PAGE_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof PRO_PAGE_IMAGE_ALLOWED_TYPES)[number])) {
    return { ok: false, error: "invalid_file_type" };
  }
  if (file.size > PRO_PAGE_IMAGE_MAX_BYTES) {
    return { ok: false, error: "file_too_large" };
  }
  return { ok: true };
}

async function readDraftImageUrl(
  service: SupabaseClient,
  specialistId: string,
  slot: ProPageEditorialImageSlot,
): Promise<string | null> {
  const field = draftFieldForProPageImageSlot(slot);
  const { data, error } = await service
    .from("specialist_pro_page_drafts")
    .select(field)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error || !data) return null;
  const value = (data as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function updateDraftImageUrl(
  service: SupabaseClient,
  specialistId: string,
  slot: ProPageEditorialImageSlot,
  url: string | null,
): Promise<
  | { ok: true; draft: ReturnType<typeof mapDraftRowToEditorPayload> }
  | { ok: false; status: number; error: string }
> {
  const field = draftFieldForProPageImageSlot(slot);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    [field]: url,
  };

  const { data, error } = await service
    .from("specialist_pro_page_drafts")
    .update(patch)
    .eq("specialist_id", specialistId)
    .select(PRO_PAGE_DRAFT_SELECT)
    .maybeSingle();

  if (error?.code === "42P01" || error?.message?.includes("specialist_pro_page_drafts")) {
    return { ok: false, status: 503, error: "pro_drafts_unavailable" };
  }
  if (error) {
    console.error("[proPage/images] draft update failed", error);
    return { ok: false, status: 500, error: "save_failed" };
  }
  if (!data) {
    return { ok: false, status: 404, error: "draft_not_found" };
  }

  const row = mapProPageDraftRowFromDb(data as Record<string, unknown>);
  if (!row) {
    return { ok: false, status: 500, error: "invalid_draft_row" };
  }

  return { ok: true, draft: mapDraftRowToEditorPayload(row) };
}

async function deleteManagedObjectIfOwned(
  service: SupabaseClient,
  specialistId: string,
  publicUrl: string | null,
): Promise<void> {
  if (!publicUrl) return;
  const path = parseManagedProPageImageStoragePath(publicUrl, specialistId);
  if (!path) return;
  const { error } = await service.storage.from(PRO_PAGE_IMAGE_BUCKET).remove([path]);
  if (error) {
    console.warn("[proPage/images] storage cleanup failed", { path, error: error.message });
  }
}

export type UploadProPageEditorialImageResult =
  | { ok: true; url: string; draft: ReturnType<typeof mapDraftRowToEditorPayload> }
  | { ok: false; status: number; error: string };

export async function uploadProPageEditorialImage(
  service: SupabaseClient,
  specialistId: string,
  slot: ProPageEditorialImageSlot,
  file: File,
): Promise<UploadProPageEditorialImageResult> {
  const validation = validateProPageImageFile(file);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  const previousUrl = await readDraftImageUrl(service, specialistId, slot);
  const path = buildProPageEditorialStoragePath(specialistId, slot, file.name);

  const { data: uploaded, error: uploadError } = await service.storage
    .from(PRO_PAGE_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message?.includes("Bucket not found")) {
      return { ok: false, status: 503, error: "storage_not_configured" };
    }
    console.error("[proPage/images] upload failed", uploadError);
    return { ok: false, status: 500, error: "upload_failed" };
  }

  const { data: urlData } = service.storage.from(PRO_PAGE_IMAGE_BUCKET).getPublicUrl(uploaded.path);
  const publicUrl = urlData.publicUrl;

  const draftResult = await updateDraftImageUrl(service, specialistId, slot, publicUrl);
  if (!draftResult.ok) {
    await service.storage.from(PRO_PAGE_IMAGE_BUCKET).remove([uploaded.path]);
    return draftResult;
  }

  if (previousUrl && previousUrl !== publicUrl) {
    await deleteManagedObjectIfOwned(service, specialistId, previousUrl);
  }

  return { ok: true, url: publicUrl, draft: draftResult.draft };
}

export type RemoveProPageEditorialImageResult =
  | { ok: true; draft: ReturnType<typeof mapDraftRowToEditorPayload> }
  | { ok: false; status: number; error: string };

export async function removeProPageEditorialImage(
  service: SupabaseClient,
  specialistId: string,
  slot: ProPageEditorialImageSlot,
): Promise<RemoveProPageEditorialImageResult> {
  const previousUrl = await readDraftImageUrl(service, specialistId, slot);
  const draftResult = await updateDraftImageUrl(service, specialistId, slot, null);
  if (!draftResult.ok) {
    return draftResult;
  }

  await deleteManagedObjectIfOwned(service, specialistId, previousUrl);
  return { ok: true, draft: draftResult.draft };
}
