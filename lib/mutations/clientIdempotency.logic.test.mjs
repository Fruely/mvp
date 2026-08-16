import assert from "node:assert/strict";
import test from "node:test";

const {
  buildClientIdempotencyFingerprint,
  normalizeClientIdempotencyKey,
  resolveIdempotentReplay,
} = await import("./clientIdempotency.ts");

test("normalizeClientIdempotencyKey accepts canonical keys", () => {
  assert.equal(normalizeClientIdempotencyKey("native:abc12345"), "native:abc12345");
  assert.equal(normalizeClientIdempotencyKey("  "), null);
  assert.equal(normalizeClientIdempotencyKey("bad key!"), null);
});

test("resolveIdempotentReplay returns replay for matching fingerprint", () => {
  const fingerprint = buildClientIdempotencyFingerprint({ a: 1 });
  const result = resolveIdempotentReplay(
    { fingerprint, response: { id: "lead-1" } },
    fingerprint,
  );
  assert.equal(result.kind, "replay");
});

test("resolveIdempotentReplay returns conflict for mismatched fingerprint", () => {
  const result = resolveIdempotentReplay(
    { fingerprint: "abc", response: { id: "lead-1" } },
    "def",
  );
  assert.equal(result.kind, "conflict");
});

test("buildClientIdempotencyFingerprint is stable", () => {
  const first = buildClientIdempotencyFingerprint({ specialist_id: "x", message: "hi" });
  const second = buildClientIdempotencyFingerprint({ specialist_id: "x", message: "hi" });
  assert.equal(first, second);
});
