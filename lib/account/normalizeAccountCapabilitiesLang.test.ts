import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ACCOUNT_CAPABILITIES_LANG,
  normalizeAccountCapabilitiesLang,
} from "./normalizeAccountCapabilitiesLang.ts";

test("normalizeAccountCapabilitiesLang accepts active Native locales", () => {
  assert.equal(normalizeAccountCapabilitiesLang("ru"), "ru");
  assert.equal(normalizeAccountCapabilitiesLang("ua"), "ua");
  assert.equal(normalizeAccountCapabilitiesLang("de"), "de");
  assert.equal(normalizeAccountCapabilitiesLang("uk"), "ua");
});

test("normalizeAccountCapabilitiesLang falls back deterministically", () => {
  assert.equal(normalizeAccountCapabilitiesLang(null), DEFAULT_ACCOUNT_CAPABILITIES_LANG);
  assert.equal(normalizeAccountCapabilitiesLang(""), DEFAULT_ACCOUNT_CAPABILITIES_LANG);
  assert.equal(normalizeAccountCapabilitiesLang("fr"), DEFAULT_ACCOUNT_CAPABILITIES_LANG);
});

test("route passes normalized lang into capability resolver", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const routePath = fileURLToPath(
    new URL("../../app/api/account/capabilities/route.ts", import.meta.url),
  );
  const routeSrc = await readFile(routePath, "utf8");

  assert.match(routeSrc, /normalizeAccountCapabilitiesLang/);
  assert.match(routeSrc, /searchParams\.get\("lang"\)/);
  assert.match(routeSrc, /resolveAccountCapabilities\(auth\.userId, supabase, lang\)/);
});
