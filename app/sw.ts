/// <reference lib="webworker" />

import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  SW_SKIP_WAITING_MESSAGE,
  shouldReloadWindowForServiceWorkerUpdate,
} from "@/lib/pwa/serviceWorkerUpdate";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected at build time by @serwist/next. Contains ONLY hashed build output
    // (/_next/static/**) and the public assets matched by `globPublicPatterns`
    // (offline.html, favicon.ico, favicon.svg, icons/*.png). No HTML pages, no API, no data.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  // Navigations go straight to the network and are NEVER written to Cache Storage.
  // NetworkOnly is required so the fallback catch handler fires on network errors.
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
  ],
  // On a failed navigation, serve the precached static offline page.
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

/**
 * True when this worker installed while an older worker was already active.
 * First-time installs must not reload the tab the user just opened.
 */
let installedOverExistingWorker = false;

self.addEventListener("install", () => {
  installedOverExistingWorker = Boolean(self.registration.active);
});

self.addEventListener("message", (event) => {
  if (event.data?.type === SW_SKIP_WAITING_MESSAGE.type) {
    void self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (!installedOverExistingWorker) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await Promise.all(
        windows.map((client) => {
          if (!("navigate" in client) || typeof client.navigate !== "function") {
            return Promise.resolve();
          }
          if (!shouldReloadWindowForServiceWorkerUpdate(client.url)) {
            return Promise.resolve();
          }
          return client.navigate(client.url).then(() => undefined);
        }),
      );
    })(),
  );
});

serwist.addEventListeners();
