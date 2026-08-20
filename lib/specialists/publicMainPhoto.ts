import type { PhotoFocus } from "@/components/specialist/specialistMainPhotoFit";
import { resolveCanonicalSupabaseOrigin } from "@/lib/specialistMedia/storagePath";
import {
  imageAspectFromStored,
  parseStoredPhotoFocus,
  photoFocusForDisplayedUrl,
} from "@/lib/specialists/photoFocusMetadata";

export type PublicMainPhotoView = {
  src: string | null;
  photoFocus: PhotoFocus | null;
  imageAspect: number | null;
};

function normalizeSrc(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function unavailable(src: string | null): PublicMainPhotoView {
  return { src, photoFocus: null, imageAspect: null };
}

/**
 * Canonical public MAIN-photo view for rendering.
 * Validates stored photo_focus against the src actually displayed on the surface.
 * Does not probe the image or read dimensions over the network.
 */
export function resolvePublicMainPhotoView(input: {
  src: string | null | undefined;
  storedPhotoFocus: unknown;
  specialistId: string | null | undefined;
  canonicalOrigin?: string | null;
}): PublicMainPhotoView {
  const src = normalizeSrc(input.src);
  const specialistId =
    typeof input.specialistId === "string" && input.specialistId.trim()
      ? input.specialistId.trim()
      : "";
  if (!src || !specialistId) return unavailable(src);

  const stored = parseStoredPhotoFocus(input.storedPhotoFocus);
  if (!stored || stored.status !== "ok") return unavailable(src);

  const canonicalOrigin =
    input.canonicalOrigin !== undefined
      ? input.canonicalOrigin
      : resolveCanonicalSupabaseOrigin();

  const photoFocus = photoFocusForDisplayedUrl({
    stored,
    displayedUrl: src,
    specialistId,
    canonicalOrigin,
  });
  const imageAspect = imageAspectFromStored(stored);
  if (!photoFocus || imageAspect == null) return unavailable(src);

  return { src, photoFocus, imageAspect };
}
