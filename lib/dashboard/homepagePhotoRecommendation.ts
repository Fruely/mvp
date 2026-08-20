import { resolveHomepagePhotoState } from "@/lib/specialists/homepagePhoto";

export const HOMEPAGE_PHOTO_EDITOR_ELEMENT_ID = "homepage-photo-editor";

export function dashboardHomepagePhotoEditorHref(lang: string): string {
  const safeLang = typeof lang === "string" && lang.trim() ? lang.trim() : "ru";
  return `/${safeLang}/specialist/dashboard/profile#${HOMEPAGE_PHOTO_EDITOR_ELEMENT_ID}`;
}

/**
 * Advisory dashboard banner visibility.
 * Readiness comes only from resolveHomepagePhotoState: anything other than
 * "ready" (missing, stale, invalid) shows the recommendation.
 */
export function shouldShowHomepagePhotoRecommendation(
  input: Parameters<typeof resolveHomepagePhotoState>[0],
): boolean {
  return resolveHomepagePhotoState(input).kind !== "ready";
}
