import { extractManagedStoragePath } from "@/lib/specialistMedia/storagePath";
import { photoIdentityFromStoragePath } from "@/lib/specialists/photoFocusMetadata";

export const HOMEPAGE_PHOTO_VERSION = 1;
export const HOMEPAGE_PHOTO_RATIO = "31:20";
export const HOMEPAGE_PHOTO_OUTPUT_WIDTH = 1550;
export const HOMEPAGE_PHOTO_OUTPUT_HEIGHT = 1000;
export const HOMEPAGE_PHOTO_SOURCE_KIND = "source";
export const HOMEPAGE_PHOTO_OUTPUT_KIND = "homepage";

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export type HomepagePhotoCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HomepagePhotoMetadata = {
  version: 1;
  ratio: "31:20";
  output_width: 1550;
  output_height: 1000;
  source_identity: string;
  output_identity: string;
  crop: HomepagePhotoCrop;
  zoom: number;
  updated_at: string;
};

export type HomepagePhotoKind = "source" | "homepage";

export type HomepagePhotoState =
  | {
      kind: "ready";
      metadata: HomepagePhotoMetadata;
      sourceIdentity: string;
      outputIdentity: string;
    }
  | { kind: "missing" }
  | {
      kind: "stale";
      metadata: HomepagePhotoMetadata;
      sourceIdentity: string;
      outputIdentity: string;
    }
  | { kind: "invalid" };

export type HomepagePhotoIdentityOptions = {
  canonicalOrigin?: string | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 1;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function isManagedKindPath(storagePath: string, specialistId: string, kind: HomepagePhotoKind): boolean {
  const prefix = `${specialistId}/${kind}/`;
  if (!storagePath.startsWith(prefix)) return false;
  const rest = storagePath.slice(prefix.length);
  if (!rest || rest.includes("..")) return false;
  return rest.split("/").every((segment) => segment.length > 0);
}

/**
 * Managed Storage identity for homepage source or derivative URLs.
 * Reuses photoIdentityFromStoragePath (`storage:{path}`).
 * Unlike photoIdentityFromUrl, this does not fall back to external `url:` identities
 * and requires the `{specialistId}/source/` or `{specialistId}/homepage/` prefix.
 */
export function homepagePhotoIdentityFromUrl(
  publicUrl: string | null | undefined,
  specialistId: string,
  kind: HomepagePhotoKind,
  options?: HomepagePhotoIdentityOptions,
): string | null {
  const url = normalizeUrl(publicUrl);
  if (!url || !specialistId) return null;

  const storagePath = extractManagedStoragePath(url, specialistId, options);
  if (!storagePath) return null;
  if (!isManagedKindPath(storagePath, specialistId, kind)) return null;
  return photoIdentityFromStoragePath(storagePath);
}

export function parseHomepagePhotoMetadata(value: unknown): HomepagePhotoMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;

  if (row.version !== HOMEPAGE_PHOTO_VERSION) return null;
  if (row.ratio !== HOMEPAGE_PHOTO_RATIO) return null;
  if (row.output_width !== HOMEPAGE_PHOTO_OUTPUT_WIDTH) return null;
  if (row.output_height !== HOMEPAGE_PHOTO_OUTPUT_HEIGHT) return null;

  if (typeof row.source_identity !== "string" || !row.source_identity.trim()) return null;
  if (typeof row.output_identity !== "string" || !row.output_identity.trim()) return null;
  if (!isFiniteNumber(row.zoom) || !(row.zoom > 0)) return null;
  if (!isValidIsoTimestamp(row.updated_at)) return null;

  const crop = row.crop;
  if (!crop || typeof crop !== "object" || Array.isArray(crop)) return null;
  const cropRow = crop as Record<string, unknown>;
  if (!isNonNegativeInteger(cropRow.x) || !isNonNegativeInteger(cropRow.y)) return null;
  if (!isPositiveInteger(cropRow.width) || !isPositiveInteger(cropRow.height)) return null;

  return {
    version: HOMEPAGE_PHOTO_VERSION,
    ratio: HOMEPAGE_PHOTO_RATIO,
    output_width: HOMEPAGE_PHOTO_OUTPUT_WIDTH,
    output_height: HOMEPAGE_PHOTO_OUTPUT_HEIGHT,
    source_identity: row.source_identity.trim(),
    output_identity: row.output_identity.trim(),
    crop: {
      x: cropRow.x,
      y: cropRow.y,
      width: cropRow.width,
      height: cropRow.height,
    },
    zoom: row.zoom,
    updated_at: row.updated_at,
  };
}

