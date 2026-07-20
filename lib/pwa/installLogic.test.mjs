import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPlatform,
  isDismissCoolingDown,
  migrateInstallState,
  parseAudience,
  parseDismissedAt,
  preserveUtmParams,
  readInstallVisibilityState,
  shouldShowInstallCta,
  INSTALL_DISMISS_COOLDOWN_MS,
  INSTALL_DISMISS_KEY,
  INSTALL_DONE_KEY,
  INSTALL_STATE_VERSION,
  INSTALL_STATE_VERSION_KEY,
} from "./installLogic.ts";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    raw: map,
  };
}

test("parseAudience defaults safely", () => {
  assert.equal(parseAudience("specialist"), "specialist");
  assert.equal(parseAudience("client"), "client");
  assert.equal(parseAudience("nope"), "client");
  assert.equal(parseAudience(null), "client");
});

test("dismiss cooldown", () => {
  const now = Date.now();
  assert.equal(isDismissCoolingDown(now - 1000, now), true);
  assert.equal(isDismissCoolingDown(now - INSTALL_DISMISS_COOLDOWN_MS - 1, now), false);
  assert.equal(isDismissCoolingDown(null, now), false);
  assert.equal(parseDismissedAt(String(now - 1000)), now - 1000);
  assert.equal(parseDismissedAt("x"), null);
  assert.equal(parseDismissedAt("1"), null);
  assert.equal(parseDismissedAt("true"), null);
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

test("shouldShowInstallCta: Android without BIP still visible", () => {
  const base = {
    isStandalone: false,
    installedFlag: false,
    dismissedAtMs: null,
    nowMs: Date.now(),
    canPrompt: false,
    platform: "chromium",
  };
  assert.equal(shouldShowInstallCta(base), true);
  assert.equal(shouldShowInstallCta({ ...base, canPrompt: true }), true);
});

test("shouldShowInstallCta: legacy installedFlag in browser tab does not hide", () => {
  assert.equal(
    shouldShowInstallCta({
      isStandalone: false,
      installedFlag: true,
      dismissedAtMs: null,
      nowMs: Date.now(),
      canPrompt: false,
      platform: "chromium",
    }),
    true
  );
});

test("shouldShowInstallCta: standalone hides", () => {
  assert.equal(
    shouldShowInstallCta({
      isStandalone: true,
      installedFlag: false,
      dismissedAtMs: null,
      nowMs: Date.now(),
      canPrompt: true,
      platform: "chromium",
    }),
    false
  );
});

test("shouldShowInstallCta: fresh dismiss hides; stale dismiss does not", () => {
  const now = Date.now();
  assert.equal(
    shouldShowInstallCta({
      isStandalone: false,
      installedFlag: false,
      dismissedAtMs: now - 1000,
      nowMs: now,
      canPrompt: false,
      platform: "chromium",
    }),
    false
  );
  assert.equal(
    shouldShowInstallCta({
      isStandalone: false,
      installedFlag: false,
      dismissedAtMs: now - INSTALL_DISMISS_COOLDOWN_MS - 1,
      nowMs: now,
      canPrompt: false,
      platform: "chromium",
    }),
    true
  );
});

test("shouldShowInstallCta: iOS and desktop rules", () => {
  const base = {
    isStandalone: false,
    installedFlag: false,
    dismissedAtMs: null,
    nowMs: Date.now(),
    canPrompt: false,
    platform: "ios",
  };
  assert.equal(shouldShowInstallCta(base), true);
  assert.equal(
    shouldShowInstallCta({ ...base, canPrompt: true, platform: "desktop_other" }),
    true
  );
  assert.equal(
    shouldShowInstallCta({ ...base, canPrompt: false, platform: "desktop_other" }),
    false
  );
  assert.equal(
    shouldShowInstallCta({
      ...base,
      canPrompt: false,
      platform: "desktop_other",
      allowUnsupportedHint: true,
    }),
    true
  );
});

test("migrateInstallState clears legacy permanent dismiss", () => {
  const storage = memoryStorage({
    [INSTALL_DISMISS_KEY]: "true",
    [INSTALL_DONE_KEY]: "1",
  });
  const now = Date.now();
  const result = migrateInstallState(storage, { isStandalone: false, nowMs: now });
  assert.equal(storage.getItem(INSTALL_DISMISS_KEY), null);
  assert.equal(storage.getItem(INSTALL_DONE_KEY), null);
  assert.equal(storage.getItem(INSTALL_STATE_VERSION_KEY), String(INSTALL_STATE_VERSION));
  assert.equal(result.dismissedAtMs, null);
  assert.equal(result.clearedInstalledFlag, true);
  assert.equal(result.migrated, true);
});

test("migrateInstallState clears installed flag in browser tab", () => {
  const storage = memoryStorage({ [INSTALL_DONE_KEY]: "1" });
  const result = migrateInstallState(storage, {
    isStandalone: false,
    nowMs: Date.now(),
  });
  assert.equal(storage.getItem(INSTALL_DONE_KEY), null);
  assert.equal(result.clearedInstalledFlag, true);
  const visibility = shouldShowInstallCta({
    isStandalone: false,
    installedFlag: false,
    dismissedAtMs: null,
    nowMs: Date.now(),
    canPrompt: false,
    platform: "chromium",
  });
  assert.equal(visibility, true);
});

test("migrateInstallState keeps fresh dismiss under 7 days", () => {
  const now = Date.now();
  const fresh = now - 60_000;
  const storage = memoryStorage({
    [INSTALL_DISMISS_KEY]: String(fresh),
    [INSTALL_DONE_KEY]: "1",
  });
  const result = migrateInstallState(storage, { isStandalone: false, nowMs: now });
  assert.equal(storage.getItem(INSTALL_DISMISS_KEY), String(fresh));
  assert.equal(result.dismissedAtMs, fresh);
  assert.equal(storage.getItem(INSTALL_DONE_KEY), null);
});

test("migrateInstallState clears dismiss older than 7 days", () => {
  const now = Date.now();
  const stale = now - INSTALL_DISMISS_COOLDOWN_MS - 1000;
  const storage = memoryStorage({ [INSTALL_DISMISS_KEY]: String(stale) });
  const result = migrateInstallState(storage, { isStandalone: false, nowMs: now });
  assert.equal(storage.getItem(INSTALL_DISMISS_KEY), null);
  assert.equal(result.dismissedAtMs, null);
});

test("migrateInstallState runs version write once", () => {
  const storage = memoryStorage({ [INSTALL_DONE_KEY]: "1" });
  const now = Date.now();
  const first = migrateInstallState(storage, { isStandalone: false, nowMs: now });
  assert.equal(first.migrated, true);
  assert.equal(storage.getItem(INSTALL_STATE_VERSION_KEY), "2");
  const second = migrateInstallState(storage, { isStandalone: false, nowMs: now });
  assert.equal(storage.getItem(INSTALL_STATE_VERSION_KEY), "2");
  // Second pass: already on v2 and no installed flag left
  assert.equal(second.clearedInstalledFlag, false);
  assert.equal(second.migrated, false);
});

test("readInstallVisibilityState: browser tab with legacy installed shows CTA inputs", () => {
  const storage = memoryStorage({ [INSTALL_DONE_KEY]: "1" });
  const now = Date.now();
  const state = readInstallVisibilityState(storage, { isStandalone: false, nowMs: now });
  assert.equal(state.installedFlag, false);
  assert.equal(storage.getItem(INSTALL_DONE_KEY), null);
  assert.equal(storage.getItem(INSTALL_STATE_VERSION_KEY), "2");
  assert.equal(
    shouldShowInstallCta({
      isStandalone: false,
      installedFlag: state.installedFlag,
      dismissedAtMs: state.dismissedAtMs,
      nowMs: now,
      canPrompt: false,
      platform: "chromium",
    }),
    true
  );
});

test("preserveUtmParams keeps campaign params", () => {
  const qs = new URLSearchParams(
    "audience=specialist&utm_source=instagram&utm_medium=paid_social&utm_campaign=pwa_client&utm_content=story&utm_term=search&foo=1"
  );
  const out = preserveUtmParams(qs);
  assert.ok(out.includes("utm_source=instagram"));
  assert.ok(out.includes("audience=specialist"));
  assert.ok(!out.includes("foo="));
});

test("installPageHref is localized public route", async () => {
  const { installPageHref, classifyIosBrowser } = await import("./installLogic.ts");
  assert.equal(installPageHref("ua"), "/ua/install");
  assert.equal(
    installPageHref("ru", { audience: "client", platform: "android" }),
    "/ru/install?audience=client&platform=android"
  );
  assert.equal(
    classifyIosBrowser(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1"
    ),
    "chrome"
  );
});
