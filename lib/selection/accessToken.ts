import { createHash, randomBytes } from "node:crypto";
import { CLIENT_SELECTION_POLICY } from "./policy";

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAccessToken(token) };
}

export type AccessTokenRow = {
  service_request_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
};

export function accessTokenVerdict(
  row: AccessTokenRow | null,
  requestId: string,
  now = new Date(),
): "valid" | "invalid" | "expired" | "revoked" | "wrong_request" {
  if (!row) return "invalid";
  if (row.service_request_id !== requestId) return "wrong_request";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function accessTokenExpiry(now = new Date()): string {
  return new Date(now.getTime() + CLIENT_SELECTION_POLICY.accessTokenTtlMs).toISOString();
}
