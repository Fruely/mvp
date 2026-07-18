import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPlatform,
  isDismissCoolingDown,
  parseAudience,
  parseDismissedAt,
  preserveUtmParams,
  shouldShowInstallCta,
  INSTALL_DISMISS_COOLDOWN_MS,
} from "./installLogic.ts";

test("parseAudience defaults safely", () => {
  assert.equal(parseAudience("specialist"), "specialist");
  assert.equal(parseAudience("client"), "client");
  assert.equal(parseAudience("nope"), "client");
  assert.equal(parseAudience(null), "client");
});

test("dismiss cooldown", () => {
  const now = 1_000_000;
  assert.equal(isDismissCoolingDown(now - 1000, now), true);
  assert.equal(isDismissCoolingDown(now - INSTALL_DISMISS_COOLDOWN_MS - 1, now), false);
  assert.equal(isDismissCoolingDown(null, now), false);
  assert.equal(parseDismissedAt("123"), 123);
  assert.equal(parseDismissedAt("x"), null);
});

test("classifyPlatform", () => {
  assert.equal(classifyPlatform({ userAgent: "iPhone Safari" }), "ios");
  assert.equal(
    classifyPlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120" }),
    "chromium"
  );
  assert.equal(
    classifyPlatform({ userAgent: "Mozilla/5.0 (Windows NT 10.0) Firefox/120" }),
    "desktop_other"
  );
  assert.equal(
    classifyPlatform({ userAgent: "Mozilla/5.0 (Windows NT 10.0)", hasBeforeInstallPromptApi: true }),
    "chromium"
  );
});

test("shouldShowInstallCta rules", () => {
  const base = {
    isStandalone: false,
    installedFlag: false,
    dismissedAtMs: null,
    nowMs: Date.now(),
    canPrompt: false,
    platform: "ios",
  };
  assert.equal(shouldShowInstallCta(base), true);
  assert.equal(shouldShowInstallCta({ ...base, isStandalone: true }), false);
  assert.equal(shouldShowInstallCta({ ...base, installedFlag: true }), false);
  assert.equal(
    shouldShowInstallCta({ ...base, dismissedAtMs: Date.now(), platform: "ios" }),
    false
  );
  assert.equal(
    shouldShowInstallCta({ ...base, canPrompt: true, platform: "desktop_other" }),
    true
  );
  assert.equal(
    shouldShowInstallCta({ ...base, canPrompt: false, platform: "desktop_other" }),
    false
  );
});

test("preserveUtmParams keeps campaign params", () => {
  const qs = new URLSearchParams(
    "audience=specialist&utm_source=meta&utm_campaign=spring&foo=1"
  );
  const out = preserveUtmParams(qs);
  assert.ok(out.includes("utm_source=meta"));
  assert.ok(out.includes("utm_campaign=spring"));
  assert.ok(out.includes("audience=specialist"));
  assert.ok(!out.includes("foo="));
});