/**
 * Authoritative homepage-photo readiness.
 * MAIN fields (avatar_url / photo_url / photo_focus) are intentionally not inputs.
 *
 * missing  — no homepage URL and/or no stored metadata
 * invalid  — malformed metadata, unmanaged/wrong-kind URLs, or output identity mismatch
 * stale    — metadata+output are valid, but source identity does not match current source URL
 * ready    — metadata parses and both identities match current URLs
 */
export function resolveHomepagePhotoState(input: {
  specialistId: string;
  photoSourceUrl: string | null | undefined;
  homepagePhotoUrl: string | null | undefined;
  storedMetadata: unknown;
  canonicalOrigin?: string | null;
}): HomepagePhotoState {
  const homepagePhotoUrl = normalizeUrl(input.homepagePhotoUrl);
  const hasMetadata = input.storedMetadata != null;
  if (!homepagePhotoUrl || !hasMetadata) return { kind: "missing" };

  const metadata = parseHomepagePhotoMetadata(input.storedMetadata);
  if (!metadata) return { kind: "invalid" };

  const identityOptions = { canonicalOrigin: input.canonicalOrigin };
  const outputIdentity = homepagePhotoIdentityFromUrl(
    homepagePhotoUrl,
    input.specialistId,
    HOMEPAGE_PHOTO_OUTPUT_KIND,
    identityOptions,
  );
  if (!outputIdentity || outputIdentity !== metadata.output_identity) {
    return { kind: "invalid" };
  }

  const photoSourceUrl = normalizeUrl(input.photoSourceUrl);
  if (!photoSourceUrl) return { kind: "invalid" };

  const sourceIdentity = homepagePhotoIdentityFromUrl(
    photoSourceUrl,
    input.specialistId,
    HOMEPAGE_PHOTO_SOURCE_KIND,
    identityOptions,
  );
  if (!sourceIdentity) return { kind: "invalid" };
  if (sourceIdentity !== metadata.source_identity) {
    return {
      kind: "stale",
      metadata,
      sourceIdentity,
      outputIdentity,
    };
  }

  return {
    kind: "ready",
    metadata,
    sourceIdentity,
    outputIdentity,
  };
}

export function isHomepagePhotoReady(
  input: Parameters<typeof resolveHomepagePhotoState>[0],
): boolean {
  return resolveHomepagePhotoState(input).kind === "ready";
}

/**
 * Future source-replacement mutation patch (not applied in this phase).
 *
 * When photo_source_url is intentionally replaced:
 * - set homepage_photo_url = null
 * - set homepage_photo = null
 * - do not delete old Storage objects in the initial rollout
 * - do not touch avatar_url / photo_url unless this is a separate MAIN-photo action
 *
 * Prefer nulling stale homepage pointers over retaining them.
 */
export function homepagePhotoClearOnSourceReplacePatch(): {
  homepage_photo_url: null;
  homepage_photo: null;
} {
  return {
    homepage_photo_url: null,
    homepage_photo: null,
  };
}

/**
 * Deterministic integer crop for a later Sharp extract.
 * Crop values are source pixels after EXIF orientation.
 * Does not resize or inspect image bytes.
 *
 * Rounding: Math.round on x/y/width/height, then clamp into the source box.
 */
export function normalizeHomepagePhotoCrop(input: {
  sourceWidth: number;
  sourceHeight: number;
  crop: { x: number; y: number; width: number; height: number };
}): HomepagePhotoCrop | null {
  const sourceWidth = input.sourceWidth;
  const sourceHeight = input.sourceHeight;
  const { x: rawX, y: rawY, width: rawWidth, height: rawHeight } = input.crop;

  if (![sourceWidth, sourceHeight, rawX, rawY, rawWidth, rawHeight].every(isFiniteNumber)) {
    return null;
  }
  if (!Number.isInteger(sourceWidth) || !Number.isInteger(sourceHeight)) return null;
  if (sourceWidth < 1 || sourceHeight < 1) return null;

  let x = Math.round(rawX);
  let y = Math.round(rawY);
  let width = Math.round(rawWidth);
  let height = Math.round(rawHeight);

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x >= sourceWidth || y >= sourceHeight) return null;

  if (x + width > sourceWidth) width = sourceWidth - x;
  if (y + height > sourceHeight) height = sourceHeight - y;
  if (width < 1 || height < 1) return null;

  return { x, y, width, height };
}
