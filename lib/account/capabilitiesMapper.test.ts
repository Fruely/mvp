import assert from "node:assert/strict";
import test from "node:test";

import {
  assertClientSafeCapabilitiesDto,
  buildAccountCapabilitiesDto,
  mapSpecialistOverview,
} from "./capabilitiesMapper.ts";

test("client-only account returns specialist null with capabilities false", () => {
  const dto = buildAccountCapabilitiesDto({ specialist: null, partner: null });
  assert.equal(dto.capabilities.specialist, false);
  assert.equal(dto.capabilities.partner, false);
  assert.equal(dto.specialist, null);
  assert.equal(dto.partner, null);
});

test("linked specialist sets capabilities.specialist true", () => {
  const specialist = mapSpecialistOverview({
    row: {
      id: "spec-1",
      slug: "anna-smith",
      name: "Anna Smith",
      status: "draft",
      is_active: false,
      is_visible: false,
      work_format: "online",
    },
    city: "Berlin",
    categoryLabel: "Coaching",
    gate: { state: "incomplete", publicationReady: false },
    planCode: "starter",
  });

  const dto = buildAccountCapabilitiesDto({ specialist, partner: null });
  assert.equal(dto.capabilities.specialist, true);
  assert.equal(dto.specialist?.id, "spec-1");
  assert.equal(dto.specialist?.onboarding_gate, "incomplete");
  assert.equal(dto.specialist?.publication_ready, false);
});

test("public_profile_available requires slug and canonical public visibility", () => {
  const hidden = mapSpecialistOverview({
    row: {
      id: "spec-1",
      slug: "anna-smith",
      name: "Anna",
      status: "draft",
      is_active: false,
      is_visible: false,
    },
    city: null,
    categoryLabel: null,
    gate: { state: "incomplete", publicationReady: false },
    planCode: "starter",
  });
  assert.equal(hidden.public_profile_available, false);

  const visible = mapSpecialistOverview({
    row: {
      id: "spec-2",
      slug: "anna-live",
      name: "Anna",
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      billing_visibility_blocked: false,
      is_test: false,
    },
    city: null,
    categoryLabel: null,
    gate: { state: "published", publicationReady: true },
    planCode: "starter",
  });
  assert.equal(visible.public_profile_available, true);
});

test("test specialists can still resolve overview for owner without public profile", () => {
  const row = mapSpecialistOverview({
    row: {
      id: "spec-test",
      slug: "test-slug",
      name: "Test",
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      is_test: true,
    },
    city: null,
    categoryLabel: null,
    gate: { state: "published", publicationReady: true },
    planCode: "starter",
  });
  assert.equal(row.public_profile_available, false);
});

test("published gate when status is published", () => {
  const row = mapSpecialistOverview({
    row: {
      id: "spec-3",
      status: "featured_verified",
      is_active: true,
      is_visible: true,
    },
    city: "Kyiv",
    categoryLabel: "Design",
    gate: { state: "published", publicationReady: true },
    planCode: "pro",
  });
  assert.equal(row.onboarding_gate, "published");
  assert.equal(row.publication_ready, true);
  assert.equal(row.plan_code, "pro");
  assert.equal(row.can_unlock_contacts, true);
  assert.equal(row.billing_access_state, "active");
});

test("partner capability coexists with specialist", () => {
  const specialist = mapSpecialistOverview({
    row: { id: "spec-1", status: "draft" },
    city: null,
    categoryLabel: null,
    gate: { state: "incomplete", publicationReady: false },
    planCode: "starter",
  });
  const dto = buildAccountCapabilitiesDto({
    specialist,
    partner: { id: "partner-1", status: "active" },
  });
  assert.equal(dto.capabilities.specialist, true);
  assert.equal(dto.capabilities.partner, true);
});

test("inactive plan_status blocks contact unlock entitlement", () => {
  const row = mapSpecialistOverview({
    row: { id: "spec-1", status: "draft" },
    city: null,
    categoryLabel: null,
    gate: { state: "incomplete", publicationReady: false },
    planCode: "basic",
    planStatus: "inactive",
    graceUntil: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(row.can_unlock_contacts, false);
  assert.equal(row.billing_access_state, "inactive");
  assert.equal(row.plan_status, "inactive");
  assert.equal(row.grace_until, "2026-08-01T00:00:00.000Z");
});

test("grace plan_status still allows contact unlock", () => {
  const row = mapSpecialistOverview({
    row: { id: "spec-1", status: "draft" },
    city: null,
    categoryLabel: null,
    gate: { state: "incomplete", publicationReady: false },
    planCode: "basic",
    planStatus: "grace",
    graceUntil: "2026-08-25T00:00:00.000Z",
  });
  assert.equal(row.can_unlock_contacts, true);
  assert.equal(row.billing_access_state, "grace");
});

test("DTO contract excludes private fields", () => {
  const dto = buildAccountCapabilitiesDto({
    specialist: mapSpecialistOverview({
      row: { id: "spec-1", status: "draft" },
      city: null,
      categoryLabel: null,
      gate: { state: "ready", publicationReady: true },
      planCode: "starter",
    }),
    partner: { id: "p-1", status: "active" },
  });
  assert.doesNotThrow(() => assertClientSafeCapabilitiesDto(dto));
});

test("unsafe specialist fields fail contract guard", () => {
  const dto = buildAccountCapabilitiesDto({
    specialist: {
      ...(mapSpecialistOverview({
        row: { id: "spec-1", status: "draft" },
        city: null,
        categoryLabel: null,
        gate: { state: "incomplete", publicationReady: false },
        planCode: "starter",
      }) as Record<string, unknown>),
      telegram_chat_id: "secret",
    } as never,
    partner: null,
  });

  assert.throws(() => assertClientSafeCapabilitiesDto(dto), /unsafe specialist field/);
});
