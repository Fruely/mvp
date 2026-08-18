import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN } from "../billing/contactUnlockEntitlement.ts";
import {
  mapRowToDashboardLead,
} from "../leads/contactUnlock.ts";
import {
  assertClientSafeSpecialistLeadDto,
  mapDashboardLeadToApiItem,
} from "./mapper.ts";

const servicePath = fileURLToPath(new URL("./service.ts", import.meta.url));
const unlockRoutePath = fileURLToPath(
  new URL("../../app/api/specialist/leads/[id]/unlock-contacts/route.ts", import.meta.url),
);

const LEAD_ID = "11111111-1111-1111-1111-111111111111";

function toApiDto(row: Record<string, unknown>) {
  return assertClientSafeSpecialistLeadDto(
    mapDashboardLeadToApiItem(mapRowToDashboardLead(row)),
  );
}

function lockedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    status: "new",
    created_at: "2026-08-16T10:00:00.000Z",
    contact_unlocked_at: null,
    client_name: "Anna Client",
    client_email: "anna@example.com",
    client_phone: "+491701234567",
    message: "Please call me at +491701234567",
    ...overrides,
  };
}

test("unlock service gates first unlock on canUnlockLeadContacts before mutation", async () => {
  const src = await readFile(servicePath, "utf8");
  const start = src.indexOf("export async function unlockSpecialistLeadContacts");
  const end = src.indexOf("export async function", start + 1);
  const unlockFn = end === -1 ? src.slice(start) : src.slice(start, end);

  const alreadyUnlocked = unlockFn.indexOf("if (mapped.contacts_unlocked)");
  const entitlement = unlockFn.indexOf("canUnlockLeadContacts");
  const persist = unlockFn.indexOf("contact_unlocked_at: nowIso");

  assert.ok(alreadyUnlocked >= 0);
  assert.ok(entitlement > alreadyUnlocked);
  assert.ok(persist > entitlement);
  assert.match(unlockFn, /ContactUnlockEntitlementError/);
  assert.match(unlockFn, /from\("specialist_plan"\)/);
  assert.match(unlockFn, /\.is\("contact_unlocked_at", null\)/);
});

test("unlock route maps entitlement error to 403 CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN", async () => {
  const src = await readFile(unlockRoutePath, "utf8");
  assert.match(src, /isContactUnlockEntitlementError/);
  assert.match(
    src,
    /error: CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN[\s\S]*status: 403/,
  );
  assert.doesNotMatch(src, /error: CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN[\s\S]*status: 200/);
});

test("status update never writes contact_unlocked_at", async () => {
  const src = await readFile(servicePath, "utf8");
  const start = src.indexOf("export async function updateSpecialistLeadStatus");
  const end = src.indexOf("export async function unlockSpecialistLeadContacts");
  const statusFn = src.slice(start, end);

  assert.match(statusFn, /update\(\{ status: nextStatus \}\)/);
  assert.doesNotMatch(statusFn, /contact_unlocked_at/);
  assert.doesNotMatch(statusFn, /canUnlockLeadContacts/);
});

test("LOCKED + INACTIVE DTO remains redacted", () => {
  const dto = toApiDto(lockedRow({ status: "new" }));
  assert.equal(dto.contacts_unlocked, false);
  assert.equal(dto.client_name, null);
  assert.equal(dto.client_email, null);
  assert.equal(dto.client_phone, null);
  assert.equal(dto.message, null);
  assert.ok(dto.message_preview);
  assert.doesNotMatch(dto.message_preview ?? "", /anna@example.com/);
  assert.doesNotMatch(dto.message_preview ?? "", /491701234567/);
});

test("INACTIVE + accepted/contacted/closed cannot reveal contacts via status", () => {
  for (const status of ["accepted", "contacted", "closed"] as const) {
    const dto = toApiDto(lockedRow({ status }));
    assert.equal(dto.contacts_unlocked, false, status);
    assert.equal(dto.client_email, null, status);
    assert.equal(dto.client_phone, null, status);
    assert.equal(dto.client_name, null, status);
    assert.equal(dto.message, null, status);
  }
});

test("ALREADY UNLOCKED remains readable after later inactive billing", () => {
  const dto = toApiDto(
    lockedRow({
      contact_unlocked_at: "2026-08-10T12:00:00.000Z",
      status: "accepted",
    }),
  );
  assert.equal(dto.contacts_unlocked, true);
  assert.equal(dto.client_email, "anna@example.com");
  assert.equal(dto.client_phone, "+491701234567");
  assert.equal(dto.client_name, "Anna Client");
  assert.equal(CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN, "CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN");
});
