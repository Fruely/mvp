import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const CONTENT_IMAGES_BUCKET = "content-images";

export function resolveContentImageStoragePath(url: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const prefix = `${supabaseUrl}/storage/v1/object/public/${CONTENT_IMAGES_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;

  const storagePath = url.slice(prefix.length);
  if (!storagePath || storagePath.includes("..")) return null;

  return storagePath;
}

async function removeContentImageAtPath(storagePath: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.storage.from(CONTENT_IMAGES_BUCKET).remove([storagePath]);

  if (error) {
    console.error("[content/contentImageStorage] remove failed", error);
    return { ok: false, error: "remove_failed" };
  }

  return { ok: true };
}

export async function removeOwnedContentImageByUrl(
  heroImageUrl: string | null | undefined,
): Promise<void> {
  if (!heroImageUrl) return;

  const storagePath = resolveContentImageStoragePath(heroImageUrl.trim());
  if (!storagePath) return;

  const result = await removeContentImageAtPath(storagePath);
  if (!result.ok) {
    console.warn("[content/contentImageStorage] post-delete image cleanup failed", {
      storagePath,
      error: result.error,
    });
  }
}
