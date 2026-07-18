const RESERVED_CODES = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "become-specialist",
  "client",
  "dashboard",
  "de",
  "favicon",
  "for-specialists",
  "impressum",
  "login",
  "manifest",
  "offline",
  "partner",
  "partners",
  "r",
  "robots",
  "ru",
  "services",
  "sitemap",
  "specialist",
  "specialists",
  "sw",
  "ua",
  "update-password",
]);

/** Normalize referral/link codes: trim, lower-case, collapse spaces to hyphen. */
export function normalizeReferralCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidReferralCode(code: string): boolean {
  if (!code || code.length < 2 || code.length > 64) return false;
  if (RESERVED_CODES.has(code)) return false;
  return /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/.test(code);
}

export function validateReferralCode(raw: string):
  | { ok: true; code: string }
  | { ok: false; error: string } {
  const code = normalizeReferralCode(raw);
  if (!isValidReferralCode(code)) {
    return { ok: false, error: "invalid_referral_code" };
  }
  return { ok: true, code };
}
