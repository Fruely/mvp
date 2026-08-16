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
  const serviceSrc = await readFile(
    fileURLToPath(new URL("./service.ts", import.meta.url)),
    "utf8",
  );

  assert.match(listRoute, /resolveSpecialistLeadBearerSession/);
  assert.match(detailRoute, /getSpecialistLeadById\(supabase, session\.specialistId/);
  assert.doesNotMatch(listRoute, /searchParams\.get\("specialist_id"\)/);
  assert.match(serviceSrc, /\.eq\("specialist_id", specialistId\)/);
  assert.match(serviceSrc, /currentStatus === nextStatus/);
  assert.match(serviceSrc, /didPersistFirstUnlock/);
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
