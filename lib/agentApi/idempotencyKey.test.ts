import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { normalizeClientIdempotencyKey } from "../mutations/clientIdempotency.ts";
import {
  AGENT_CREATE_SERVICE_REQUEST_IDEMPOTENCY_PREFIX,
  deriveAgentCreateServiceRequestStorageKey,
} from "./idempotencyKey.ts";

const EXTERNAL_KEY = "request:12345678";
const CLIENT_A = "client-consumer-1";
const CLIENT_B = "client-business-1";

test("derived storage key is stable and passes existing key constraints", () => {
  const first = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: CLIENT_A,
    externalKey: EXTERNAL_KEY,
  });
  const second = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: CLIENT_A,
    externalKey: ` ${EXTERNAL_KEY} `,
  });
  assert.ok(first);
  assert.equal(first, second);
  assert.equal(normalizeClientIdempotencyKey(first), first);
  assert.ok(first.length <= 128);
  assert.ok(first.length >= 8);
  assert.equal(
    first.startsWith(`${AGENT_CREATE_SERVICE_REQUEST_IDEMPOTENCY_PREFIX}:`),
    true,
  );
  assert.notEqual(first, EXTERNAL_KEY);

  const digest = createHash("sha256")
    .update(CLIENT_A)
    .update("\0")
    .update(EXTERNAL_KEY)
    .digest("hex");
  assert.equal(
    first,
    `${AGENT_CREATE_SERVICE_REQUEST_IDEMPOTENCY_PREFIX}:${digest}`,
  );
});

test("different agent clients derive different storage keys for the same external key", () => {
  const a = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: CLIENT_A,
    externalKey: EXTERNAL_KEY,
  });
  const b = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: CLIENT_B,
    externalKey: EXTERNAL_KEY,
  });
  assert.ok(a);
  assert.ok(b);
  assert.notEqual(a, b);
});

test("rejects invalid external keys instead of inventing a storage key", () => {
  assert.equal(
    deriveAgentCreateServiceRequestStorageKey({
      agentClientId: CLIENT_A,
      externalKey: "short",
    }),
    null,
  );
  assert.equal(
    deriveAgentCreateServiceRequestStorageKey({
      agentClientId: "",
      externalKey: EXTERNAL_KEY,
    }),
    null,
  );
});
