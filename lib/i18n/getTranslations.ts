import { specialistPageTranslations } from "./translations";

const fallback = specialistPageTranslations["en"];

export function getSpecialistPageTranslations(lang: string): Record<string, string> {
  return specialistPageTranslations[lang] ?? fallback;
}

export function safeT(obj: Record<string, string> | undefined, key: string, fallback: string): string {
  return obj?.[key] ?? fallback;
}
