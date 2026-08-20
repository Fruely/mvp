import {
  HOMEPAGE_PHOTO_RATIO_HEIGHT,
  HOMEPAGE_PHOTO_RATIO_WIDTH,
  resolveHomepagePhotoState,
} from "@/lib/specialists/homepagePhoto";
import type {
  HomepagePhotoCropPixels,
  HomepagePhotoSavedSnapshot,
} from "@/lib/specialistMedia/homepagePhotoClient";

export const HOMEPAGE_PHOTO_CROP_ASPECT = HOMEPAGE_PHOTO_RATIO_WIDTH / HOMEPAGE_PHOTO_RATIO_HEIGHT;

export const HOMEPAGE_PHOTO_EDITOR_DEFAULT_CROP = { x: 0, y: 0 };
export const HOMEPAGE_PHOTO_EDITOR_DEFAULT_ZOOM = 1;
export const HOMEPAGE_PHOTO_EDITOR_MIN_ZOOM = 1;
export const HOMEPAGE_PHOTO_EDITOR_MAX_ZOOM = 4;

/**
 * Crop reconstruction limitation (Phase 3):
 *
 * Stored `homepage_photo.crop` is Sharp pixels AFTER EXIF orientation.
 * react-easy-crop can take `initialCroppedAreaPixels` (library-owned conversion
 * from pixel crop → pan/zoom). We use that when reopening a persisted source.
 *
 * We do NOT invent inverse math from pixel crop → percent-offset crop.
 *
 * Remaining gap: the browser-decoded source may not match Sharp's oriented
 * pixels (EXIF). If that happens, the cropper opens at a best-effort restore
 * or default contain-fit. The saved homepage derivative is kept until the
 * user explicitly saves. Save stays disabled until the user dirties the editor.
 */
export const HOMEPAGE_PHOTO_CROP_RECONSTRUCTION_LIMITATION =
  "Browser-decoded source pixels may differ from Sharp EXIF-oriented crop pixels; saved derivative is kept until explicit save.";

export type HomepagePhotoEditorStatus =
  | "empty"
  | "ready"
  | "uploading"
  | "saving"
  | "success"
  | "error";

export type HomepagePhotoEditorState = {
  saved: HomepagePhotoSavedSnapshot | null;
  workingImageUrl: string | null;
  workingSourceIdentity: string | null;
  workingObjectUrl: string | null;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: HomepagePhotoCropPixels | null;
  initialCroppedAreaPixels: HomepagePhotoCropPixels | null;
  dirty: boolean;
  status: HomepagePhotoEditorStatus;
  error: string | null;
  sourceEpoch: number;
};

export function createHomepagePhotoEditorState(input: {
  specialistId: string;
  initialSourceUrl?: string | null;
  initialHomepagePhotoUrl?: string | null;
  initialMetadata?: unknown;
  canonicalOrigin?: string | null;
}): HomepagePhotoEditorState {
  const resolved = resolveHomepagePhotoState({
    specialistId: input.specialistId,
    photoSourceUrl: input.initialSourceUrl,
    homepagePhotoUrl: input.initialHomepagePhotoUrl,
    storedMetadata: input.initialMetadata,
    canonicalOrigin: input.canonicalOrigin,
  });

  if (resolved.kind === "ready") {
    const metadata = resolved.metadata;
    const sourceUrl = input.initialSourceUrl?.trim() || null;
    return {
      saved: {
        photo_source_url: input.initialSourceUrl as string,
        homepage_photo_url: input.initialHomepagePhotoUrl as string,
        homepage_photo: metadata,
      },
      workingImageUrl: sourceUrl,
      workingSourceIdentity: metadata.source_identity,
      workingObjectUrl: null,
      crop: { ...HOMEPAGE_PHOTO_EDITOR_DEFAULT_CROP },
      zoom: metadata.zoom,
      croppedAreaPixels: null,
      initialCroppedAreaPixels: { ...metadata.crop },
      dirty: false,
      status: "ready",
      error: null,
      sourceEpoch: 0,
    };
  }

  return {
    saved: null,
    workingImageUrl: null,
    workingSourceIdentity: null,
    workingObjectUrl: null,
    crop: { ...HOMEPAGE_PHOTO_EDITOR_DEFAULT_CROP },
    zoom: HOMEPAGE_PHOTO_EDITOR_DEFAULT_ZOOM,
    croppedAreaPixels: null,
    initialCroppedAreaPixels: null,
    dirty: false,
    status: "empty",
    error: null,
    sourceEpoch: 0,
  };
}

