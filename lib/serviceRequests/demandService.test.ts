import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getClientRequestHistoryDetail } from "../clientRequests/historyService.ts";
import {
  CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES,
  CLIENT_CANCEL_DISALLOWED_SERVICE_REQUEST_STATUSES,
  CLIENT_CANCELLED_SERVICE_REQUEST_STATUS,
} from "./cancelPolicy.ts";
import {
  buildServiceRequestIdempotencyFingerprint,
  createServiceRequest,
  notifyIfServiceRequestCreated,
  persistNewServiceRequest,
} from "./createServiceRequest.ts";
import { cancelOwnedServiceRequest, getOwnedServiceRequest } from "./ownedServiceRequest.ts";
import { createMockServiceClient, harness, resetHarness } from "./serviceRequests.harness.mjs";
import type { ValidatedServiceRequestCreate } from "./validation.ts";

const OWNER_ID = "user-owner-1";
const OTHER_ID = "user-other-2";
const PUBLIC_ID = "REQ-20260921-ABCDEF";
const IDEMPOTENCY_KEY = "native:demand:abc12345";

const validated: ValidatedServiceRequestCreate = {
  client_name: "Anna",
  client_email: "anna@example.com",
  client_phone: null,
  description: "Need bookkeeping help",
  requested_service: null,
  subcategory_text: null,
  client_budget_text: null,
  preferred_contact_method: null,
  preferred_language: "ru",
  work_format: "online",
  city: null,
  postal_code: null,
  country_code: null,
  radius_km: null,
  urgency: "flexible",
  desired_date: null,
  service_timing: {
    service_timing_type: "flexible_period",
    service_timing_date: null,
    service_timing_time: null,
    service_timing_date_end: null,
    service_timing_period: "flexible",
    service_timing_note: null,
  },
  locale: "ru",
  category_id: null,
  category_text: "Бухгалтерия",
  source_path: "/ru/request",
};

function client() {
  return createMockServiceClient();
}

async function create(overrides: Record<string, unknown> = {}) {
  return createServiceRequest({
    supabase: client(),
    validated,
    clientUserId: null,
    ...overrides,
  });
}

function seedOwnedRequest(status: string, userId = OWNER_ID, publicId = PUBLIC_ID) {
  harness.rows.push({
    id: "sr-1",
    public_id: publicId,
    created_at: "2026-09-21T10:00:00.000Z",
    updated_at: "2026-09-21T10:00:00.000Z",
    status,
    client_user_id: userId,
    category_text: "Бухгалтерия",
    description: "Need bookkeeping help",
    preferred_language: "ru",
    work_format: "online",
    city: "Berlin",
    postal_code: "10115",
    client_email: "secret@example.com",
    client_phone: "+49123",
    client_name: "Anna",
  });
}

test.beforeEach(() => {
  resetHarness();
});

test("create persists a new request as status=new", async () => {
  const result = await create();
  assert.equal(result.kind, "created");
  if (result.kind !== "created") return;
  assert.match(result.public_id, /^REQ-/);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].status, "new");
  assert.equal(harness.rows[0].client_user_id, null);
  assert.equal(harness.rows[0].source, "assisted_search");
  assert.equal(harness.rows[0].description, "Need bookkeeping help");
});

test("anonymous create leaves client_user_id null", async () => {
  const result = await create({ clientUserId: null });
  assert.equal(result.kind, "created");
  assert.equal(harness.rows[0].client_user_id, null);
});

test("authenticated create binds client_user_id", async () => {
  const result = await create({ clientUserId: OWNER_ID });
  assert.equal(result.kind, "created");
  assert.equal(harness.rows[0].client_user_id, OWNER_ID);
});

