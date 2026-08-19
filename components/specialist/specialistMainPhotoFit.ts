import { isSpecialistPhotoCoverEnabled } from "@/lib/specialists/photoFocusGate";

/** Canonical fit for the specialist MAIN profile photo when no trusted focal metadata exists. */
export const SPECIALIST_MAIN_PHOTO_FIT_CLASS = "object-contain object-center";

export const SPECIALIST_MAIN_PHOTO_COVER_CLASS = "object-cover";

/** Normalized box in image space (origin top-left). */
export type PhotoBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PhotoFocus = {
  focalX: number;
  focalY: number;
  confidence: number;
  subject?: PhotoBox | null;
  face?: PhotoBox | null;
  source?: "auto" | "manual";
};

export type SpecialistPhotoSurface = "card" | "thumb" | "hero" | "dashboard";

export type SpecialistPhotoFit = {
  fit: "contain" | "cover";
  objectPosition: string;
};

/**
 * Representative frame width/height used for crop-safety checks.
 * Uses the widest typical public frame per surface so cover is only enabled
 * if the head still survives the most aggressive (landscape) crop.
 */
export const SPECIALIST_PHOTO_FRAME_ASPECT: Record<SpecialistPhotoSurface, number> = {
  card: 320 / 200,
  thumb: 1,
  hero: 390 / 280,
  dashboard: 4 / 3,
};

const COVER_MIN_CONFIDENCE: Record<SpecialistPhotoSurface, number> = {
  card: 0.65,
  thumb: 0.65,
  hero: 0.8,
  dashboard: Number.POSITIVE_INFINITY,
};

/** Extra padding above the face that the cover window must keep visible. */
const FACE_HEADROOM_RATIO: Record<SpecialistPhotoSurface, number> = {
  card: 0.35,
  thumb: 0.25,
  hero: 0.45,
  dashboard: 0.45,
};

/**
 * If the detected face already fills this much of the source height, the photo is a
 * tight headshot/selfie — cover would crowd or clip hair. Contain instead.
 */
const MAX_FACE_HEIGHT_RATIO: Record<SpecialistPhotoSurface, number> = {
  card: 0.34,
  thumb: 0.4,
  hero: 0.3,
  dashboard: 0.3,
};

/** Source space above the face must be at least this multiple of face height. */
const MIN_FACE_TOP_HEADROOM_RATIO: Record<SpecialistPhotoSurface, number> = {
  card: 1.05,
  thumb: 0.8,
  hero: 1.15,
  dashboard: 1.15,
};

/** Absolute minimum face.y (normalized). Catches hair already against the top edge. */
const MIN_FACE_TOP: Record<SpecialistPhotoSurface, number> = {
  card: 0.16,
  thumb: 0.1,
  hero: 0.2,
  dashboard: 0.2,
};

const BOX_EPSILON = 1e-4;

