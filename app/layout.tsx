import "@/styles/globals.css";
import type { Viewport } from "next";
import CookieConsentBanner from "@/components/consent/CookieConsentBanner";
import ConsentScripts from "@/components/consent/ConsentScripts";
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
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4B50E6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const htmlLang = headers().get("x-freuly-html-lang") ?? DEFAULT_HTML_LANG;

  return (
    <html lang={htmlLang} className={inter.variable}>
      <body className="min-h-screen font-sans text-textPrimary antialiased bg-white">
        {children}
        <CookieConsentBanner />
        <ConsentScripts />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
