/** Public edge cache for localized homepage routes (/{lang} and /). */
export const PUBLIC_HOMEPAGE_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=600";

export function isPublicHomepagePath(pathname: string): boolean {
  if (pathname === "/") return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return false;
  return segments[0] === "ua" || segments[0] === "ru" || segments[0] === "de";
}
