import { randomBytes } from "node:crypto";

import { isUniqueViolation } from "./publicId";

/** 128-bit URL-safe opaque token for public promotion pages. */
export function generatePromotionPublicToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isPromotionTokenUrlSafe(token: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(token) && token.length >= 16;
}

export function promotionTokenEntropyBits(): number {
  return 128;
}

export { isUniqueViolation };
