import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageBar from "@/components/LanguageBar";
import { getDictionary, type Lang } from "@/lib/i18n";
import {
  SPECIALISTS_UI_LANG_HEADER,
  resolveSpecialistsUiLang,
} from "@/lib/search/specialistsUiLang";

export default async function SpecialistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = resolveSpecialistsUiLang({
    headerLang: headers().get(SPECIALISTS_UI_LANG_HEADER),
    cookieLang: cookies().get("freuly_lang")?.value,
  }) as Lang;

  const dict = await getDictionary(lang as Lang);

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
