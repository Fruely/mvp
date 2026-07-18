/// <reference lib="webworker" />

import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected at build time by @serwist/next. Contains ONLY hashed build output
    // (/_next/static/**) and the public assets matched by `globPublicPatterns`
    // (offline.html, favicon.ico, icons/*.png). No HTML pages, no API, no data.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Conservative lifecycle: never take over automatically. A user-facing update
  // prompt (with controlled skipWaiting) is deferred to the next stage.
  skipWaiting: false,
  clientsClaim: false,
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

serwist.addEventListeners();
