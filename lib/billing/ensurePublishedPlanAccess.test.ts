import assert from "node:assert/strict";
import test from "node:test";

import { canUnlockLeadContacts } from "@/lib/billing/contactUnlockEntitlement";
import {
  applyPublishedPlanAccess,
  hasCoveringPaidSubscription,
  isSpecialistPlanUniqueViolation,
  resolvePublishedPlanAccessAction,
  shouldRunPaidLifecycleReconcile,
  SPECIALIST_PLAN_ACCESS_FAILED,
  type PublishedPlanAccessSnapshot,
  type SpecialistPlanAccessStore,
} from "@/lib/billing/ensurePublishedPlanAccess";
import { isPublicLeadTargetSpecialist } from "@/lib/specialists/status";

test("missing plan row for a new unpaid publisher inserts inactive, not early_access", () => {
  const action = resolvePublishedPlanAccessAction({
    rowPresent: false,
    planCode: null,
    planStatus: null,
  });
  assert.deepEqual(action, { kind: "insert_inactive" });
  assert.equal(canUnlockLeadContacts("inactive"), false);
  assert.equal(canUnlockLeadContacts(null), true);
});

test("starter/active unpaid enroll is rewritten to inactive", () => {
  const action = resolvePublishedPlanAccessAction({
    rowPresent: true,
    planCode: "starter",
    planStatus: "active",
  });
  assert.deepEqual(action, { kind: "update_inactive" });
  assert.equal(
    hasCoveringPaidSubscription({
      rowPresent: true,
      planCode: "starter",
      planStatus: "active",
    }),
    false,
  );
});

test("already inactive unpaid plan is left alone", () => {
  assert.deepEqual(
    resolvePublishedPlanAccessAction({
      rowPresent: true,
      planCode: "starter",
      planStatus: "inactive",
    }),
    { kind: "noop", reason: "already_inactive" },
  );
});

test("legacy early_access and trialing rows are preserved", () => {
  assert.deepEqual(
    resolvePublishedPlanAccessAction({
      rowPresent: true,
      planCode: "starter",
      planStatus: "early_access",
    }),
    { kind: "noop", reason: "legacy_entitled" },
  );
  assert.deepEqual(
    resolvePublishedPlanAccessAction({
      rowPresent: true,
      planCode: "basic",
      planStatus: "trialing",
    }),
    { kind: "noop", reason: "legacy_entitled" },
  );
  assert.equal(canUnlockLeadContacts("early_access"), true);
});

test("covering Professional/Growth is not rewritten to inactive", () => {
  assert.deepEqual(
    resolvePublishedPlanAccessAction({
      rowPresent: true,
      planCode: "basic",
      planStatus: "active",
    }),
    { kind: "noop", reason: "paid_coverage" },
  );
  assert.deepEqual(
    resolvePublishedPlanAccessAction({
      rowPresent: true,
      planCode: "premium",
      planStatus: "grace",
    }),
    { kind: "noop", reason: "paid_coverage" },
  );
  assert.equal(canUnlockLeadContacts("active"), true);
});

test("published inactive specialist remains a public lead target when not billing-blocked", () => {
  assert.equal(
    isPublicLeadTargetSpecialist({
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      billing_visibility_blocked: false,
      is_test: false,
    }),
    true,
  );
  assert.equal(canUnlockLeadContacts("inactive"), false);
});

test("moderation and completeness still gate listing", () => {
  assert.equal(
    isPublicLeadTargetSpecialist({
      status: "published_unverified",
      is_active: true,
      is_visible: false,
      billing_visibility_blocked: false,
    }),
    false,
  );
  assert.equal(
    isPublicLeadTargetSpecialist({
      status: "draft",
      is_active: true,
      is_visible: true,
      billing_visibility_blocked: false,
    }),
    false,
  );
  assert.equal(
    isPublicLeadTargetSpecialist({
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      billing_visibility_blocked: true,
    }),
    false,
  );
});

