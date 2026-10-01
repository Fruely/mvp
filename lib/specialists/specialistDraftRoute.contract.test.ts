import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("specialist draft route is the only creation boundary and capabilities stay read-only", async () => {
  const route = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/draft/route.ts", import.meta.url)),
    "utf8",
  );
  const dashboard = await readFile(fileURLToPath(new URL("./server.ts", import.meta.url)), "utf8");
  const capabilities = await readFile(
    fileURLToPath(new URL("../account/capabilitiesService.ts", import.meta.url)),
    "utf8",
  );

  assert.match(route, /ensureSpecialistDraft/);
  assert.match(route, /resolveDraftRequestActor/);
  assert.doesNotMatch(route, /request\.json/);
  assert.doesNotMatch(route, /body\.user_id/);

  assert.match(dashboard, /ensureSpecialistDraft/);
  assert.doesNotMatch(dashboard, /failed to auto-create draft specialist/);
  assert.doesNotMatch(dashboard, /\.insert\(\{/);

  assert.doesNotMatch(capabilities, /\.insert\(/);
});
