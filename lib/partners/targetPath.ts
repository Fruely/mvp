/**
 * Internal redirect target only. Blocks open redirects and dangerous schemes.
 */
export function sanitizeTargetPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  if (trimmed.includes("\\")) return null;

  const pathOnly = trimmed.split("?")[0].split("#")[0];
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) return null;

  const ok =
    pathOnly === "/" ||
    pathOnly === "/become-specialist" ||
    pathOnly.startsWith("/become-specialist/") ||
    /^\/(ua|ru|de)(\/|$)/.test(pathOnly) ||
    pathOnly.startsWith("/for-specialists") ||
    pathOnly === "/app" ||
    pathOnly.startsWith("/app/") ||
    pathOnly === "/login" ||
    pathOnly.startsWith("/login/") ||
    pathOnly.startsWith("/specialists") ||
    pathOnly.startsWith("/services");

  return ok ? pathOnly : null;
}

export function defaultBecomeSpecialistPath(lang: "ua" | "ru" | "de" = "ua"): string {
  return `/${lang}/become-specialist`;
}