test("only covering paid plans run paid lifecycle reconcile on publish", () => {
  assert.equal(
    shouldRunPaidLifecycleReconcile({ kind: "noop", reason: "paid_coverage" }),
    true,
  );
  assert.equal(
    shouldRunPaidLifecycleReconcile({ kind: "insert_inactive" }),
    false,
  );
  assert.equal(
    shouldRunPaidLifecycleReconcile({ kind: "update_inactive" }),
    false,
  );
  assert.equal(
    shouldRunPaidLifecycleReconcile({ kind: "noop", reason: "legacy_entitled" }),
    false,
  );
  assert.equal(
    shouldRunPaidLifecycleReconcile({ kind: "noop", reason: "already_inactive" }),
    false,
  );
});


type MemoryPlanRow = { plan_code: string | null; plan_status: string | null };

function snapshotOf(row: MemoryPlanRow | null): PublishedPlanAccessSnapshot {
  return {
    rowPresent: Boolean(row),
    planCode: row?.plan_code ?? null,
    planStatus: row?.plan_status ?? null,
  };
}

function createMemoryPlanStore(options: {
  row?: MemoryPlanRow | null;
  insertError?: unknown;
  updateError?: unknown;
  onInsert?: () => void;
  onCas?: (observed: PublishedPlanAccessSnapshot) => void;
}): { store: SpecialistPlanAccessStore; getRow: () => MemoryPlanRow | null } {
  let row: MemoryPlanRow | null = options.row === undefined ? null : options.row;
  const store: SpecialistPlanAccessStore = {
    async load() {
      return { snapshot: snapshotOf(row), error: null };
    },
    async insertInactive() {
      options.onInsert?.();
      if (options.insertError) return { error: options.insertError };
      row = { plan_code: "starter", plan_status: "inactive" };
      return { error: null };
    },
    async casUpdateInactive(_specialistId, observed) {
      options.onCas?.(observed);
      if (options.updateError) return { updated: false, error: options.updateError };
      if (
        !row ||
        row.plan_code !== observed.planCode ||
        row.plan_status !== observed.planStatus
      ) {
        return { updated: false, error: null };
      }
      row = { ...row, plan_status: "inactive" };
      return { updated: true, error: null };
    },
  };
  return { store, getRow: () => row };
}

test("insert failure fails closed and does not invent a safe published PPL state", async () => {
  const { store, getRow } = createMemoryPlanStore({
    insertError: { code: "PGRST500", message: "insert failed" },
  });
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: false, code: SPECIALIST_PLAN_ACCESS_FAILED });
  assert.equal(getRow(), null);
});

test("lookup failure fails closed instead of treating the plan as missing", async () => {
  const store: SpecialistPlanAccessStore = {
    async load() {
      return {
        snapshot: { rowPresent: false, planCode: null, planStatus: null },
        error: { message: "lookup failed" },
      };
    },
    async insertInactive() {
      throw new Error("insert must not run after lookup failure");
    },
    async casUpdateInactive() {
      throw new Error("cas must not run after lookup failure");
    },
  };
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: false, code: SPECIALIST_PLAN_ACCESS_FAILED });
});

test("concurrent insert conflict re-reads and preserves newly paid coverage", async () => {
  let row: MemoryPlanRow | null = null;
  let insertCalls = 0;
  const store: SpecialistPlanAccessStore = {
    async load() {
      return { snapshot: snapshotOf(row), error: null };
    },
    async insertInactive() {
      insertCalls += 1;
      row = { plan_code: "basic", plan_status: "active" };
      return { error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    },
    async casUpdateInactive() {
      throw new Error("paid coverage must not be CAS-updated to inactive");
    },
  };

  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.action, { kind: "noop", reason: "paid_coverage" });
  }
  assert.equal(insertCalls, 1);
  assert.deepEqual(row, { plan_code: "basic", plan_status: "active" });
  assert.equal(isSpecialistPlanUniqueViolation({ code: "23505" }), true);
});

