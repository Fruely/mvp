import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

export default async function LangHomePage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua");
  }

  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);

  return <HomeClient lang={lang} dict={dict} />;
}
