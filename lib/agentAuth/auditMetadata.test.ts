import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_AUDIT_METADATA_ALLOWED_KEYS,
  AGENT_AUDIT_METADATA_MAX_STRING_LENGTH,
  isSensitiveAuditMetadataKey,
  sanitizeAgentAuditMetadata,
  type AgentAuditMetadata,
} from "./auditMetadata.ts";

test("sanitizer keeps only allowlisted primitive fields", () => {
  const sanitized = sanitizeAgentAuditMetadata({
    reason: "missing_scope",
    missing_scope_count: 2,
    client_type: "consumer_agent",
    delegation_reason: "expired",
  });

  assert.deepEqual(sanitized, {
    reason: "missing_scope",
    missing_scope_count: 2,
    client_type: "consumer_agent",
    delegation_reason: "expired",
  });
});

test("sanitizer drops unknown keys, nested objects and arrays", () => {
  const sanitized = sanitizeAgentAuditMetadata({
    reason: "authorized",
    extra: "nope",
    nested: { reason: "hidden" },
    list: ["a"],
  } as AgentAuditMetadata);

  assert.deepEqual(sanitized, { reason: "authorized" });
  assert.equal("extra" in sanitized, false);
  assert.equal("nested" in sanitized, false);
  assert.equal("list" in sanitized, false);
});

test("sanitizer drops sensitive keys regardless of case and never returns them", () => {
  const sensitiveKeys = [
    "authorization",
    "Authorization",
    "token",
    "TOKEN",
    "credential",
    "api_key",
    "apiKey",
    "secret",
    "password",
    "cookie",
    "email",
    "phone",
    "contact",
    "body",
    "payload",
    "request_body",
    "ip",
    "ip_address",
    "IP_ADDRESS",
  ];

  for (const key of sensitiveKeys) {
    assert.equal(isSensitiveAuditMetadataKey(key), true, key);
  }

  const payload = Object.fromEntries(
    sensitiveKeys.map((key) => [key, `dropped-${key}`]),
  ) as AgentAuditMetadata;
  payload.reason = "invalid_credential";

  const sanitized = sanitizeAgentAuditMetadata(payload);
  assert.deepEqual(Object.keys(sanitized), ["reason"]);
  assert.equal(sanitized.reason, "invalid_credential");
  for (const key of sensitiveKeys) {
    assert.equal(key in sanitized, false);
    assert.equal(JSON.stringify(sanitized).includes(`dropped-${key}`), false);
  }
});

test("sanitizer truncates strings and drops non-finite numbers", () => {
  const sanitized = sanitizeAgentAuditMetadata({
    reason: `  ${"x".repeat(AGENT_AUDIT_METADATA_MAX_STRING_LENGTH + 20)}  `,
    missing_scope_count: Number.POSITIVE_INFINITY,
    client_type: "   ",
  });

  assert.equal(sanitized.reason, "x".repeat(AGENT_AUDIT_METADATA_MAX_STRING_LENGTH));
  assert.equal("missing_scope_count" in sanitized, false);
  assert.equal(sanitized.client_type, null);
});

test("allowlisted metadata keys are not themselves sensitive", () => {
  for (const key of AGENT_AUDIT_METADATA_ALLOWED_KEYS) {
    assert.equal(isSensitiveAuditMetadataKey(key), false, key);
  }
});
