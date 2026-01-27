import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HeaderCategoriesNav from "@/components/HeaderCategoriesNav";
import LanguageBar from "@/components/LanguageBar";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua");
  }

  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);

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
