/**
 * Detects names that look like email local parts (e.g. "erfolg210" from erfolg210@gmail.com)
 * and returns null so the UI can show a fallback like "Специалист".
 * Only hides when: no spaces, no Cyrillic, AND contains digits (strong email-prefix signal).
 */
export function looksLikeEmailLocalPart(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/\s/.test(trimmed)) return false;
  if (/[А-Яа-яЁёІіЇїЄє]/.test(trimmed)) return false;
  if (!/\d/.test(trimmed)) return false;
  return /^[a-zA-Z0-9._-]+$/.test(trimmed) && trimmed.length <= 64;
}

/**
 * Returns the display name, or null if it looks like an email prefix.
 */
export function displayName(raw: string | null | undefined): string | null {
  if (looksLikeEmailLocalPart(raw)) return null;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