test("same idempotency key and payload replays without a second row", async () => {
  const first = await create({
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  const second = await create({
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });

  assert.equal(first.kind, "created");
  assert.equal(second.kind, "replayed");
  if (first.kind !== "created" || second.kind !== "replayed") return;
  assert.equal(second.public_id, first.public_id);
  assert.equal(harness.rows.length, 1);
});

test("same key with a different payload is a conflict", async () => {
  await create({
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  const conflict = await createServiceRequest({
    supabase: client(),
    validated: { ...validated, description: "A different task" },
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  assert.equal(conflict.kind, "conflict");
  assert.equal(harness.rows.length, 1);
});

test("same key with a different owner is an ownership conflict", async () => {
  await create({
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  const conflict = await create({
    clientUserId: OTHER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  assert.equal(conflict.kind, "ownership_conflict");
  assert.equal(harness.rows.length, 1);
});

test("public_id unique collision retries with a new id", async () => {
  harness.rows.push({
    public_id: "REQ-COLLIDE",
    client_user_id: null,
    status: "new",
  });
  let calls = 0;
  const retried = await create({
    generatePublicId() {
      calls += 1;
      return calls === 1 ? "REQ-COLLIDE" : "REQ-OKAY01";
    },
  });
  assert.equal(retried.kind, "created");
  if (retried.kind !== "created") return;
  assert.equal(retried.public_id, "REQ-OKAY01");
  assert.equal(calls, 2);
  assert.equal(
    harness.rows.filter((row) => row.public_id === "REQ-OKAY01").length,
    1,
  );
});

test("unique-key race during insert replays the winning row", async () => {
  const fingerprint = buildServiceRequestIdempotencyFingerprint(validated);
  harness.rows.push({
    public_id: "REQ-WINNER",
    created_at: "2026-09-21T10:00:00.000Z",
    client_idempotency_key: IDEMPOTENCY_KEY,
    client_idempotency_fingerprint: fingerprint,
    client_user_id: OWNER_ID,
  });
  const result = await persistNewServiceRequest({
    supabase: client(),
    validated,
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  assert.equal(result.kind, "replayed");
  if (result.kind !== "replayed") return;
  assert.equal(result.public_id, "REQ-WINNER");
  assert.equal(harness.rows.length, 1);
});

test("creation side effects run only for a real create, not replay", async () => {
  const notifications: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
  const notify = async (eventType: string, payload: Record<string, unknown>) => {
    notifications.push({ eventType, payload });
  };

  const first = await create({
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  await notifyIfServiceRequestCreated(first, validated, notify);

  const second = await create({
    clientUserId: OWNER_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  await notifyIfServiceRequestCreated(second, validated, notify);

  assert.equal(first.kind, "created");
  assert.equal(second.kind, "replayed");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.eventType, "NEW_SERVICE_REQUEST");
  assert.equal(notifications[0]?.payload.public_id, first.kind === "created" ? first.public_id : null);
  assert.equal(notifications[0]?.payload.description, undefined);
  assert.equal(notifications[0]?.payload.client_email, undefined);
});

test("owner can read their request through the history projection", async () => {
  seedOwnedRequest("new");
  const owned = await getOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  const history = await getClientRequestHistoryDetail(
    client(),
    OWNER_ID,
    "service_request",
    PUBLIC_ID,
  );

  assert.ok(owned);
  assert.deepEqual(owned, history);
  assert.equal(owned?.kind, "service_request");
  assert.equal(owned?.id, PUBLIC_ID);
  assert.equal(owned?.public_id, PUBLIC_ID);
  assert.equal(owned?.status, "new");
  assert.equal(owned?.description, "Need bookkeeping help");
});

test("another user cannot read an owned request", async () => {
  seedOwnedRequest("new");
  const owned = await getOwnedServiceRequest(client(), OTHER_ID, PUBLIC_ID);
  assert.equal(owned, null);
});

test("unknown public_id is not found", async () => {
  const owned = await getOwnedServiceRequest(client(), OWNER_ID, "REQ-MISSING");
  assert.equal(owned, null);
});

test("owned read keeps the client-safe projection and omits contacts", async () => {
  seedOwnedRequest("reviewing");
  const owned = await getOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  const serialized = JSON.stringify(owned);
  assert.doesNotMatch(serialized, /secret@example\.com/);
  assert.doesNotMatch(serialized, /\+49123/);
  assert.equal(owned && "client_email" in owned, false);
  assert.equal(owned && "client_phone" in owned, false);
  assert.equal(owned && "client_name" in owned, false);
  assert.equal(owned?.category_label, "Бухгалтерия");
});

test("owner can cancel from every explicitly allowed status", async () => {
  for (const status of CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES) {
    resetHarness();
    seedOwnedRequest(status, OWNER_ID, `REQ-${status.toUpperCase()}`);
    const result = await cancelOwnedServiceRequest(
      client(),
      OWNER_ID,
      `REQ-${status.toUpperCase()}`,
      "2026-09-21T12:00:00.000Z",
    );
    assert.equal(result.kind, "cancelled", status);
    assert.equal(harness.rows[0].status, CLIENT_CANCELLED_SERVICE_REQUEST_STATUS);
  }
});

test("already cancelled is idempotent success", async () => {
  seedOwnedRequest("cancelled");
  const result = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  assert.equal(result.kind, "already_cancelled");
  assert.equal(result.kind === "already_cancelled" && result.status, "cancelled");
  assert.equal(harness.rows[0].status, "cancelled");
});

test("another user cannot cancel and sees not found", async () => {
  seedOwnedRequest("new");
  const result = await cancelOwnedServiceRequest(client(), OTHER_ID, PUBLIC_ID);
  assert.equal(result.kind, "not_found");
  assert.equal(harness.rows[0].status, "new");
});

test("unknown id cannot be cancelled", async () => {
  const result = await cancelOwnedServiceRequest(client(), OWNER_ID, "REQ-MISSING");
  assert.equal(result.kind, "not_found");
});

test("closed cannot be cancelled", async () => {
  seedOwnedRequest("closed");
  const result = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  assert.equal(result.kind, "not_cancellable");
  assert.equal(result.kind === "not_cancellable" && result.status, "closed");
  assert.equal(harness.rows[0].status, "closed");
});

test("spam cannot be cancelled", async () => {
  seedOwnedRequest("spam");
  const result = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  assert.equal(result.kind, "not_cancellable");
  assert.equal(harness.rows[0].status, "spam");
});

test("every disallowed status is fail-closed", async () => {
  assert.deepEqual(CLIENT_CANCEL_DISALLOWED_SERVICE_REQUEST_STATUSES, [
    "matched",
    "closed",
    "spam",
  ]);
  for (const status of CLIENT_CANCEL_DISALLOWED_SERVICE_REQUEST_STATUSES) {
    resetHarness();
    seedOwnedRequest(status);
    const result = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
    assert.equal(result.kind, "not_cancellable", status);
    assert.equal(harness.rows[0].status, status);
  }
});

test("status-changed update fails closed without a second unconditional write", async () => {
  seedOwnedRequest("searching");
  harness.rows[0].status = "closed";
  const result = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  assert.equal(result.kind, "not_cancellable");
  assert.equal(harness.rows[0].status, "closed");
});

test("concurrent cancel of an already-won row is idempotent", async () => {
  seedOwnedRequest("new");
  const first = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  const second = await cancelOwnedServiceRequest(client(), OWNER_ID, PUBLIC_ID);
  assert.equal(first.kind, "cancelled");
  assert.equal(second.kind, "already_cancelled");
});

test("idempotency fingerprint is stable for the same validated payload", () => {
  assert.equal(
    buildServiceRequestIdempotencyFingerprint(validated),
    buildServiceRequestIdempotencyFingerprint({ ...validated }),
  );
  assert.notEqual(
    buildServiceRequestIdempotencyFingerprint(validated),
    buildServiceRequestIdempotencyFingerprint({ ...validated, description: "other" }),
  );
});

test("POST /api/service-requests still owns HTTP concerns and delegates persistence", () => {
  const source = readFileSync(join(process.cwd(), "app/api/service-requests/route.ts"), "utf8");
  assert.match(source, /persistNewServiceRequest/);
  assert.match(source, /lookupServiceRequestIdempotentReplay/);
  assert.match(source, /notifyIfServiceRequestCreated/);
  assert.match(source, /checkRateLimit/);
  assert.match(source, /resolveBearerAuthUser/);
  assert.match(source, /cookies\(\)/);
  assert.match(source, /\{ ok: true, public_id:/);
  assert.doesNotMatch(source, /status: "new"/);
  assert.doesNotMatch(source, /NEW_SERVICE_REQUEST/);
});

test("client history endpoints still use getClientRequestHistoryDetail", () => {
  const listSource = readFileSync(
    join(process.cwd(), "app/api/client/requests/route.ts"),
    "utf8",
  );
  const detailSource = readFileSync(
    join(process.cwd(), "app/api/client/requests/[kind]/[id]/route.ts"),
    "utf8",
  );
  assert.match(listSource, /listClientRequestHistory/);
  assert.match(detailSource, /getClientRequestHistoryDetail/);
  assert.doesNotMatch(detailSource, /cancelOwnedServiceRequest/);
});
