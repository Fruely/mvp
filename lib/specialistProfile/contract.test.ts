import assert from "node:assert/strict";
import test from "node:test";

test("specialist profile route enforces bearer auth and ownership scoping", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");

  const route = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/profile/route.ts", import.meta.url)),
    "utf8",
  );
  const patchCoreSrc = await readFile(
    fileURLToPath(new URL("./patchProfile.ts", import.meta.url)),
    "utf8",
  );
  const whitelistSrc = await readFile(
    fileURLToPath(new URL("./patchWhitelist.ts", import.meta.url)),
    "utf8",
  );
  const sessionSrc = await readFile(
    fileURLToPath(new URL("./session.ts", import.meta.url)),
    "utf8",
  );

  assert.match(route, /resolveSpecialistProfileBearerSession/);
  assert.match(route, /resolveSpecialistProfileSession/);
  assert.match(route, /loadSpecialistEditableProfile\(service, session\.specialistId/);
  assert.match(route, /findForbiddenProfilePatchKeys\(body\)/);
  assert.match(route, /patchSpecialistEditableProfile\(\s*service,\s*session\.specialistId/);
  assert.doesNotMatch(route, /searchParams\.get\("specialist_id"\)/);
  assert.match(sessionSrc, /\.eq\("user_id", userId\)/);
  assert.match(whitelistSrc, /pickEditableProfilePatch/);
  assert.match(patchCoreSrc, /validatePublicationGeography/);
  assert.match(sessionSrc, /specialist_required/);
});

test("resolve-postal route accepts bearer auth for Native", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const route = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/resolve-postal/route.ts", import.meta.url)),
    "utf8",
  );

  assert.match(route, /resolveBearerAuthUser/);
});
