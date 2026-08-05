import { randomBytes } from "node:crypto";

const PUBLIC_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPublicSuffix(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += PUBLIC_ID_ALPHABET[bytes[i]! % PUBLIC_ID_ALPHABET.length];
  }
  return out;
}

/** REQ-YYYYMMDD-XXXXXX — server-side, non-sequential public reference. */
export function generateServiceRequestPublicId(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `REQ-${y}${m}${d}-${randomPublicSuffix(6)}`;
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "23505";
}
