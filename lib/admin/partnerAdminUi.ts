import {
  buildCanonicalReferralUrl,
  resolveClientPublicOrigin,
} from "../partners/referralUrl.ts";
import { isValidReferralCode, normalizeReferralCode } from "../partners/codes.ts";
import {
  ADMIN_PARTNER_STATUS_HELP,
  ADMIN_PARTNER_STATUS_LABELS,
  ADMIN_PAYOUT_STATUS_LABELS,
} from "./adminCopy.ts";

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Client-safe suggestion aligned with server ensureReferralCode logic. */
export function suggestReferralCodeFromEmail(email: string): string {
  const local = email.split("@")[0] || "partner";
  const base = normalizeReferralCode(local).slice(0, 24) || "partner";
  const suffix = randomHex(2);
  const candidate = `${base}-${suffix}`;
  return isValidReferralCode(candidate) ? candidate : `p-${randomHex(4)}`;
}

export function buildAdminReferralUrl(referralCode: string): string {
  const code = referralCode.trim();
  if (!code) return "";
  return buildCanonicalReferralUrl(resolveClientPublicOrigin(), code);
}

export function formatPartnerStatusRu(status: string): string {
  return ADMIN_PARTNER_STATUS_LABELS[status] ?? status;
}

export function partnerStatusHelpRu(status: string): string | null {
  return ADMIN_PARTNER_STATUS_HELP[status] ?? null;
}

export function formatPayoutStatusRu(status: string): string {
  return ADMIN_PAYOUT_STATUS_LABELS[status] ?? status;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}
