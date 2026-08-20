import { resolveCanonicalSupabaseOrigin } from "@/lib/specialistMedia/storagePath";
import { resolveHomepagePhotoState } from "@/lib/specialists/homepagePhoto";

export type HomepageCardImage = {
  src: string | null;
  usesCanonicalHomepagePhoto: boolean;
};

function normalizeUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Homepage recommended-card image selection.
 *
 * Readiness comes only from resolveHomepagePhotoState.
 * Missing / stale / invalid canonical photos keep the existing MAIN fallback URL.
 */
export function resolveHomepageCardImage(input: {
  specialistId: string;
  photoSourceUrl?: string | null;
  homepagePhotoUrl?: string | null;
  storedMetadata?: unknown;
  canonicalOrigin?: string | null;
  fallbackUrl: string | null | undefined;
}): HomepageCardImage {
  const fallbackUrl = normalizeUrl(input.fallbackUrl);
  const homepagePhotoUrl = normalizeUrl(input.homepagePhotoUrl);
  const state = resolveHomepagePhotoState({
    specialistId: input.specialistId,
    photoSourceUrl: input.photoSourceUrl,
    homepagePhotoUrl,
    storedMetadata: input.storedMetadata,
    canonicalOrigin:
      input.canonicalOrigin !== undefined
        ? input.canonicalOrigin
        : resolveCanonicalSupabaseOrigin(),
  });

  if (state.kind === "ready" && homepagePhotoUrl) {
    return { src: homepagePhotoUrl, usesCanonicalHomepagePhoto: true };
  }

  return { src: fallbackUrl, usesCanonicalHomepagePhoto: false };
}
