/**
 * Maps a search/query language parameter to the DB code stored in `specialists.languages`
 * (and related RPC params). Route/UI may use `ua` for Ukrainian; DB stores `uk`.
 */
export function normalizeSearchLangToDbCode(
  lang: string | null | undefined
): string | null {
  if (lang == null || typeof lang !== "string") return null;
  const t = lang.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === "ua") return "uk";
  return lower;
}
