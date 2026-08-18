import { createHash } from "node:crypto";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_-]{8,128}$/;

export function normalizeClientIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !IDEMPOTENCY_KEY_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function buildClientIdempotencyFingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export type IdempotentExistingRow = {
  fingerprint: string | null;
  response: Record<string, unknown>;
};

export function resolveIdempotentReplay(
  existing: IdempotentExistingRow | null,
  fingerprint: string,
): { kind: "create" } | { kind: "replay"; response: Record<string, unknown> } | { kind: "conflict" } {
  if (!existing) {
    return { kind: "create" };
  }

  if (existing.fingerprint && existing.fingerprint !== fingerprint) {
    return { kind: "conflict" };
  }

  return { kind: "replay", response: existing.response };
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: string };
  return record.code === "23505";
}

/** Rate limits apply only when no existing idempotent row will be replayed. */
export function shouldApplyNewCreateRateLimit(
  replay: ReturnType<typeof resolveIdempotentReplay>,
): boolean {
  return replay.kind === "create";
}

/** Creation-only side effects (notifications) must not run on replay paths. */
export function shouldRunCreationSideEffects(
  replay: ReturnType<typeof resolveIdempotentReplay>,
): boolean {
  return replay.kind === "create";
}
