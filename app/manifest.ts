import type { MetadataRoute } from "next";

/**
 * Web app manifest served at /manifest.webmanifest.
 * Kept intentionally minimal for the PWA Foundation stage:
 * - no fixed `lang` (Freuly is multilingual, language is dynamic per user);
 * - no `shortcuts` (language-dependent routes are out of scope here);
 * - no forced `orientation` (avoids degrading the tablet experience).
 *
 * Colors are taken from real brand tokens already used in the codebase:
 * - theme_color `#4B50E6` — primary CTA (components/consent/CookieConsentBanner.tsx);
 * - background_color `#FFFFFF` — root <body> background (app/layout.tsx, bg-white).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Freuly",
    short_name: "Freuly",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    theme_color: "#4B50E6",
    background_color: "#FFFFFF",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
