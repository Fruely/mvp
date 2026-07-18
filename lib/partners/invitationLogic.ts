import { createHash, randomBytes } from "node:crypto";

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim(), "utf8").digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export type InvitationEvaluation =
  | { ok: true }
  | { ok: false; reason: "missing" | "used" | "expired" | "email_mismatch" | "already_bound" };

/**
 * Pure invitation gate (no DB). Soft email check: mismatch fails without
 * revealing whether the invite/email exists to callers — use GENERIC_INVALID.
 */
export function evaluateInvitationConsume(input: {
  invitation: {
    used_at: string | null;
    expires_at: string;
    email: string;
  } | null;
  partner: { user_id: string | null } | null;
  userId: string;
  userEmail: string | null | undefined;
  nowMs?: number;
}): InvitationEvaluation {
  if (!input.invitation || !input.partner) return { ok: false, reason: "missing" };
  if (input.invitation.used_at) return { ok: false, reason: "used" };
  const now = input.nowMs ?? Date.now();
  if (Date.parse(input.invitation.expires_at) <= now) {
    return { ok: false, reason: "expired" };
  }
  if (input.partner.user_id && input.partner.user_id !== input.userId) {
    return { ok: false, reason: "already_bound" };
  }
  const inviteEmail = input.invitation.email.trim().toLowerCase();
  const userEmail = (input.userEmail ?? "").trim().toLowerCase();
  if (!userEmail || inviteEmail !== userEmail) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true };
}
