import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

const DOMAIN = "https://freuly.de";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const canonical = `${DOMAIN}/${lang}`;

  return {
    alternates: {
      canonical,
      languages: {
        ua: `${DOMAIN}/ua`,
        ru: `${DOMAIN}/ru`,
        de: `${DOMAIN}/de`,
      },
    },
  };
}

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
