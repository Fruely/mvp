import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const routePath = fileURLToPath(
  new URL("../../app/api/specialist/profile/route.ts", import.meta.url),
);
const patchPath = fileURLToPath(new URL("./patchProfile.ts", import.meta.url));

test("PATCH route calls patchSpecialistEditableProfile(service, specialistId, patch, lang)", async () => {
  const route = await readFile(routePath, "utf8");
  const patchSrc = await readFile(patchPath, "utf8");

  assert.match(
    route,
    /patchSpecialistEditableProfile\(\s*service,\s*session\.specialistId,\s*patch,\s*lang,/,
  );
  assert.match(
    patchSrc,
    /export async function patchSpecialistEditableProfile\(\s*\n\s*service: SupabaseClient,\s*\n\s*specialistId: string,/,
  );
});

test("GET route calls loadSpecialistEditableProfile(service, specialistId, lang)", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /loadSpecialistEditableProfile\(service, session\.specialistId, lang\)/);
});
