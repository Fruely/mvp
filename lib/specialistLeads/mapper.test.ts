import assert from "node:assert/strict";
import test from "node:test";

import {
  assertClientSafeSpecialistLeadDto,
  buildSpecialistLeadPaginationOrFilter,
  decodeSpecialistLeadCursor,
  encodeSpecialistLeadCursor,
  isAllowedSpecialistLeadStatusFilter,
  leadIsAfterCursor,
  mapDashboardLeadToApiItem,
  normalizeSpecialistLeadLimit,
} from "./mapper.ts";
import { mapRowToDashboardLead } from "../leads/contactUnlock.ts";

test("mapDashboardLeadToApiItem exposes contact_available from server unlock state", () => {
  const locked = mapDashboardLeadToApiItem(
    mapRowToDashboardLead({
      id: "11111111-1111-1111-1111-111111111111",
      status: "new",
      created_at: "2026-08-16T10:00:00.000Z",
      message: "call me at test@example.com",
      contact_unlocked_at: null,
    }),
  );

  assert.equal(locked.contact_available, false);
  assert.equal(locked.contacts_unlocked, false);
  assert.equal(locked.client_email, null);
  assert.ok(locked.message_preview);

  const unlocked = mapDashboardLeadToApiItem(
    mapRowToDashboardLead({
      id: "11111111-1111-1111-1111-111111111111",
      status: "new",
      created_at: "2026-08-16T10:00:00.000Z",
      message: "hello",
      contact_unlocked_at: "2026-08-16T10:05:00.000Z",
      client_email: "client@example.com",
    }),
  );

  assert.equal(unlocked.contact_available, true);
  assert.equal(unlocked.client_email, "client@example.com");
});

test("DTO contract excludes internal fields", () => {
  const item = mapDashboardLeadToApiItem(
    mapRowToDashboardLead({
      id: "11111111-1111-1111-1111-111111111111",
      status: "new",
      created_at: "2026-08-16T10:00:00.000Z",
      message: "hello",
    }),
  );

  assert.doesNotThrow(() => assertClientSafeSpecialistLeadDto(item));
});

test("same-created_at pagination tie-break uses id", () => {
  const cursor = { created_at: "2026-08-16T10:00:00.000Z", id: "a" };
  assert.equal(
    leadIsAfterCursor({ created_at: "2026-08-16T10:00:00.000Z", id: "b" }, cursor),
    true,
  );
  assert.equal(
    leadIsAfterCursor({ created_at: "2026-08-16T10:00:00.000Z", id: "a" }, cursor),
    false,
  );
  assert.match(buildSpecialistLeadPaginationOrFilter(cursor), /id\.gt\.a/);
});

test("cursor roundtrip and limit normalization", () => {
  const encoded = encodeSpecialistLeadCursor({
    created_at: "2026-08-16T10:00:00.000Z",
    id: "lead-1",
  });
  assert.deepEqual(decodeSpecialistLeadCursor(encoded), {
    created_at: "2026-08-16T10:00:00.000Z",
    id: "lead-1",
  });
  assert.equal(normalizeSpecialistLeadLimit("999"), 50);
  assert.equal(normalizeSpecialistLeadLimit(undefined), 20);
  assert.equal(isAllowedSpecialistLeadStatusFilter("new"), true);
  assert.equal(isAllowedSpecialistLeadStatusFilter("bogus"), false);
});
