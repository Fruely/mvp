import { cookies } from "next/headers";
import { Suspense } from "react";
import { getDictionary, type Lang } from "@/lib/i18n";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HeaderCategoriesNav from "@/components/HeaderCategoriesNav";
import LanguageBar from "@/components/LanguageBar";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const langCookie = cookies().get("freuly_lang")?.value;
  const lang =
    langCookie === "ua" || langCookie === "ru" || langCookie === "de"
      ? langCookie
      : "ua";

  const dict = await getDictionary(lang as Lang);

  return (
    <>
      <Suspense fallback={<div className="h-9 bg-gray-50 border-b border-gray-100" />}>
        <LanguageBar />
      </Suspense>
      <Header lang={lang} dict={dict}>
        <HeaderCategoriesNav lang={lang} />
      </Header>
      {children}
      <Footer dict={dict} lang={lang} />
    </>
  );
}