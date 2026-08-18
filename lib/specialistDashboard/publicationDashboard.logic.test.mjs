import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const repoRoot = new URL("../../", import.meta.url);

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

test("publish route uses bearer-first dashboard auth and self-scoped publish core", () => {
  const publishRoute = source("app/api/specialist/dashboard/publish/route.ts");
  const publishCore = source("lib/specialistDashboard/publishSpecialist.ts");
  const auth = source("lib/specialistDashboard/dashboardRouteAuth.ts");
  const session = source("lib/specialistProfile/session.ts");

  assert.match(publishRoute, /resolveDashboardSpecialistAuth\(request\)/);
  assert.match(publishRoute, /publishSpecialistProfile\(service, auth\.specialistId\)/);
  assert.match(auth, /resolveSpecialistProfileSession/);
  assert.match(session, /resolveBearerAuthUser/);
  assert.doesNotMatch(publishRoute, /searchParams\.get\("specialist_id"\)/);
  assert.match(publishCore, /status: "published_unverified"/);
  assert.doesNotMatch(publishCore, /status:\s*"featured_verified"/);
});

test("unpublish route uses shared auth and narrow self-revert core", () => {
  const unpublishRoute = source("app/api/specialist/dashboard/unpublish/route.ts");
  const unpublishCore = source("lib/specialistDashboard/unpublishSpecialist.ts");
  const publicationStatus = source("lib/specialistDashboard/publicationStatus.ts");

  assert.match(unpublishRoute, /resolveDashboardSpecialistAuth\(request\)/);
  assert.match(unpublishRoute, /unpublishSpecialistProfile\(service, auth\.specialistId\)/);
  assert.match(unpublishCore, /PROTECTED_FROM_SELF_UNPUBLISH_STATUSES/);
  assert.match(publicationStatus, /"featured_verified"/);
  assert.match(publicationStatus, /"approved"/);
  assert.match(publicationStatus, /"paused"/);
  assert.match(unpublishCore, /status: "draft"/);
  assert.match(unpublishCore, /slug: null/);
  assert.doesNotMatch(unpublishRoute, /req\.json/);
});

test("dashboard auth maps client-only users to specialist_required", () => {
  const auth = source("lib/specialistDashboard/dashboardRouteAuth.ts");
  const session = source("lib/specialistProfile/session.ts");
  assert.match(auth, /specialistProfileSessionErrorCode/);
  assert.match(session, /specialist_required/);
});
