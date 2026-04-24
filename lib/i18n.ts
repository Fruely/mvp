export const SUPPORTED_LANGS = ["ua", "ru", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export type Dictionary = Record<string, unknown>;

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

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return undefined;

  let cur: any = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Read nested dictionary values (objects / arrays) for structured page copy. */
export function getDictValue(dict: Dictionary, path: string): unknown {
  return getByPath(dict, path);
}

export function t(
  dict: Dictionary,
  key: string,
  options?: { defaultValue?: string }
): string {
  const byPath = getByPath(dict, key);
  if (typeof byPath === "string") return byPath;

  const direct = (dict as any)?.[key];
  if (typeof direct === "string") return direct;

  return options?.defaultValue ?? key;
}
