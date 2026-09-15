/**
 * Decide whether an open tab should hard-reload when a new service worker
 * activates after a deploy. Public search/wizard tabs must pick up the new
 * bundle; authenticated editing surfaces must not lose in-progress work.
 */
export const SW_SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

export function shouldReloadWindowForServiceWorkerUpdate(url: string): boolean {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }

  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/client")) return false;
  if (pathname.startsWith("/update-password") || pathname.startsWith("/reset-password")) {
    return false;
  }
  if (pathname.includes("/specialist/dashboard")) return false;
  return true;
}
