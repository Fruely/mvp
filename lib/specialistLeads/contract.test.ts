import assert from "node:assert/strict";
import test from "node:test";

test("specialist leads routes enforce bearer auth and ownership scoping", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");

  const listRoute = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/leads/route.ts", import.meta.url)),
    "utf8",
  );
  const detailRoute = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/leads/[id]/route.ts", import.meta.url)),
    "utf8",
  );
  const statusRoute = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/leads/status/route.ts", import.meta.url)),
    "utf8",
  );
  const unlockRoute = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/leads/[id]/unlock-contacts/route.ts", import.meta.url)),
    "utf8",
  );
  const serviceSrc = await readFile(
    fileURLToPath(new URL("./service.ts", import.meta.url)),
    "utf8",
  );

  assert.match(listRoute, /resolveSpecialistLeadBearerSession/);
  assert.match(detailRoute, /getSpecialistLeadById\(supabase, session\.specialistId/);
  assert.doesNotMatch(listRoute, /searchParams\.get\("specialist_id"\)/);
  assert.match(serviceSrc, /\.eq\("specialist_id", specialistId\)/);
  assert.match(serviceSrc, /SPECIALIST_LEAD_READ_SELECT/);
  assert.match(serviceSrc, /DASHBOARD_LEAD_FULL_SELECT/);
  assert.doesNotMatch(serviceSrc, /DASHBOARD_LEAD_REDACTED_SELECT/);
  assert.match(
    serviceSrc,
    /export async function listSpecialistLeads\(\s*\n\s*service: SupabaseClient,/,
  );
  assert.match(listRoute, /listSpecialistLeads\(\s*supabase,\s*session\.specialistId,/);
  assert.match(serviceSrc, /currentStatus === nextStatus/);
  assert.match(serviceSrc, /didPersistFirstUnlock/);
  assert.match(serviceSrc, /ContactUnlockEntitlementError/);
  assert.match(serviceSrc, /canUnlockLeadContacts/);
  assert.match(serviceSrc, /update\(\{ status: nextStatus \}\)/);
  assert.match(unlockRoute, /CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN/);
  assert.match(unlockRoute, /isContactUnlockEntitlementError/);
  assert.match(statusRoute, /invalid_status_transition/);
});

test("client-only users receive specialist_required", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const sessionSrc = await readFile(
    fileURLToPath(new URL("./session.ts", import.meta.url)),
    "utf8",
  );

  assert.match(sessionSrc, /specialist_required/);
  assert.match(sessionSrc, /forbidden_blocked/);
});
