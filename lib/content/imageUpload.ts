"use server";

import { randomUUID } from "node:crypto";
import { assertAdminSession } from "@/lib/adminSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CONTENT_IMAGES_BUCKET,
  resolveContentImageStoragePath,
} from "@/lib/content/contentImageStorage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ContentImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadContentImageAction(
  formData: FormData,
): Promise<ContentImageUploadResult> {
  await assertAdminSession();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "invalid_file" };
  }

  const mime = file.type.trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { ok: false, error: "unsupported_type" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "file_too_large" };
  }

  const ext = EXT_MAP[mime] || "jpg";
  const storagePath = `posts/${randomUUID()}.${ext}`;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.storage
    .from(CONTENT_IMAGES_BUCKET)
    .upload(storagePath, file, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    console.error("[content/imageUpload] upload failed", error);
    return { ok: false, error: "upload_failed" };
  }

  const { data: publicUrlData } = supabase.storage
    .from(CONTENT_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return { ok: true, url: publicUrlData.publicUrl };
}

export async function removeContentImageAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdminSession();

  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, error: "missing_url" };

  const storagePath = resolveContentImageStoragePath(url);
  if (!storagePath) return { ok: false, error: "invalid_url" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.storage.from(CONTENT_IMAGES_BUCKET).remove([storagePath]);

  if (error) {
    console.error("[content/imageUpload] remove failed", error);
    return { ok: false, error: "remove_failed" };
  }

  return { ok: true };
}
