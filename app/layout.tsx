import "@/styles/globals.css";
import type { Viewport } from "next";
import CookieConsentBanner from "@/components/consent/CookieConsentBanner";
import ConsentScripts from "@/components/consent/ConsentScripts";
import AcquisitionAttributionCapture from "@/components/acquisition/AcquisitionAttributionCapture";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import { Inter } from "next/font/google";
import { headers } from "next/headers";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

/** Fallback when middleware does not set (e.g. some static routes). */
const DEFAULT_HTML_LANG = "ru";

/** Bump when favicon assets change to bust browser favicon cache. */
const FAVICON_VERSION = 3;

export const metadata = {
  title: "Freuly — специалист на твоём языке",
  description: "Найди специалиста, который говорит на твоём языке",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "Freuly",
  },
  icons: {
    icon: [
      { url: `/favicon.svg?v=${FAVICON_VERSION}`, type: "image/svg+xml" },
      { url: `/favicon.ico?v=${FAVICON_VERSION}` },
      {
        url: `/favicon-32x32.png?v=${FAVICON_VERSION}`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: `/favicon-16x16.png?v=${FAVICON_VERSION}`,
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: `/icons/apple-touch-icon.png?v=${FAVICON_VERSION}`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#107B80",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const htmlLang = headers().get("x-freuly-html-lang") ?? DEFAULT_HTML_LANG;

  return (
    <html lang={htmlLang} className={inter.variable}>
      <body className="min-h-[100dvh] font-sans text-textPrimary antialiased bg-white">
        {children}
        <AcquisitionAttributionCapture />
        <CookieConsentBanner />
        <ConsentScripts />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
