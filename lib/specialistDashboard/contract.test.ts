import assert from "node:assert/strict";
import test from "node:test";

test("dashboard publish/unpublish routes use bearer-first auth and self-scoped cores", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");

  const publishRoute = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/dashboard/publish/route.ts", import.meta.url)),
    "utf8",
  );
  const unpublishRoute = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/dashboard/unpublish/route.ts", import.meta.url)),
    "utf8",
  );
  const sessionSrc = await readFile(
    fileURLToPath(new URL("../specialistProfile/session.ts", import.meta.url)),
    "utf8",
  );

  assert.match(publishRoute, /resolveDashboardSpecialistAuth\(request\)/);
  assert.match(publishRoute, /publishSpecialistProfile\(service, auth\.specialistId\)/);
  assert.match(unpublishRoute, /resolveDashboardSpecialistAuth\(request\)/);
  assert.match(unpublishRoute, /unpublishSpecialistProfile\(service, auth\.specialistId\)/);
  assert.match(sessionSrc, /resolveBearerAuthUser/);
  assert.match(sessionSrc, /createCookieClient\(\)/);
  assert.doesNotMatch(publishRoute, /searchParams\.get\("specialist_id"\)/);
  assert.doesNotMatch(unpublishRoute, /searchParams\.get\("specialist_id"\)/);
});
