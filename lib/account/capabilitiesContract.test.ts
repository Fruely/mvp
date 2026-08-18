import assert from "node:assert/strict";
import test from "node:test";

test("capabilities route requires bearer auth and does not accept client ownership params", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const routePath = fileURLToPath(
    new URL("../../app/api/account/capabilities/route.ts", import.meta.url),
  );
  const servicePath = fileURLToPath(
    new URL("./capabilitiesService.ts", import.meta.url),
  );
  const routeSrc = await readFile(routePath, "utf8");
  const serviceSrc = await readFile(servicePath, "utf8");

  assert.match(routeSrc, /resolveBearerAuthUser/);
  assert.match(routeSrc, /401/);
  assert.match(routeSrc, /resolveAccountCapabilities\(auth\.userId/);
  assert.match(routeSrc, /normalizeAccountCapabilitiesLang/);
  assert.match(routeSrc, /searchParams\.get\("lang"\)/);
  assert.doesNotMatch(routeSrc, /searchParams\.get\(["']specialist/);
  assert.doesNotMatch(routeSrc, /searchParams\.get\(["']user/);
  assert.match(serviceSrc, /\.eq\("user_id", userId\)/);
  assert.match(serviceSrc, /getCategoryTitle\(categoryResult\.data, lang\)/);
  assert.match(serviceSrc, /maybeSingle\(\)/);
  assert.match(serviceSrc, /planCode: plan\.plan_code/);
  assert.match(serviceSrc, /planStatus: plan\.plan_status/);
  assert.match(serviceSrc, /graceUntil: plan\.grace_until/);
  const mapperSrc = await readFile(
    fileURLToPath(new URL("./capabilitiesMapper.ts", import.meta.url)),
    "utf8",
  );
  assert.match(mapperSrc, /can_unlock_contacts/);
  assert.match(mapperSrc, /billing_access_state/);
  assert.match(mapperSrc, /resolveContactUnlockEntitlement/);
  assert.doesNotMatch(serviceSrc, /auto-create|\.insert\(/);
});

test("capabilities service excludes blocked specialists via query filter", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const servicePath = fileURLToPath(
    new URL("./capabilitiesService.ts", import.meta.url),
  );
  const serviceSrc = await readFile(servicePath, "utf8");

  assert.match(serviceSrc, /\.neq\("status", "blocked"\)/);
});
