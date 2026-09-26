/**
 * Language identity for matching.
 *
 * Codes are BCP-47 primary subtags (`ru`, `uk`, `de`, `en`, `pl`, …).
 * The matcher does not contain a closed list of languages: an unknown but
 * well-formed code compares equal to itself. The alias table only reconciles
 * values this codebase already stored (`ua`, language names).
 */

const ALIASES: Record<string, string> = {
  ru: "ru",
  russian: "ru",
  русский: "ru",
  ua: "uk",
  uk: "uk",
  ukrainian: "uk",
  українська: "uk",
  украинский: "uk",
  de: "de",
  german: "de",
  deutsch: "de",
  немецкий: "de",
  en: "en",
  english: "en",
  английский: "en",
};

const PRIMARY = /^[a-z]{2,3}$/;

export function canonicalizeLanguage(value: string): string | null {
  const raw = value.trim().toLowerCase().replace(/_/g, "-");
  if (!raw) return null;
  if (ALIASES[raw]) return ALIASES[raw];
  const primary = raw.split("-")[0] ?? "";
  if (ALIASES[primary]) return ALIASES[primary];
  if (PRIMARY.test(primary)) return primary;
  return null;
}

export function canonicalizeLanguages(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const code = canonicalizeLanguage(value);
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

/** Values that may already sit in `specialists.languages`, including legacy `ua`. */
export function storedLanguageVariants(codes: readonly string[]): string[] {
  const wanted = canonicalizeLanguages(codes);
  const variants: string[] = [];
  const add = (value: string) => {
    if (!variants.includes(value)) variants.push(value);
  };
  for (const code of wanted) {
    add(code);
    for (const raw of Object.keys(ALIASES)) {
      if (ALIASES[raw] === code) add(raw);
    }
  }
  return variants;
}

/**
 * Empty `required` means the client stated no language requirement.
 * Interface locale and source language must not be passed in here.
 */
export function languagesOverlap(required: readonly string[], spoken: readonly string[]): boolean {
  const needed = canonicalizeLanguages(required);
  if (needed.length === 0) return true;
  const have = new Set(canonicalizeLanguages(spoken));
  return needed.some((code) => have.has(code));
}