const CONTAIN_FIT: SpecialistPhotoFit = {
  fit: "contain",
  objectPosition: "50% 50%",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function isValidBox(box: PhotoBox | null | undefined): box is PhotoBox {
  if (!box) return false;
  if (![box.x, box.y, box.w, box.h].every(isFiniteNumber)) return false;
  if (box.w <= BOX_EPSILON || box.h <= BOX_EPSILON) return false;
  if (box.x < -BOX_EPSILON || box.y < -BOX_EPSILON) return false;
  if (box.x + box.w > 1 + BOX_EPSILON || box.y + box.h > 1 + BOX_EPSILON) return false;
  return true;
}

function expandFaceHeadroom(face: PhotoBox, headroomRatio: number): PhotoBox {
  const headroom = face.h * headroomRatio;
  const y = Math.max(0, face.y - headroom);
  const bottom = Math.min(1, face.y + face.h);
  return { x: face.x, y, w: face.w, h: Math.max(BOX_EPSILON, bottom - y) };
}

/**
 * Visible image window under CSS object-cover + percentage object-position.
 * Percentages pin image point (focal) to the same relative point of the frame.
 */
export function visibleCoverWindow(
  imageAspect: number,
  frameAspect: number,
  focalX: number,
  focalY: number,
): PhotoBox {
  const visibleW = imageAspect >= frameAspect ? Math.min(1, frameAspect / imageAspect) : 1;
  const visibleH = imageAspect <= frameAspect ? Math.min(1, imageAspect / frameAspect) : 1;
  const x = (1 - visibleW) * clamp01(focalX);
  const y = (1 - visibleH) * clamp01(focalY);
  return { x, y, w: visibleW, h: visibleH };
}

function boxFullyVisible(inner: PhotoBox, window: PhotoBox): boolean {
  return (
    inner.x + BOX_EPSILON >= window.x &&
    inner.y + BOX_EPSILON >= window.y &&
    inner.x + inner.w <= window.x + window.w + BOX_EPSILON &&
    inner.y + inner.h <= window.y + window.h + BOX_EPSILON
  );
}

function faceSourceIsTooTight(face: PhotoBox, surface: SpecialistPhotoSurface): boolean {
  if (face.h > MAX_FACE_HEIGHT_RATIO[surface] + BOX_EPSILON) return true;
  if (face.y + BOX_EPSILON < MIN_FACE_TOP[surface]) return true;
  if (face.y + BOX_EPSILON < face.h * MIN_FACE_TOP_HEADROOM_RATIO[surface]) return true;
  return false;
}

function cropIsSafe(input: {
  focus: PhotoFocus;
  surface: SpecialistPhotoSurface;
  imageAspect: number;
  frameAspect: number;
}): boolean {
  const window = visibleCoverWindow(
    input.imageAspect,
    input.frameAspect,
    input.focus.focalX,
    input.focus.focalY,
  );

  if (isValidBox(input.focus.face)) {
    if (faceSourceIsTooTight(input.focus.face, input.surface)) return false;
    const safeFace = expandFaceHeadroom(input.focus.face, FACE_HEADROOM_RATIO[input.surface]);
    return boxFullyVisible(safeFace, window);
  }

  if (isValidBox(input.focus.subject)) {
    const topBand: PhotoBox = {
      x: input.focus.subject.x,
      y: input.focus.subject.y,
      w: input.focus.subject.w,
      h: Math.min(input.focus.subject.h, window.h),
    };
    return boxFullyVisible(topBand, window);
  }

  return false;
}

function formatObjectPosition(focalX: number, focalY: number): string {
  const x = Math.round(clamp01(focalX) * 1000) / 10;
  const y = Math.round(clamp01(focalY) * 1000) / 10;
  return `${x}% ${y}%`;
}

/**
 * Resolve how the MAIN specialist photo should fit a UI frame.
 *
 * No metadata, low confidence, missing image aspect, dashboard surface,
 * an unsafe crop, or a tight source headshot/selfie → contain
 * (current production behavior when no metadata is passed).
 * Trusted focal metadata that keeps face + headroom in frame → cover + object-position.
 */
export function resolveSpecialistPhotoFit(input: {
  focus?: PhotoFocus | null;
  frameAspect?: number;
  imageAspect?: number;
  surface: SpecialistPhotoSurface;
}): SpecialistPhotoFit {
  const surface = input.surface;
  if (surface === "dashboard") return CONTAIN_FIT;

  const focus = input.focus;
  if (!focus) return CONTAIN_FIT;
  if (!isFiniteNumber(focus.focalX) || !isFiniteNumber(focus.focalY)) return CONTAIN_FIT;
  if (focus.focalX < 0 || focus.focalX > 1 || focus.focalY < 0 || focus.focalY > 1) {
    return CONTAIN_FIT;
  }

  const isManual = focus.source === "manual";
  if (!isManual) {
    if (!isFiniteNumber(focus.confidence) || focus.confidence < COVER_MIN_CONFIDENCE[surface]) {
      return CONTAIN_FIT;
    }
  }

  const frameAspect = isFiniteNumber(input.frameAspect)
    ? input.frameAspect
    : SPECIALIST_PHOTO_FRAME_ASPECT[surface];
  if (!(frameAspect > 0)) return CONTAIN_FIT;

  const imageAspect = input.imageAspect;
  if (!isFiniteNumber(imageAspect) || !(imageAspect > 0)) return CONTAIN_FIT;

  if (!isValidBox(focus.face) && !isValidBox(focus.subject)) return CONTAIN_FIT;

  if (!cropIsSafe({ focus, surface, imageAspect, frameAspect })) return CONTAIN_FIT;

  return {
    fit: "cover",
    objectPosition: formatObjectPosition(focus.focalX, focus.focalY),
  };
}

/**
 * Public-UI entry point. Cover stays contain while the feature gate is off,
 * even if trusted metadata and imageAspect are passed.
 * The pure resolver above remains ungated for the offline evaluator and unit tests.
 */
export function resolveLiveSpecialistPhotoFit(input: {
  focus?: PhotoFocus | null;
  frameAspect?: number;
  imageAspect?: number;
  surface: SpecialistPhotoSurface;
}): SpecialistPhotoFit {
  if (!isSpecialistPhotoCoverEnabled(input.surface)) return CONTAIN_FIT;
  return resolveSpecialistPhotoFit(input);
}

export function specialistMainPhotoFitClass(fit: SpecialistPhotoFit): string {
  return fit.fit === "cover" ? SPECIALIST_MAIN_PHOTO_COVER_CLASS : SPECIALIST_MAIN_PHOTO_FIT_CLASS;
}
