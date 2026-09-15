"use client";

import { useEffect } from "react";
import { SW_SKIP_WAITING_MESSAGE } from "@/lib/pwa/serviceWorkerUpdate";

/**
 * Registers the production service worker and activates a waiting update.
 *
 * Returning Safari/Chrome tabs that already had an older worker must not keep
 * running a stale Wizard/search bundle after deploy. The new worker skip-waits
 * itself; this page also messages a waiting worker and reloads once after
 * `controllerchange` when a worker was already in control.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let reloading = false;
    let registration: ServiceWorkerRegistration | null = null;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const activateWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.postMessage(SW_SKIP_WAITING_MESSAGE);
    };

    const watchInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          activateWaiting(worker);
        }
      });
    };

    const onControllerChange = () => {
      if (!hadController || reloading || cancelled) return;
      reloading = true;
      window.location.reload();
    };

    const checkForUpdate = () => {
      void registration?.update().catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    if (hadController) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", checkForUpdate);

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;

        activateWaiting(registration.waiting);
        watchInstalling(registration.installing);

        registration.addEventListener("updatefound", () => {
          watchInstalling(registration?.installing ?? null);
        });

        checkForUpdate();
      } catch {
        console.warn("[pwa] Service worker registration failed.");
      }
    };

    void register();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", checkForUpdate);
    };
  }, []);

  return null;
}
