const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "yi", є: "ye", ґ: "g",
  ä: "ae", ö: "oe", ü: "ue", ß: "ss",
};

function transliterate(str: string): string {
  return str
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = TRANSLIT[lower];
      if (mapped !== undefined) return mapped;
      return lower;
    })
    .join("");
}

export function toSlug(text: string): string {
  return transliterate(text)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildSpecialistSlug(
  categorySlug: string | null,
  city: string | null,
  name: string
): string {
  const parts: string[] = [];
  if (categorySlug) parts.push(categorySlug);
  if (city) parts.push(toSlug(city));
  parts.push(toSlug(name));
  return parts.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/g, "");
}
