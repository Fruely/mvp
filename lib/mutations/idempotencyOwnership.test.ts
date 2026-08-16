import assert from "node:assert/strict";
import test from "node:test";

import {
  IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE,
  ownershipScopesMatch,
  resolveIdempotentReplayWithOwnership,
  shouldApplyNewCreateRateLimitWithOwnership,
  shouldRunCreationSideEffectsWithOwnership,
} from "./idempotencyOwnership.ts";

const baseResponse = { id: "req-1", created_at: "2026-08-16T10:00:00.000Z" };
const fingerprint = "abc123";

test("ownershipScopesMatch treats null and undefined as anonymous", () => {
  assert.equal(ownershipScopesMatch(null, null), true);
  assert.equal(ownershipScopesMatch(undefined, null), true);
  assert.equal(ownershipScopesMatch("user-a", "user-a"), true);
  assert.equal(ownershipScopesMatch("user-a", "user-b"), false);
  assert.equal(ownershipScopesMatch(null, "user-a"), false);
});

test("same owner + same payload replays original success", () => {
  const result = resolveIdempotentReplayWithOwnership(
    {
      client_user_id: "user-a",
      fingerprint,
      response: baseResponse,
    },
    fingerprint,
    "user-a",
  );

  assert.equal(result.kind, "replay");
  if (result.kind === "replay") {
    assert.deepEqual(result.response, baseResponse);
  }
});

test("same owner + different payload returns conflict", () => {
  const result = resolveIdempotentReplayWithOwnership(
    {
      client_user_id: "user-a",
      fingerprint: "other",
      response: baseResponse,
    },
    fingerprint,
    "user-a",
  );

  assert.equal(result.kind, "conflict");
});

test("different authenticated owner returns ownership conflict without replay", () => {
  const result = resolveIdempotentReplayWithOwnership(
    {
      client_user_id: "user-a",
      fingerprint,
      response: baseResponse,
    },
    fingerprint,
    "user-b",
  );

  assert.equal(result.kind, "ownership_conflict");
});

test("authenticated row retried anonymously returns ownership conflict", () => {
  const result = resolveIdempotentReplayWithOwnership(
    {
      client_user_id: "user-a",
      fingerprint,
      response: baseResponse,
    },
    fingerprint,
    null,
  );

  assert.equal(result.kind, "ownership_conflict");
});

test("anonymous row retried authenticated returns ownership conflict", () => {
  const result = resolveIdempotentReplayWithOwnership(
    {
      client_user_id: null,
      fingerprint,
      response: baseResponse,
    },
    fingerprint,
    "user-a",
  );

  assert.equal(result.kind, "ownership_conflict");
});

test("ownership conflict does not run create side effects or rate-limit bypass", () => {
  const replay = resolveIdempotentReplayWithOwnership(
    {
      client_user_id: "user-a",
      fingerprint,
      response: baseResponse,
    },
    fingerprint,
    null,
  );

  assert.equal(replay.kind, "ownership_conflict");
  assert.equal(shouldApplyNewCreateRateLimitWithOwnership(replay), false);
  assert.equal(shouldRunCreationSideEffectsWithOwnership(replay), false);
});

test("ownership conflict message stays generic", () => {
  assert.match(IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE, /auth context/);
});
