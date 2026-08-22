const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidContentSlug(value: string): boolean {
  return CONTENT_SLUG_PATTERN.test(value);
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", і: "i", ї: "yi", є: "ye", ґ: "g", ä: "ae", ö: "oe", ü: "ue",
  ß: "ss",
};

export function generateSlugFromTitle(title: string): string {
  const lower = title.toLowerCase();
  let result = "";
  for (const ch of lower) {
    if (TRANSLIT[ch] !== undefined) {
      result += TRANSLIT[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      result += ch;
    } else {
      result += " ";
    }
  }
  return result
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
