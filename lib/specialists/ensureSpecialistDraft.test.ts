import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureSpecialistDraft,
  type SpecialistDraftIdentity,
  type SpecialistDraftStore,
} from "./ensureSpecialistDraft.ts";

function store(overrides: Partial<SpecialistDraftStore> = {}): SpecialistDraftStore & {
  profiles: string[];
} {
  const profiles: string[] = [];
  return {
    profiles,
    findByUserId: async () => null,
    insertDraft: async () => ({ ok: true, specialist: { id: "spec-1", status: "draft" } }),
    ensureProfileRow: async (specialistId: string) => {
      profiles.push(specialistId);
    },
    ...overrides,
  };
}

test("creates a draft when the user has no specialist row", async () => {
  const draftStore = store();
  const result = await ensureSpecialistDraft(draftStore, {
    userId: "user-1",
    email: "owner@example.com",
  });

  assert.deepEqual(result, {
    ok: true,
    specialist: { id: "spec-1", status: "draft" },
    created: true,
  });
  assert.deepEqual(draftStore.profiles, ["spec-1"]);
});

test("returns an existing specialist without inserting another row", async () => {
  let inserted = 0;
  const result = await ensureSpecialistDraft(
    store({
      findByUserId: async () => ({ id: "spec-existing", status: "published_unverified" }),
      insertDraft: async () => {
        inserted += 1;
        return { ok: false, reason: "failed" };
      },
    }),
    { userId: "user-1", email: null },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, false);
    assert.equal(result.specialist.id, "spec-existing");
  }
  assert.equal(inserted, 0);
});

test("treats a unique conflict as the row created by the other request", async () => {
  const calls: SpecialistDraftIdentity[] = [];
  const result = await ensureSpecialistDraft(
    store({
      findByUserId: async () => (calls.length === 0 ? null : { id: "spec-raced", status: "draft" }),
      insertDraft: async () => {
        calls.push({ id: "ignored", status: "draft" });
        return { ok: false, reason: "duplicate" };
      },
    }),
    { userId: "user-1", email: "owner@example.com" },
  );

  assert.deepEqual(result, {
    ok: true,
    specialist: { id: "spec-raced", status: "draft" },
    created: false,
  });
});

test("does not create a second row for a blocked specialist", async () => {
  let inserted = 0;
  const result = await ensureSpecialistDraft(
    store({
      findByUserId: async () => ({ id: "spec-blocked", status: "blocked" }),
      insertDraft: async () => {
        inserted += 1;
        return { ok: true, specialist: { id: "spec-new", status: "draft" } };
      },
    }),
    { userId: "user-1", email: null },
  );

  assert.deepEqual(result, { ok: false, error: "forbidden_blocked" });
  assert.equal(inserted, 0);
});
