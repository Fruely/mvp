import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const {
  buildClientIdempotencyFingerprint,
  normalizeClientIdempotencyKey,
  resolveIdempotentReplay,
  shouldApplyNewCreateRateLimit,
  shouldRunCreationSideEffects,
} = await import("./clientIdempotency.ts");

const { isPublicLeadTargetSpecialist } = await import("../specialists/status.ts");

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

test("shouldApplyNewCreateRateLimit skips replay/conflict paths", () => {
  const fingerprint = buildClientIdempotencyFingerprint({ a: 1 });
  const replay = resolveIdempotentReplay(
    { fingerprint, response: { id: "lead-1" } },
    fingerprint,
  );
  assert.equal(shouldApplyNewCreateRateLimit(replay), false);
  assert.equal(shouldApplyNewCreateRateLimit({ kind: "create" }), true);
  assert.equal(shouldRunCreationSideEffects(replay), false);
  assert.equal(shouldRunCreationSideEffects({ kind: "create" }), true);
});

test("isPublicLeadTargetSpecialist excludes test specialists", () => {
  assert.equal(
    isPublicLeadTargetSpecialist({
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      billing_visibility_blocked: false,
      is_test: true,
    }),
    false,
  );
  assert.equal(
    isPublicLeadTargetSpecialist({
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      billing_visibility_blocked: false,
      is_test: false,
    }),
    true,
  );
});

test("lead create route checks idempotency before rate limiting", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/leads/create/route.ts"),
    "utf8",
  );
  const rateIdx = source.indexOf("const perSpecialist = await checkRateLimit");
  const idempotencyIdx = source.indexOf("lookupLeadIdempotentReplay");
  assert.ok(rateIdx > 0 && idempotencyIdx > 0);
  assert.ok(idempotencyIdx < rateIdx);
  assert.match(source, /isPublicLeadTargetSpecialist/);
});

test("service-requests route returns replay before notification path", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/service-requests/route.ts"),
    "utf8",
  );
  const rateIdx = source.indexOf("const perIp = await checkRateLimit");
  const idempotencyIdx = source.indexOf("lookupServiceRequestIdempotentReplay");
  assert.ok(rateIdx > 0 && idempotencyIdx > 0);
  assert.ok(idempotencyIdx < rateIdx);
  assert.match(source, /shouldRunCreationSideEffects/);
  assert.match(source, /return NextResponse\.json\(replay\.response/);
});
