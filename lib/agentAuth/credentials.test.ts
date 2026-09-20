import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_API_KEY_PREFIX,
  generateAgentCredential,
  hashAgentCredential,
  parseAgentCredential,
  verifyAgentCredentialHash,
} from "./credentials.ts";

const PEPPER = "test-pepper-that-is-definitely-longer-than-32-characters";

test("generated agent credential is parseable and raw secret is never the stored hash", () => {
  const generated = generateAgentCredential(PEPPER);

  assert.match(generated.raw, /^frly_agent_[a-f0-9]{12}_[A-Za-z0-9_-]{40,96}$/);
  assert.equal(generated.raw.startsWith(AGENT_API_KEY_PREFIX), true);
  assert.equal(generated.keyPrefix.length, 12);
  assert.match(generated.credentialHash, /^[a-f0-9]{64}$/);
  assert.notEqual(generated.raw, generated.credentialHash);

  assert.deepEqual(parseAgentCredential(generated.raw), {
    keyPrefix: generated.keyPrefix,
    raw: generated.raw,
  });
  assert.equal(
    verifyAgentCredentialHash(
      generated.raw,
      PEPPER,
      generated.credentialHash,
    ),
    true,
  );
});

test("credential verification fails with a different pepper or credential", () => {
  const generated = generateAgentCredential(PEPPER);
  const otherPepper =
    "different-test-pepper-that-is-also-longer-than-32-characters";

  assert.equal(
    verifyAgentCredentialHash(
      generated.raw,
      otherPepper,
      generated.credentialHash,
    ),
    false,
  );

  const second = generateAgentCredential(PEPPER);
  assert.equal(
    verifyAgentCredentialHash(
      second.raw,
      PEPPER,
      generated.credentialHash,
    ),
    false,
  );
});

test("malformed credentials are rejected before database lookup", () => {
  assert.equal(parseAgentCredential(null), null);
  assert.equal(parseAgentCredential("Bearer abc"), null);
  assert.equal(parseAgentCredential("frly_agent_short_secret"), null);
  assert.equal(
    parseAgentCredential(
      "frly_agent_ZZZZZZZZZZZZ_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO",
    ),
    null,
  );
});

test("credential hashing requires a sufficiently strong server pepper", () => {
  assert.throws(
    () => hashAgentCredential("frly_agent_test", "too-short"),
    /at least 32 characters/,
  );
});
