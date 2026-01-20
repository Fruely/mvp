export const SUPPORTED_LANGS = ["ua", "ru", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export type Dictionary = Record<string, string>;

export function isSupportedLang(value: string): value is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export async function getDictionary(lang: Lang): Promise<Dictionary> {
  switch (lang) {
    case "ua":
      return (await import("@/locales/ua.json")).default as Dictionary;
    case "ru":
      return (await import("@/locales/ru.json")).default as Dictionary;
    case "de":
      return (await import("@/locales/de.json")).default as Dictionary;
  }
}

export function t(dict: Dictionary, key: string): string {
  return dict[key] ?? key;
}
