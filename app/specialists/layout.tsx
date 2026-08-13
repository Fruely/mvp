import { cookies } from "next/headers";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageBar from "@/components/LanguageBar";
import { getDictionary, type Lang } from "@/lib/i18n";

export default async function SpecialistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const langCookie = cookies().get("freuly_lang")?.value;
  const lang =
    langCookie === "ua" || langCookie === "ru" || langCookie === "de" ? langCookie : "ru";

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
