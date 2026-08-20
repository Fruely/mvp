import { SPECIALIST_MEDIA_BUCKET } from "@/lib/specialistMedia/types";

const PUBLIC_STORAGE_ROUTE_PREFIX = `/storage/v1/object/public/${SPECIALIST_MEDIA_BUCKET}/`;

/** Canonical Supabase project origin from configured public URL (same source as server client). */
export function resolveCanonicalSupabaseOrigin(
  configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const raw = typeof configuredUrl === "string" ? configuredUrl.trim() : "";
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function decodeUrlPathname(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function containsTraversalMarkers(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.includes("%2e%2e") || lower.includes("/../") || lower.includes("\\..");
}

function isValidManagedObjectPath(storagePath: string, specialistId: string): boolean {
  if (!storagePath || storagePath.includes("\0")) return false;
  if (storagePath.startsWith("/") || storagePath.endsWith("/")) return false;
  if (!storagePath.startsWith(`${specialistId}/`)) return false;
  if (storagePath.includes("..")) return false;

  const segments = storagePath.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return false;
  }

  return true;
}

export type ExtractManagedStoragePathOptions = {
  /** Test override; defaults to `NEXT_PUBLIC_SUPABASE_URL` origin. */
  canonicalOrigin?: string | null;
};

/**
 * Returns storage object path when URL belongs to canonical Freuly Supabase public origin
 * and path is under the authenticated specialist managed prefix.
 */
export function extractManagedStoragePath(
  publicUrl: string | null | undefined,
  specialistId: string,
  options: ExtractManagedStoragePathOptions = {},
): string | null {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  if (containsTraversalMarkers(trimmed)) return null;

  const canonicalOrigin =
    options.canonicalOrigin !== undefined
      ? options.canonicalOrigin
      : resolveCanonicalSupabaseOrigin();
  if (!canonicalOrigin) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.origin !== canonicalOrigin) return null;
  if (containsTraversalMarkers(parsed.pathname)) return null;

  const pathname = decodeUrlPathname(parsed.pathname);
  if (pathname == null) return null;
  if (!pathname.startsWith(PUBLIC_STORAGE_ROUTE_PREFIX)) return null;

  const storagePath = pathname.slice(PUBLIC_STORAGE_ROUTE_PREFIX.length);
  if (!isValidManagedObjectPath(storagePath, specialistId)) return null;

  return storagePath;
}
