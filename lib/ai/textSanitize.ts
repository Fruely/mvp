/**
 * Contact stripping for free text that leaves the Freuly backend, either towards
 * an AI provider or into public copy.
 *
 * Canonical implementation: do not re-create these patterns in feature modules.
 */

/** Replace contact-like fragments with neutral markers and collapse whitespace. */
export function sanitizeFreeText(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const sanitized = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact removed]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[link removed]")
    .replace(/(^|\s)@[A-Za-z0-9_]{3,}/g, "$1[handle removed]")
    .replace(/\+?\d[\d\s()./-]{6,}\d/g, "[phone removed]")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || null;
}

/** True when the value still carries an email, link, social handle or phone. */
export function containsObviousContactInfo(value: string): boolean {
  return (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) ||
    /(?:https?:\/\/|www\.)\S+/i.test(value) ||
    /(^|\s)@[A-Za-z0-9_]{3,}/.test(value) ||
    /\+?\d[\d\s()./-]{6,}\d/.test(value)
  );
}
