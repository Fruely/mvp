import "@/styles/globals.css";
import { cookies } from "next/headers";

export const metadata = {
  title: "Freuly - Специалист на твоём языке",
  description: "Найди специалиста, который говорит на твоём языке",
  // Global protection against indexing: all pages are marked noindex,nofollow
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const langCookie = cookies().get("freuly_lang")?.value;
  const lang =
    langCookie === "ua" || langCookie === "ru" || langCookie === "de"
      ? langCookie
      : "ua";
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
