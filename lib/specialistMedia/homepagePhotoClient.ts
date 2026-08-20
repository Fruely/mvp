import { getSupabase } from "@/lib/supabaseClient";
import { SPECIALIST_MEDIA_BUCKET } from "@/lib/specialistMedia/types";
import {
  HOMEPAGE_PHOTO_SOURCE_MAX_BYTES,
  parseHomepagePhotoMetadata,
  type HomepagePhotoMetadata,
} from "@/lib/specialists/homepagePhoto";

export const HOMEPAGE_SOURCE_SIGN_PATH = "/api/specialist/media/homepage-source/sign";
export const HOMEPAGE_PHOTO_GENERATE_PATH = "/api/specialist/media/homepage-photo";

export const HOMEPAGE_SOURCE_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type HomepagePhotoCropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HomepagePhotoSavedSnapshot = {
  photo_source_url: string;
  homepage_photo_url: string;
  homepage_photo: HomepagePhotoMetadata;
};

export type HomepageSourceSignSuccess = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  source_identity: string;
  expires_in_seconds: number;
};

export type HomepagePhotoGenerateSuccess = HomepagePhotoSavedSnapshot & {
  state: "ready";
};

export type HomepagePhotoClientError = {
  ok: false;
  status: number;
  error: string;
};

export type HomepagePhotoFetch = (
  input: string,
  init?: RequestInit,
) => Promise<{ status: number; json: () => Promise<unknown> }>;

export type HomepagePhotoUploadToSignedUrl = (
  path: string,
  token: string,
  file: File,
) => Promise<{ error: { message?: string } | null }>;

export type HomepagePhotoClientDeps = {
  fetch?: HomepagePhotoFetch;
  uploadToSignedUrl?: HomepagePhotoUploadToSignedUrl;
};

function defaultFetch(input: string, init?: RequestInit) {
  return fetch(input, init);
}

async function defaultUploadToSignedUrl(path: string, token: string, file: File) {
  const { error } = await getSupabase()
    .storage.from(SPECIALIST_MEDIA_BUCKET)
    .uploadToSignedUrl(path, token, file);
  return { error };
}

export function validateHomepageSourceFile(
  file: File | null | undefined,
): { ok: true } | { ok: false; error: "empty_file" | "unsupported_media_type" | "file_too_large" } {
  if (!file || !(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "empty_file" };
  }
  const mime = file.type.trim().toLowerCase();
  if (!HOMEPAGE_SOURCE_ALLOWED_MIME.has(mime)) {
    return { ok: false, error: "unsupported_media_type" };
  }
  if (file.size > HOMEPAGE_PHOTO_SOURCE_MAX_BYTES) {
    return { ok: false, error: "file_too_large" };
  }
  return { ok: true };
}

export function buildHomepageSourceSignRequest(file: File): {
  fileName: string;
  contentType: string;
  size: number;
} {
  return {
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  };
}

export function buildHomepagePhotoGenerateBody(input: {
  source_identity: string;
  crop: HomepagePhotoCropPixels;
  zoom: number;
  expectedUpdatedAt?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    source_identity: input.source_identity,
    crop: {
      x: input.crop.x,
      y: input.crop.y,
      width: input.crop.width,
      height: input.crop.height,
    },
    zoom: input.zoom,
  };
  if (input.expectedUpdatedAt !== undefined) {
    body.expected_homepage_photo_updated_at = input.expectedUpdatedAt;
  }
  return body;
}

function readErrorCode(raw: unknown): string {
  if (raw && typeof raw === "object" && typeof (raw as { error?: unknown }).error === "string") {
    return (raw as { error: string }).error;
  }
  return "server_error";
}

function thrownNetworkError(error: "sign_failed" | "upload_failed" | "generation_failed"): HomepagePhotoClientError {
  return { ok: false, status: 0, error };
}

export function homepagePhotoErrorMessageKey(error: string): string {
  switch (error) {
    case "unauthorized":
      return "dashboard.homepagePhoto.errors.unauthorized";
    case "forbidden":
    case "specialist_required":
      return "dashboard.homepagePhoto.errors.forbidden";
    case "unsupported_media_type":
    case "unsupported_image":
      return "dashboard.homepagePhoto.errors.unsupported";
    case "file_too_large":
    case "source_too_large":
      return "dashboard.homepagePhoto.errors.tooLarge";
    case "empty_file":
      return "dashboard.homepagePhoto.errors.empty";
    case "sign_failed":
    case "storage_not_configured":
      return "dashboard.homepagePhoto.errors.signFailed";
    case "upload_failed":
    case "storage_failed":
      return "dashboard.homepagePhoto.errors.uploadFailed";
    case "invalid_source_identity":
    case "source_not_found":
    case "invalid_request":
      return "dashboard.homepagePhoto.errors.invalidSource";
    case "corrupt_image":
      return "dashboard.homepagePhoto.errors.corrupt";
    case "insufficient_dimensions":
      return "dashboard.homepagePhoto.errors.insufficient";
    case "invalid_crop":
    case "invalid_crop_aspect":
      return "dashboard.homepagePhoto.errors.invalidCrop";
    case "stale_save":
      return "dashboard.homepagePhoto.errors.staleSave";
    case "stale_source":
      return "dashboard.homepagePhoto.errors.staleSource";
    case "generation_failed":
    case "persistence_failed":
      return "dashboard.homepagePhoto.errors.generateFailed";
    default:
      return "dashboard.homepagePhoto.errors.generic";
  }
}

