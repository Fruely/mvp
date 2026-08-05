/**
 * Validates an internal post-auth redirect path from a `next` query parameter.
 * Rejects external URLs and protocol-relative paths.
 */
export function resolveSafeNextPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;

  let candidate = raw.trim();
  if (!candidate) return null;

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return null;
  }

  if (!candidate.startsWith("/")) return null;
  if (candidate.startsWith("//")) return null;
  if (candidate.includes("\\")) return null;
  if (/^https?:\/\//i.test(candidate)) return null;
  if (/^\/[^/?#]*:/i.test(candidate)) return null;

  return candidate;
}
