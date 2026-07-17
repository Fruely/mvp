"use client";

import { useEffect } from "react";

/**
 * Minimal, conservative service worker registration for the PWA Foundation stage.
 *
 * - Registers only in production (SW is disabled at build time in dev anyway).
 * - Runs in an effect, so it never blocks rendering.
 * - Registers a single worker on scope "/".
 * - Detects a new worker version (installing -> installed, or an already-waiting
 *   worker) WITHOUT auto-reloading the page and WITHOUT unconditional skipWaiting.
 * - Logs only non-sensitive messages (never cookies, tokens or personal data).
 *
 * Next stage: surface a user-facing update prompt that, on explicit user consent,
 * messages the waiting worker to activate. Not implemented here on purpose.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const notifyUpdateAvailable = () => {
      // Placeholder for the future update prompt. Intentionally no reload here.
      console.info("[pwa] A new version is available and waiting to activate.");
    };

    const watchInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          notifyUpdateAvailable();
        }
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;

        // Case 1: a new worker is already waiting (e.g. detected on a later visit).
        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdateAvailable();
        }

        // Case 2: a worker is mid-install right now.
        watchInstalling(registration.installing);

        // Case 3: a new worker starts installing after registration.
        registration.addEventListener("updatefound", () => {
          watchInstalling(registration.installing);
        });
      } catch {
        // Registration failures are non-fatal for the existing site.
        console.warn("[pwa] Service worker registration failed.");
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
