import type { IdempotentExistingRow } from "./clientIdempotency";
import { resolveIdempotentReplay } from "./clientIdempotency";

export type IdempotentExistingOwnedRow = IdempotentExistingRow & {
  client_user_id: string | null;
};

export type IdempotentReplayWithOwnershipResult =
  | { kind: "create" }
  | { kind: "replay"; response: Record<string, unknown> }
  | { kind: "conflict" }
  | { kind: "ownership_conflict" };

export function ownershipScopesMatch(
  storedOwnerId: string | null | undefined,
  currentOwnerId: string | null,
): boolean {
  return (storedOwnerId ?? null) === (currentOwnerId ?? null);
}

export function resolveIdempotentReplayWithOwnership(
  existing: IdempotentExistingOwnedRow | null,
  fingerprint: string,
  currentOwnerId: string | null,
): IdempotentReplayWithOwnershipResult {
  if (!existing) {
    return { kind: "create" };
  }

  if (!ownershipScopesMatch(existing.client_user_id, currentOwnerId)) {
    return { kind: "ownership_conflict" };
  }

  const replay = resolveIdempotentReplay(existing, fingerprint);
  if (replay.kind === "replay") {
    return replay;
  }

  return { kind: "conflict" };
}

export const IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE =
  "Idempotency key unavailable for current auth context";

export function shouldApplyNewCreateRateLimitWithOwnership(
  replay: IdempotentReplayWithOwnershipResult,
): boolean {
  return replay.kind === "create";
}

export function shouldRunCreationSideEffectsWithOwnership(
  replay: IdempotentReplayWithOwnershipResult,
): boolean {
  return replay.kind === "create";
}
