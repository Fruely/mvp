import type { Translations } from "./types";
import { specialistPageTranslations } from "./translations";

const fallback = specialistPageTranslations["en"];

export function getSpecialistPageTranslations(lang: string): Translations {
  return specialistPageTranslations[lang] ?? fallback;
}

const VALID_FORMATS = new Set(["online", "offline", "hybrid"] as const);

export function getWorkFormat(value?: string | null): "online" | "offline" | "hybrid" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (VALID_FORMATS.has(normalized as "online" | "offline" | "hybrid")) {
    return normalized as "online" | "offline" | "hybrid";
  }
  return null;
}
