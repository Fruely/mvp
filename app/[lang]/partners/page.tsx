import type { Metadata } from "next";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import PartnersLandingClient from "@/components/partners/PartnersLandingClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = (
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua"
  ) as Lang;
  const titles = {
    ua: "Партнерська програма Freuly",
    ru: "Партнёрская программа Freuly",
    de: "Freuly Partnerprogramm",
  } as const;
  const descriptions = {
    ua: "Розкажіть аудиторії про Freuly та отримуйте винагороду за нових спеціалістів.",
    ru: "Расскажите аудитории о Freuly и получайте вознаграждение за новых специалистов.",
    de: "Erzählen Sie Ihrer Community von Freuly und erhalten Sie eine Vergütung für neue Fachkräfte.",
  } as const;

  return {
    title: titles[lang],
    description: descriptions[lang],
    alternates: {
      canonical: `${SITE_DOMAIN}/${lang}/partners`,
      languages: {
        uk: `${SITE_DOMAIN}/ua/partners`,
        ru: `${SITE_DOMAIN}/ru/partners`,
        de: `${SITE_DOMAIN}/de/partners`,
      },
    },
  };
}

export default async function PartnersPage({ params }: { params: { lang: string } }) {
  if (!isSupportedLang(params.lang)) return null;
  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);
  return <PartnersLandingClient lang={lang} dict={dict} />;
}
