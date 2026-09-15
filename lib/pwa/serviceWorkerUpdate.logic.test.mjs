import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shouldReloadWindowForServiceWorkerUpdate } from "./serviceWorkerUpdate.ts";

test("public wizard and search tabs reload after a SW update", () => {
  assert.equal(
    shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/ua/service-search"),
    true,
  );
  assert.equal(
    shouldReloadWindowForServiceWorkerUpdate(
      "https://freuly.de/specialists?ui=ua&lang=ru&category=coaches&mode=online",
    ),
    true,
  );
  assert.equal(shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/ua"), true);
  assert.equal(
    shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/ru/specialists/coaches"),
    true,
  );
});

test("dashboard, admin and auth tabs do not reload on SW update", () => {
  assert.equal(
    shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/ua/specialist/dashboard"),
    false,
  );
  assert.equal(
    shouldReloadWindowForServiceWorkerUpdate(
      "https://freuly.de/de/specialist/dashboard/billing",
    ),
    false,
  );
  assert.equal(shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/admin"), false);
  assert.equal(shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/login"), false);
  assert.equal(shouldReloadWindowForServiceWorkerUpdate("https://freuly.de/client/dashboard"), false);
});

test("invalid URLs do not reload", () => {
  assert.equal(shouldReloadWindowForServiceWorkerUpdate("not-a-url"), false);
});

test("service worker activates updates instead of waiting indefinitely", () => {
  const swSrc = readFileSync(new URL("../../app/sw.ts", import.meta.url), "utf8");
  assert.match(swSrc, /skipWaiting:\s*true/);
  assert.match(swSrc, /clientsClaim:\s*true/);
  assert.match(swSrc, /shouldReloadWindowForServiceWorkerUpdate/);
  assert.match(swSrc, /client\.navigate/);

  const registerSrc = readFileSync(
    new URL("../../components/pwa/ServiceWorkerRegister.tsx", import.meta.url),
    "utf8",
  );
  assert.match(registerSrc, /SKIP_WAITING/);
  assert.match(registerSrc, /controllerchange/);
  assert.match(registerSrc, /registration\?\.update/);
});
