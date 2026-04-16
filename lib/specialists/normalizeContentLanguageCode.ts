/** Dashboard/public route segment (?lang= / [lang]) → DB language_code in specialist_*_translations */
export function normalizeRouteLangToDbContentCode(
  routeLang: string | null | undefined
): string | null {
  if (routeLang == null || typeof routeLang !== "string") return null;
  const lower = routeLang.trim().toLowerCase();
  if (lower === "ua") return "uk";
  if (lower === "ru") return "ru";
  if (lower === "de") return "de";
  return null;
}