test("concurrent insert of inactive row is preserved as already_inactive", async () => {
  let row: MemoryPlanRow | null = null;
  const store: SpecialistPlanAccessStore = {
    async load() {
      return { snapshot: snapshotOf(row), error: null };
    },
    async insertInactive() {
      row = { plan_code: "starter", plan_status: "inactive" };
      return { error: { code: "23505", message: "duplicate key value violates unique constraint" } };
    },
    async casUpdateInactive() {
      throw new Error("already inactive row must not be CAS-updated");
    },
  };
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: true, action: { kind: "noop", reason: "already_inactive" } });
  assert.deepEqual(row, { plan_code: "starter", plan_status: "inactive" });
});

test("concurrent webhook starter/active -> basic/active is preserved by CAS miss", async () => {
  let row: MemoryPlanRow = { plan_code: "starter", plan_status: "active" };
  let casCalls = 0;
  const store: SpecialistPlanAccessStore = {
    async load() {
      return { snapshot: snapshotOf(row), error: null };
    },
    async insertInactive() {
      throw new Error("row already present");
    },
    async casUpdateInactive(_id, observed) {
      casCalls += 1;
      row = { plan_code: "basic", plan_status: "active" };
      if (
        row.plan_code !== observed.planCode ||
        row.plan_status !== observed.planStatus
      ) {
        return { updated: false, error: null };
      }
      throw new Error("CAS must not match after webhook promotion");
    },
  };

  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.action, { kind: "noop", reason: "paid_coverage" });
  }
  assert.equal(casCalls, 1);
  assert.deepEqual(row, { plan_code: "basic", plan_status: "active" });
});

test("CAS zero-row update preserves already-paid state and does not downgrade", async () => {
  let row: MemoryPlanRow = { plan_code: "premium", plan_status: "active" };
  const store: SpecialistPlanAccessStore = {
    async load() {
      return { snapshot: snapshotOf(row), error: null };
    },
    async insertInactive() {
      throw new Error("paid row must not insert inactive");
    },
    async casUpdateInactive() {
      throw new Error("paid coverage must not attempt CAS");
    },
  };
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: true, action: { kind: "noop", reason: "paid_coverage" } });
  assert.deepEqual(row, { plan_code: "premium", plan_status: "active" });
});

test("normal unpaid missing plan materializes starter/inactive", async () => {
  const { store, getRow } = createMemoryPlanStore({});
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: true, action: { kind: "insert_inactive" } });
  assert.deepEqual(getRow(), { plan_code: "starter", plan_status: "inactive" });
});

test("unpaid starter/active is CAS-updated to inactive", async () => {
  const { store, getRow } = createMemoryPlanStore({
    row: { plan_code: "starter", plan_status: "active" },
  });
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: true, action: { kind: "update_inactive" } });
  assert.deepEqual(getRow(), { plan_code: "starter", plan_status: "inactive" });
});

test("active paid publish remains paid", async () => {
  const { store, getRow } = createMemoryPlanStore({
    row: { plan_code: "basic", plan_status: "active" },
  });
  const result = await applyPublishedPlanAccess("spec-1", store);
  assert.deepEqual(result, { ok: true, action: { kind: "noop", reason: "paid_coverage" } });
  assert.deepEqual(getRow(), { plan_code: "basic", plan_status: "active" });
});

test("legacy early_access and trialing remain preserved", async () => {
  for (const row of [
    { plan_code: "starter", plan_status: "early_access" },
    { plan_code: "basic", plan_status: "trialing" },
  ] as MemoryPlanRow[]) {
    const memory = createMemoryPlanStore({ row });
    const result = await applyPublishedPlanAccess("spec-1", memory.store);
    assert.deepEqual(result, { ok: true, action: { kind: "noop", reason: "legacy_entitled" } });
    assert.deepEqual(memory.getRow(), row);
  }
});
