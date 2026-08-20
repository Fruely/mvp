import type { PhotoBox, PhotoFocus } from "@/components/specialist/specialistMainPhotoFit";
import { extractManagedStoragePath } from "@/lib/specialistMedia/storagePath";

export const PHOTO_FOCUS_VERSION = 1;
export const PHOTO_FOCUS_ALGORITHM = "coco-ssd+blazeface";
export const PHOTO_FOCUS_COLUMN = "photo_focus";

const BOX_EPSILON = 1e-4;

export type StoredPhotoBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type StoredPhotoFocus = {
  version: number;
  algorithm: string;
  source: "auto" | "manual";
  status: "ok" | "unusable";
  focal_x: number | null;
  focal_y: number | null;
  subject: StoredPhotoBox | null;
  face: StoredPhotoBox | null;
  confidence: number | null;
  image_width: number;
  image_height: number;
  photo_identity: string;
  analyzed_at: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidBox(box: unknown): box is StoredPhotoBox {
  if (!box || typeof box !== "object") return false;
  const candidate = box as StoredPhotoBox;
  if (![candidate.x, candidate.y, candidate.w, candidate.h].every(isFiniteNumber)) return false;
  if (candidate.w <= BOX_EPSILON || candidate.h <= BOX_EPSILON) return false;
  if (candidate.x < -BOX_EPSILON || candidate.y < -BOX_EPSILON) return false;
  if (candidate.x + candidate.w > 1 + BOX_EPSILON || candidate.y + candidate.h > 1 + BOX_EPSILON) {
    return false;
  }
  return true;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Stable identity for the MAIN photo currently referenced by a URL.
 * Prefers the managed Storage object path (unique per upload). Falls back to
 * origin+pathname for rare external URLs. Query/hash are ignored.
 */
export function photoIdentityFromUrl(
  publicUrl: string | null | undefined,
  specialistId: string,
  options?: { canonicalOrigin?: string | null },
): string | null {
  const url = normalizeUrl(publicUrl);
  if (!url) return null;

  const storagePath = extractManagedStoragePath(url, specialistId, options);
  if (storagePath) return `storage:${storagePath}`;

  try {
    const parsed = new URL(url);
    return `url:${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function photoIdentityFromStoragePath(storagePath: string): string {
  return `storage:${storagePath}`;
}

export function photoFocusClearPatch(): { photo_focus: null } {
  return { photo_focus: null };
}

export function photoIdentityChanged(
  specialistId: string,
  previousUrl: string | null | undefined,
  nextUrl: string | null | undefined,
  options?: { canonicalOrigin?: string | null },
): boolean {
  return (
    photoIdentityFromUrl(previousUrl, specialistId, options) !==
    photoIdentityFromUrl(nextUrl, specialistId, options)
  );
}

function parsePositiveInt(value: unknown): number | null {
  if (!isFiniteNumber(value) || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

/**
 * Parse a DB jsonb value. Unknown shapes, versions, and algorithms return null
 * (callers must contain). Status "unusable" is a durable failed-analysis stamp.
 */
export function parseStoredPhotoFocus(value: unknown): StoredPhotoFocus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;

  if (row.version !== PHOTO_FOCUS_VERSION) return null;
  if (typeof row.algorithm !== "string" || row.algorithm !== PHOTO_FOCUS_ALGORITHM) return null;
  if (row.source !== "auto" && row.source !== "manual") return null;
  if (row.status !== "ok" && row.status !== "unusable") return null;
  if (typeof row.photo_identity !== "string" || !row.photo_identity.trim()) return null;
  if (typeof row.analyzed_at !== "string" || !row.analyzed_at.trim()) return null;

  const imageWidth = parsePositiveInt(row.image_width);
  const imageHeight = parsePositiveInt(row.image_height);
  if (imageWidth == null || imageHeight == null) return null;

  const subject = row.subject == null ? null : isValidBox(row.subject) ? row.subject : null;
  if (row.subject != null && subject == null) return null;
  const face = row.face == null ? null : isValidBox(row.face) ? row.face : null;
  if (row.face != null && face == null) return null;

  const focalX = row.focal_x == null ? null : isFiniteNumber(row.focal_x) ? row.focal_x : null;
  const focalY = row.focal_y == null ? null : isFiniteNumber(row.focal_y) ? row.focal_y : null;
  if (row.focal_x != null && focalX == null) return null;
  if (row.focal_y != null && focalY == null) return null;
  if (focalX != null && (focalX < 0 || focalX > 1)) return null;
  if (focalY != null && (focalY < 0 || focalY > 1)) return null;

  const confidence =
    row.confidence == null ? null : isFiniteNumber(row.confidence) ? row.confidence : null;
  if (row.confidence != null && confidence == null) return null;

  if (row.status === "ok") {
    if (focalX == null || focalY == null) return null;
    if (!subject && !face) return null;
  }

  return {
    version: PHOTO_FOCUS_VERSION,
    algorithm: PHOTO_FOCUS_ALGORITHM,
    source: row.source,
    status: row.status,
    focal_x: focalX,
    focal_y: focalY,
    subject,
    face,
    confidence,
    image_width: imageWidth,
    image_height: imageHeight,
    photo_identity: row.photo_identity.trim(),
    analyzed_at: row.analyzed_at,
  };
}

export function imageAspectFromStored(stored: StoredPhotoFocus): number | null {
  const width = stored.image_width;
  const height = stored.image_height;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (!(width > 0) || !(height > 0)) return null;
  const aspect = width / height;
  return Number.isFinite(aspect) && aspect > 0 ? aspect : null;
}

/**
 * Trusted PhotoFocus for the resolver, or null when metadata must be ignored.
 * Does not consult the cover feature gate — callers decide whether to pass this through.
 */
export function photoFocusForDisplayedUrl(input: {
  stored: unknown;
  displayedUrl: string | null | undefined;
  specialistId: string;
  canonicalOrigin?: string | null;
}): PhotoFocus | null {
  const stored = parseStoredPhotoFocus(input.stored);
  if (!stored || stored.status !== "ok") return null;

  const displayedIdentity = photoIdentityFromUrl(input.displayedUrl, input.specialistId, {
    canonicalOrigin: input.canonicalOrigin,
  });
  if (!displayedIdentity || displayedIdentity !== stored.photo_identity) return null;

  if (stored.focal_x == null || stored.focal_y == null) return null;

  const focus: PhotoFocus = {
    focalX: stored.focal_x,
    focalY: stored.focal_y,
    confidence: stored.confidence ?? 0,
    source: stored.source,
    subject: stored.subject as PhotoBox | null,
    face: stored.face as PhotoBox | null,
  };
  return focus;
}

export function buildUnusablePhotoFocus(input: {
  photoIdentity: string;
  imageWidth: number;
  imageHeight: number;
  analyzedAt?: string;
}): StoredPhotoFocus {
  return {
    version: PHOTO_FOCUS_VERSION,
    algorithm: PHOTO_FOCUS_ALGORITHM,
    source: "auto",
    status: "unusable",
    focal_x: null,
    focal_y: null,
    subject: null,
    face: null,
    confidence: 0,
    image_width: input.imageWidth,
    image_height: input.imageHeight,
    photo_identity: input.photoIdentity,
    analyzed_at: input.analyzedAt ?? new Date().toISOString(),
  };
}
