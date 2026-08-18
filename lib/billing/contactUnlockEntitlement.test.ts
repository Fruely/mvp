import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN,
  ContactUnlockEntitlementError,
  canUnlockLeadContacts,
  resolveBillingAccessState,
  resolveContactUnlockEntitlement,
} from "./contactUnlockEntitlement.ts";

test("active and grace allow contact unlock; inactive does not", () => {
  assert.equal(canUnlockLeadContacts("active"), true);
  assert.equal(canUnlockLeadContacts("grace"), true);
  assert.equal(canUnlockLeadContacts("grace_period"), true);
  assert.equal(canUnlockLeadContacts("inactive"), false);
});

test("early_access, trialing, and missing plan remain entitled", () => {
  assert.equal(canUnlockLeadContacts("early_access"), true);
  assert.equal(canUnlockLeadContacts("trialing"), true);
  assert.equal(canUnlockLeadContacts(null), true);
  assert.equal(canUnlockLeadContacts(""), true);
});

test("expired/cancelled map to inactive access and block unlock", () => {
  assert.equal(resolveBillingAccessState("expired"), "inactive");
  assert.equal(resolveBillingAccessState("cancelled"), "inactive");
  assert.equal(resolveBillingAccessState("canceled"), "inactive");
  assert.equal(canUnlockLeadContacts("expired"), false);
  assert.equal(canUnlockLeadContacts("cancelled"), false);
});

test("billing_access_state is the three-state model", () => {
  assert.equal(resolveBillingAccessState("active"), "active");
  assert.equal(resolveBillingAccessState("grace"), "grace");
  assert.equal(resolveBillingAccessState("grace_period"), "grace");
  assert.equal(resolveBillingAccessState("inactive"), "inactive");
  assert.equal(resolveBillingAccessState("early_access"), "active");
});

test("resolveContactUnlockEntitlement is the single decision source", () => {
  assert.deepEqual(resolveContactUnlockEntitlement("grace"), {
    billing_access_state: "grace",
    can_unlock_contacts: true,
  });
  assert.deepEqual(resolveContactUnlockEntitlement("inactive"), {
    billing_access_state: "inactive",
    can_unlock_contacts: false,
  });
});

test("entitlement error uses one machine code", () => {
  const error = new ContactUnlockEntitlementError();
  assert.equal(error.code, CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN);
  assert.equal(error.message, CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN);
});
