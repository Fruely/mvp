export function isAgentJsonContentType(
  value: string | null | undefined,
): boolean {
  if (typeof value !== "string") return false;
  const parts = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;
  if (parts[0].toLowerCase() !== "application/json") return false;

  for (const param of parts.slice(1)) {
    const eq = param.indexOf("=");
    if (eq <= 0) return false;
    const name = param.slice(0, eq).trim().toLowerCase();
    let raw = param.slice(eq + 1).trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    if (name !== "charset") return false;
    if (raw.toLowerCase() !== "utf-8") return false;
  }

  return true;
}
