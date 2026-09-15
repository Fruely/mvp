import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const repoRoot = new URL("../../", import.meta.url);

function source(path: string) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

test("publish API no longer requires a paid plan", () => {
  const publishRoute = source("app/api/specialist/dashboard/publish/route.ts");
  assert.doesNotMatch(publishRoute, /paid_plan_required/);
  assert.doesNotMatch(publishRoute, /status:\s*402/);
  assert.doesNotMatch(publishRoute, /resolveSpecialistEntitlements/);
  assert.match(publishRoute, /publishSpecialistProfile\(service, auth\.specialistId\)/);
});

test("unpaid publish materializes inactive specialist_plan and skips paid reconcile", () => {
  const publishCore = source("lib/specialistDashboard/publishSpecialist.ts");
  assert.match(publishCore, /ensureSafePublishedPlanAccess/);
  assert.match(publishCore, /shouldRunPaidLifecycleReconcile/);
  assert.doesNotMatch(publishCore, /plan_status:\s*"early_access"/);
});

test("protected layout allows activate and billing during unpublished onboarding", () => {
  const layout = source("app/[lang]/specialist/(protected)/layout.tsx");
  assert.match(layout, /dashboardBase\}\/activate/);
  assert.match(layout, /dashboardBase\}\/billing/);
});

test("reconcile inactive no longer sets a subscription-derived listing block", () => {
  const sql = source(
    "supabase/manual_migrations/2026-09-15_reconcile_listing_independent_of_inactive.sql",
  );
  const harness = source("lib/billing/testMocks/promotedAccessWebhook.harness.mjs");
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.reconcile_specialist_access/);
  assert.doesNotMatch(sql, /SET billing_visibility_blocked = true/);
  assert.match(sql, /billing_visibility_blocked = false/);
  assert.match(harness, /specialist\.billing_visibility_blocked = false;/);
  assert.doesNotMatch(harness, /newStatus === "inactive"/);
});
