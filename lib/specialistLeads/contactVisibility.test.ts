import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCKED_CONTACT_MASK,
  mapRowToDashboardLead,
  sanitizeLockedLeadPreview,
} from "../leads/contactUnlock.ts";
import {
  assertClientSafeSpecialistLeadDto,
  mapDashboardLeadToApiItem,
} from "./mapper.ts";

const LEAD_ID = "11111111-1111-1111-1111-111111111111";

/** Same pipeline as `toApiItem()` in service.ts after a trusted FULL_SELECT read. */
function toApiDto(row: Record<string, unknown>) {
  return assertClientSafeSpecialistLeadDto(
    mapDashboardLeadToApiItem(mapRowToDashboardLead(row)),
  );
}

function fullUnlockedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    status: "new",
    created_at: "2026-08-16T10:00:00.000Z",
    contact_unlocked_at: "2026-08-16T10:05:00.000Z",
    client_name: "Anna Client",
    client_email: "anna@example.com",
    client_phone: "+491701234567",
    message: "Please call me back",
    ...overrides,
  };
}

test("locked detail: contact_available false, PII null, sanitized preview", () => {
  const dto = toApiDto({
    id: LEAD_ID,
    status: "new",
    created_at: "2026-08-16T10:00:00.000Z",
    contact_unlocked_at: null,
    client_name: "Secret",
    client_email: "secret@example.com",
    client_phone: "+491701234567",
    message: "Reach me at secret@example.com or +491701234567",
  });

  assert.equal(dto.contact_available, false);
  assert.equal(dto.contacts_unlocked, false);
  assert.equal(dto.client_name, null);
  assert.equal(dto.client_email, null);
  assert.equal(dto.client_phone, null);
  assert.equal(dto.message, null);
  assert.ok(dto.message_preview);
  assert.ok(dto.message_preview!.includes(LOCKED_CONTACT_MASK));
  assert.doesNotMatch(dto.message_preview!, /secret@example.com/);
});

test("unlocked detail reload returns full allowed contact data", () => {
  const dto = toApiDto(fullUnlockedRow());

  assert.equal(dto.contact_available, true);
  assert.equal(dto.client_name, "Anna Client");
  assert.equal(dto.client_email, "anna@example.com");
  assert.equal(dto.client_phone, "+491701234567");
  assert.equal(dto.message, "Please call me back");
  assert.equal(dto.message_preview, null);
});

test("unlocked list item includes contacts (matches Web LeadsTable)", () => {
  const listItem = toApiDto(fullUnlockedRow());

  assert.equal(listItem.contact_available, true);
  assert.equal(listItem.client_name, "Anna Client");
  assert.equal(listItem.client_email, "anna@example.com");
  assert.equal(listItem.client_phone, "+491701234567");
  assert.equal(listItem.message, "Please call me back");
});

test("status update response preserves contact data for unlocked lead", () => {
  const dto = toApiDto(fullUnlockedRow({ status: "accepted" }));

  assert.equal(dto.status, "accepted");
  assert.equal(dto.contact_available, true);
  assert.equal(dto.client_name, "Anna Client");
  assert.equal(dto.client_email, "anna@example.com");
  assert.equal(dto.client_phone, "+491701234567");
  assert.equal(dto.message, "Please call me back");
});

test("same-target status retry preserves contact data for unlocked lead", () => {
  const dto = toApiDto(fullUnlockedRow({ status: "contacted" }));

  assert.equal(dto.status, "contacted");
  assert.equal(dto.contact_available, true);
  assert.equal(dto.client_name, "Anna Client");
  assert.equal(dto.client_email, "anna@example.com");
});

test("legacy accepted/contacted/closed without contact_unlocked_at are unlocked", () => {
  for (const status of ["accepted", "contacted", "closed"] as const) {
    const dto = toApiDto({
      id: LEAD_ID,
      status,
      created_at: "2026-08-16T10:00:00.000Z",
      contact_unlocked_at: null,
      client_name: "Legacy Client",
      client_email: "legacy@example.com",
      client_phone: "+491709999999",
      message: "Legacy message",
    });

    assert.equal(dto.contact_available, true, status);
    assert.equal(dto.client_name, "Legacy Client", status);
    assert.equal(dto.client_email, "legacy@example.com", status);
    assert.equal(dto.client_phone, "+491709999999", status);
    assert.equal(dto.message, "Legacy message", status);
  }
});

test("locked message with embedded email/phone keeps sanitized preview only", () => {
  const raw = "Email test@example.com and phone +491701234567 please";
  const preview = sanitizeLockedLeadPreview(raw);

  assert.ok(preview);
  assert.doesNotMatch(preview!, /test@example.com/);
  assert.doesNotMatch(preview!, /491701234567/);
  assert.ok(preview!.includes(LOCKED_CONTACT_MASK));

  const dto = toApiDto({
    id: LEAD_ID,
    status: "new",
    created_at: "2026-08-16T10:00:00.000Z",
    contact_unlocked_at: null,
    message: raw,
    client_email: "test@example.com",
    client_phone: "+491701234567",
  });

  assert.equal(dto.client_email, null);
  assert.equal(dto.client_phone, null);
  assert.equal(dto.message, null);
});

test("full DB row for locked lead never serializes contact PII in DTO", () => {
  const dto = toApiDto({
    id: LEAD_ID,
    status: "new",
    created_at: "2026-08-16T10:00:00.000Z",
    contact_unlocked_at: null,
    client_name: "Must Not Leak",
    client_email: "leak@example.com",
    client_phone: "+491701234567",
    message: "Sensitive full message",
  });

  assert.equal(dto.contact_available, false);
  assert.equal(dto.client_name, null);
  assert.equal(dto.client_email, null);
  assert.equal(dto.client_phone, null);
  assert.equal(dto.message, null);
  assert.ok(dto.message_preview);
});

test("regression: unlocked flag without contact columns is inconsistent until full row is loaded", () => {
  const bugState = mapDashboardLeadToApiItem(
    mapRowToDashboardLead({
      id: LEAD_ID,
      status: "new",
      created_at: "2026-08-16T10:00:00.000Z",
      contact_unlocked_at: "2026-08-16T10:05:00.000Z",
    }),
  );

  assert.equal(bugState.contact_available, true);
  assert.equal(bugState.client_email, null);

  const fixed = toApiDto(fullUnlockedRow());
  assert.equal(fixed.contact_available, true);
  assert.equal(fixed.client_email, "anna@example.com");
});
