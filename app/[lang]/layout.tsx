import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDictionary, isSupportedLang, resolveRouteLang, type Lang } from "@/lib/i18n";
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
  const lang: Lang = resolveRouteLang(resolved.lang);
  const pathname = headers().get("x-freuly-pathname") || "";

  if (!isSupportedLang(typeof resolved.lang === "string" ? resolved.lang : "")) {
    const rest = pathname.split("/").filter(Boolean).slice(1).join("/");
    redirect(`/${lang}${rest ? `/${rest}` : ""}`);
  }

  if (pathname === `/${lang}/request`) {
    return <div className="min-h-[100dvh] bg-freuly-page">{children}</div>;
  }

  let dict;
  try {
    dict = await getDictionary(lang);
  } catch (e) {
    console.error("[LangLayout] getDictionary failed", e);
    dict = (await import("@/locales/ru.json")).default as Record<string, unknown>;
  }

  return (
    <div className="min-h-[100dvh] bg-freuly-page">
      <Suspense fallback={<div className="h-9 border-b border-freuly-border-subtle bg-freuly-surface/80" />}>
        <LanguageBar serverLang={lang} />
      </Suspense>
      <Header lang={lang} dict={dict} />
      {children}
      <Footer dict={dict} lang={lang} />
    </div>
  );
}
