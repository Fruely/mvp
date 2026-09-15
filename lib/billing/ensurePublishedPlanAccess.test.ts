import assert from "node:assert/strict";
import test from "node:test";

import { canUnlockLeadContacts } from "@/lib/billing/contactUnlockEntitlement";
import {
  hasCoveringPaidSubscription,
  resolvePublishedPlanAccessAction,
  shouldRunPaidLifecycleReconcile,
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
