import "@/styles/globals.css";
import CookieConsentBanner from "@/components/consent/CookieConsentBanner";
import ConsentScripts from "@/components/consent/ConsentScripts";
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
      </body>
    </html>
  );
}