export async function signHomepageSourceUpload(
  file: File,
  deps: HomepagePhotoClientDeps = {},
): Promise<{ ok: true; body: HomepageSourceSignSuccess } | HomepagePhotoClientError> {
  try {
    const fetchImpl = deps.fetch ?? defaultFetch;
    const res = await fetchImpl(HOMEPAGE_SOURCE_SIGN_PATH, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildHomepageSourceSignRequest(file)),
    });
    const raw = await res.json().catch(() => null);
    if (!res.status || res.status >= 400) {
      return { ok: false, status: res.status || 500, error: readErrorCode(raw) };
    }
    const row = raw as Record<string, unknown>;
    if (
      typeof row.path !== "string" ||
      typeof row.token !== "string" ||
      typeof row.source_identity !== "string" ||
      typeof row.signedUrl !== "string"
    ) {
      return { ok: false, status: 500, error: "sign_failed" };
    }
    return {
      ok: true,
      body: {
        bucket: typeof row.bucket === "string" ? row.bucket : SPECIALIST_MEDIA_BUCKET,
        path: row.path,
        token: row.token,
        signedUrl: row.signedUrl,
        source_identity: row.source_identity,
        expires_in_seconds: typeof row.expires_in_seconds === "number" ? row.expires_in_seconds : 7200,
      },
    };
  } catch {
    return thrownNetworkError("sign_failed");
  }
}

export async function uploadHomepageSourceToSignedUrl(
  input: { path: string; token: string; file: File },
  deps: HomepagePhotoClientDeps = {},
): Promise<{ ok: true } | HomepagePhotoClientError> {
  try {
    const upload = deps.uploadToSignedUrl ?? defaultUploadToSignedUrl;
    const { error } = await upload(input.path, input.token, input.file);
    if (error) {
      return { ok: false, status: 500, error: "upload_failed" };
    }
    return { ok: true };
  } catch {
    return thrownNetworkError("upload_failed");
  }
}

/**
 * Client validation → sign → direct Storage upload.
 * Does not write DB. Does not generate a homepage derivative.
 */
export async function uploadNewHomepageSource(
  file: File,
  deps: HomepagePhotoClientDeps = {},
): Promise<
  | { ok: true; source_identity: string; path: string }
  | HomepagePhotoClientError
> {
  const validated = validateHomepageSourceFile(file);
  if (!validated.ok) {
    return {
      ok: false,
      status: validated.error === "file_too_large" ? 413 : validated.error === "unsupported_media_type" ? 415 : 400,
      error: validated.error,
    };
  }

  const signed = await signHomepageSourceUpload(file, deps);
  if (!signed.ok) return signed;

  const uploaded = await uploadHomepageSourceToSignedUrl(
    { path: signed.body.path, token: signed.body.token, file },
    deps,
  );
  if (!uploaded.ok) return uploaded;

  return { ok: true, source_identity: signed.body.source_identity, path: signed.body.path };
}

export function parseHomepagePhotoGenerateSuccess(raw: unknown): HomepagePhotoGenerateSuccess | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.state !== "ready") return null;
  if (typeof row.photo_source_url !== "string" || !row.photo_source_url) return null;
  if (typeof row.homepage_photo_url !== "string" || !row.homepage_photo_url) return null;
  const metadata = parseHomepagePhotoMetadata(row.homepage_photo);
  if (!metadata) return null;
  return {
    photo_source_url: row.photo_source_url,
    homepage_photo_url: row.homepage_photo_url,
    homepage_photo: metadata,
    state: "ready",
  };
}

export async function generateHomepagePhotoFromEditor(
  input: {
    source_identity: string;
    crop: HomepagePhotoCropPixels;
    zoom: number;
    expectedUpdatedAt?: string | null;
  },
  deps: HomepagePhotoClientDeps = {},
): Promise<{ ok: true; body: HomepagePhotoGenerateSuccess } | HomepagePhotoClientError> {
  try {
    const fetchImpl = deps.fetch ?? defaultFetch;
    const res = await fetchImpl(HOMEPAGE_PHOTO_GENERATE_PATH, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildHomepagePhotoGenerateBody(input)),
    });
    const raw = await res.json().catch(() => null);
    if (!res.status || res.status >= 400) {
      return { ok: false, status: res.status || 500, error: readErrorCode(raw) };
    }
    const parsed = parseHomepagePhotoGenerateSuccess(raw);
    if (!parsed) {
      return { ok: false, status: 500, error: "generation_failed" };
    }
    return { ok: true, body: parsed };
  } catch {
    return thrownNetworkError("generation_failed");
  }
}
