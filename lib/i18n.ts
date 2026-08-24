import { applyCommercialCopyOverrides } from "@/lib/i18nCommercialOverrides";

export const SUPPORTED_LANGS = ["ua", "ru", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

/** Unknown-user / missing-cookie fallback — not an override for explicit URL locales. */
export const DEFAULT_LANG: Lang = "ru";

export function langFromCookie(cookieValue: string | undefined | null): Lang {
  return isSupportedLang(cookieValue ?? "") ? (cookieValue as Lang) : DEFAULT_LANG;
}

export type Dictionary = Record<string, unknown>;

export function isSupportedLang(value: string): value is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

async function loadDictionary(lang: Lang): Promise<Dictionary> {
  let dictionary: Dictionary;
  switch (lang) {
    case "ua":
      dictionary = (await import("@/locales/ua.json")).default as Dictionary;
      break;
    case "ru":
      dictionary = (await import("@/locales/ru.json")).default as Dictionary;
      break;
    case "de":
      dictionary = (await import("@/locales/de.json")).default as Dictionary;
      break;
  }
  return applyCommercialCopyOverrides(lang, dictionary);
}

const dictionaryPromises = new Map<Lang, Promise<Dictionary>>();

/** Locale JSON is public/static — dedupe concurrent loads within the runtime. */
export async function getDictionary(lang: Lang): Promise<Dictionary> {
  const cached = dictionaryPromises.get(lang);
  if (cached) return cached;
  const promise = loadDictionary(lang);
  dictionaryPromises.set(lang, promise);
  return promise;
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

export type PluralForm = "one" | "few" | "many";

/** Slavic (ru/ua): 1/21… one; 2–4/22–24… few; else many. */
export function slavicPluralForm(n: number): PluralForm {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
}

export function pluralForm(lang: Lang, n: number): PluralForm {
  if (lang === "de") return Math.abs(Math.trunc(n)) === 1 ? "one" : "many";
  return slavicPluralForm(n);
}

/**
 * Resolve `key.one` / `key.few` / `key.many`, then a string `key` fallback.
 * Replaces `{{count}}` and any extra `{{name}}` placeholders.
 */
export function tCount(
  dict: Dictionary,
  lang: Lang,
  key: string,
  count: number,
  replacements?: Record<string, string>
): string {
  const form = pluralForm(lang, count);
  const nested = getDictValue(dict, `${key}.${form}`);
  const template = typeof nested === "string" ? nested : t(dict, key);
  let out = template.replace(/\{\{\s*count\s*\}\}/g, String(count));
  if (replacements) {
    for (const [name, value] of Object.entries(replacements)) {
      out = out.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"), value);
    }
  }
  return out;
}
