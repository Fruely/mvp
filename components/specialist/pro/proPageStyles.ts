/** Concept B layout tokens — Figma nodes 283:289 / 283:1098. */

export const PRO_PAGE_MAX = "mx-auto w-full max-w-[1280px]";

export const PRO_PAGE_PAD_X = "px-5 md:px-20";

export const PRO_TEXT_SECONDARY = "text-[#5C5651]";

export const LANGUAGE_LABELS: Record<string, Record<"ru" | "ua" | "de", string>> = {
  ru: { ru: "Русский", ua: "Русский", de: "Russisch" },
  uk: { ru: "Українська", ua: "Українська", de: "Ukrainisch" },
  ua: { ru: "Українська", ua: "Українська", de: "Ukrainisch" },
  de: { ru: "Deutsch", ua: "Deutsch", de: "Deutsch" },
  en: { ru: "English", ua: "English", de: "English" },
};

export function formatProLanguages(languages: string[], lang: "ru" | "ua" | "de"): string {
  return languages
    .map((code) => {
      const key = code.trim().toLowerCase();
      return LANGUAGE_LABELS[key]?.[lang] ?? key.toUpperCase();
    })
    .filter(Boolean)
    .join(" · ");
}

export function splitStoryForQuote(story: string): { quote: string; remainder: string } {
  const trimmed = story.trim();
  const match = trimmed.match(/^(.+?[.!?])(?:\s+([\s\S]*))?$/);
  if (!match) return { quote: trimmed, remainder: "" };
  return {
    quote: match[1].trim(),
    remainder: (match[2] ?? "").trim(),
  };
}