export function applyWorkingSource(
  state: HomepagePhotoEditorState,
  input: { objectUrl: string; sourceIdentity: string },
): HomepagePhotoEditorState {
  return {
    ...state,
    workingImageUrl: input.objectUrl,
    workingSourceIdentity: input.sourceIdentity,
    workingObjectUrl: input.objectUrl,
    crop: { ...HOMEPAGE_PHOTO_EDITOR_DEFAULT_CROP },
    zoom: HOMEPAGE_PHOTO_EDITOR_DEFAULT_ZOOM,
    croppedAreaPixels: null,
    initialCroppedAreaPixels: null,
    dirty: true,
    status: "ready",
    error: null,
    sourceEpoch: state.sourceEpoch + 1,
  };
}

export function applyCropComplete(
  state: HomepagePhotoEditorState,
  pixels: HomepagePhotoCropPixels,
): HomepagePhotoEditorState {
  return { ...state, croppedAreaPixels: pixels };
}

export function applyZoom(state: HomepagePhotoEditorState, zoom: number): HomepagePhotoEditorState {
  const next = Math.min(
    HOMEPAGE_PHOTO_EDITOR_MAX_ZOOM,
    Math.max(HOMEPAGE_PHOTO_EDITOR_MIN_ZOOM, zoom),
  );
  if (next === state.zoom) return state;
  return { ...state, zoom: next, dirty: true };
}

export function applyPan(
  state: HomepagePhotoEditorState,
  crop: { x: number; y: number },
): HomepagePhotoEditorState {
  return { ...state, crop };
}

export function markDirty(state: HomepagePhotoEditorState): HomepagePhotoEditorState {
  if (state.dirty) return state;
  return { ...state, dirty: true };
}

export function applyEditorError(state: HomepagePhotoEditorState, error: string): HomepagePhotoEditorState {
  return {
    ...state,
    status: "error",
    error,
  };
}

export function applyGenerateSuccess(
  state: HomepagePhotoEditorState,
  snapshot: HomepagePhotoSavedSnapshot,
): HomepagePhotoEditorState {
  return {
    ...state,
    saved: snapshot,
    workingImageUrl: snapshot.photo_source_url,
    workingSourceIdentity: snapshot.homepage_photo.source_identity,
    workingObjectUrl: null,
    crop: { ...HOMEPAGE_PHOTO_EDITOR_DEFAULT_CROP },
    zoom: snapshot.homepage_photo.zoom,
    croppedAreaPixels: null,
    initialCroppedAreaPixels: { ...snapshot.homepage_photo.crop },
    dirty: false,
    status: "success",
    error: null,
    sourceEpoch: state.sourceEpoch + 1,
  };
}

export function resetHomepagePhotoEditor(
  state: HomepagePhotoEditorState,
  initial: HomepagePhotoEditorState,
): HomepagePhotoEditorState {
  return {
    ...initial,
    sourceEpoch: state.sourceEpoch + 1,
  };
}

export function canSaveHomepagePhotoEditor(state: HomepagePhotoEditorState): boolean {
  return Boolean(
    state.dirty &&
      state.workingSourceIdentity &&
      state.croppedAreaPixels &&
      state.status !== "uploading" &&
      state.status !== "saving",
  );
}

export function expectedUpdatedAtForSave(state: HomepagePhotoEditorState): string | null | undefined {
  if (!state.saved) return undefined;
  return state.saved.homepage_photo.updated_at;
}
