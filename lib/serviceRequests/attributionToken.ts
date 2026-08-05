import { randomBytes } from "node:crypto";

import { ATTRIBUTION_TOKEN_MAX_LEN } from "./attributionConstants";
import { isUniqueViolation } from "./publicId";

/** 128-bit URL-safe opaque first-party attribution identifier. */
export function generateAttributionToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isAttributionTokenUrlSafe(token: string): boolean {
  return (
    /^[A-Za-z0-9_-]+$/.test(token) &&
    token.length >= 16 &&
    token.length <= ATTRIBUTION_TOKEN_MAX_LEN
  );
}

export function attributionTokenEntropyBits(): number {
  return 128;
}

export { isUniqueViolation };
