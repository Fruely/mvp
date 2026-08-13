import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageBar from "@/components/LanguageBar";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  if (!isSupportedLang(resolved.lang)) {
    redirect("/ua");
  }

  const lang = resolved.lang as Lang;
  let dict;
  try {
    dict = await getDictionary(lang);
  } catch (e) {
    console.error("[LangLayout] getDictionary failed", e);
    dict = (await import("@/locales/ua.json")).default as Record<string, unknown>;
  }

  return (
    <div className="min-h-[100dvh] bg-freuly-page">
      <Suspense fallback={<div className="h-9 border-b border-freuly-border-subtle bg-freuly-surface/80" />}>
        <LanguageBar />
      </Suspense>
      <Header lang={lang} dict={dict} />
      {children}
      <Footer dict={dict} lang={lang} />
    </div>
  );
}
