import assert from "node:assert/strict";
import test from "node:test";

import {
  mapSpecialistSessionToDashboardAuth,
} from "./dashboardRouteAuth.ts";

test("mapSpecialistSessionToDashboardAuth maps unauthorized to 401", () => {
  const result = mapSpecialistSessionToDashboardAuth({ kind: "unauthorized" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 401);
    assert.equal(result.error, "unauthorized");
  }
});

test("mapSpecialistSessionToDashboardAuth maps specialist_required to 403", () => {
  const result = mapSpecialistSessionToDashboardAuth({ kind: "specialist_required" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.error, "specialist_required");
  }
});

test("mapSpecialistSessionToDashboardAuth maps ok specialist session", () => {
  const result = mapSpecialistSessionToDashboardAuth({
    kind: "ok",
    userId: "user-1",
    specialistId: "spec-1",
    specialistStatus: "draft",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.userId, "user-1");
    assert.equal(result.specialistId, "spec-1");
    assert.equal(result.specialistStatus, "draft");
  }
});
