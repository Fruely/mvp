import assert from "node:assert/strict";
import test from "node:test";
import {
  parseIssueAgentCredentialInput,
  parseRfc3339Timestamp,
} from "./validation.ts";

const NOW = new Date("2026-09-21T18:00:00.000Z");

test("strict RFC3339 timestamps with timezone are accepted and canonicalized", () => {
  assert.equal(
    parseRfc3339Timestamp("2026-12-01T00:00:00Z"),
    "2026-12-01T00:00:00.000Z",
  );
  assert.equal(
    parseRfc3339Timestamp("2026-12-01T00:00:00.000Z"),
    "2026-12-01T00:00:00.000Z",
  );
  assert.equal(
    parseRfc3339Timestamp("2026-12-01T01:00:00+01:00"),
    "2026-12-01T00:00:00.000Z",
  );
});

test("non-RFC3339 or timezone-less expiry values are rejected", () => {
  for (const value of [
    "2026-12-01",
    "2026-12-01T00:00:00",
    "December 1 2026",
    "12/01/2026",
    "2026-12-01 00:00:00Z",
    "2026-12-01T00:00:00+0100",
    "2026-12-01T00:00:00+01",
    "2026-12-01T00:00:00+25:00",
    "2026-12-01T00:00:00+01:60",
    "2026-12-01T00:00:00UTC",
  ]) {
    assert.equal(parseRfc3339Timestamp(value), null, value);
  }
});

test("invalid calendar dates are rejected before Date.parse can normalize them", () => {
  for (const value of [
    "2026-02-29T00:00:00Z",
    "2026-02-30T00:00:00Z",
    "2026-02-31T00:00:00Z",
    "2026-04-31T00:00:00Z",
    "2026-06-31T00:00:00Z",
    "2026-11-31T00:00:00Z",
  ]) {
    assert.equal(parseRfc3339Timestamp(value), null, value);
  }
});

test("valid month lengths and Gregorian leap days are accepted", () => {
  assert.equal(
    parseRfc3339Timestamp("2028-02-29T00:00:00Z"),
    "2028-02-29T00:00:00.000Z",
  );
  assert.equal(
    parseRfc3339Timestamp("2026-04-30T23:59:59Z"),
    "2026-04-30T23:59:59.000Z",
  );
  assert.equal(
    parseRfc3339Timestamp("2026-12-31T23:59:59Z"),
    "2026-12-31T23:59:59.000Z",
  );
});

test("issue input accepts canonical future RFC3339 and rejects loose dates", () => {
  assert.deepEqual(
    parseIssueAgentCredentialInput(
      { expires_at: "2026-12-01T00:00:00Z" },
      NOW,
    ),
    { expiresAt: "2026-12-01T00:00:00.000Z" },
  );
  assert.deepEqual(
    parseIssueAgentCredentialInput(
      { expires_at: "2026-12-01T01:00:00+01:00" },
      NOW,
    ),
    { expiresAt: "2026-12-01T00:00:00.000Z" },
  );

  const dateOnly = parseIssueAgentCredentialInput(
    { expires_at: "2026-12-01" },
    NOW,
  );
  assert.equal("error" in dateOnly, true);

  const naive = parseIssueAgentCredentialInput(
    { expires_at: "2026-12-01T00:00:00" },
    NOW,
  );
  assert.equal("error" in naive, true);

  const past = parseIssueAgentCredentialInput(
    { expires_at: "2026-01-01T00:00:00.000Z" },
    NOW,
  );
  assert.equal("error" in past, true);
  if ("error" in past) assert.match(past.error, /future/);
});
