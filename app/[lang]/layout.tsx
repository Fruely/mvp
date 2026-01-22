import { redirect } from "next/navigation";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import Footer from "@/components/Footer";

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
      {children}
      <Footer dict={dict} lang={lang} />
    </>
  );
}
