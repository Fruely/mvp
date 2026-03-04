import type { Metadata } from "next";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import SpecialistApplicationForm from "@/components/SpecialistApplicationForm";
import SpecialistQuickRegisterForm from "@/components/SpecialistQuickRegisterForm";
import { featureFlags } from "@/lib/featureFlags";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DOMAIN = "https://freuly.de";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const byLang = {
    ua: {
      title: "Подати заявку як спеціаліст | Freuly",
      description:
        "Подайте заявку як спеціаліст на платформі Freuly. B2B-платформа для реальних спеціалістів.",
    },
    ru: {
      title: "Подать заявку как специалист | Freuly",
      description:
        "Подайте заявку как специалист на платформе Freuly. B2B-платформа для реальных специалистов.",
    },
    de: {
      title: "Als Spezialist bewerben | Freuly",
      description:
        "Bewerben Sie sich als Spezialist auf der Freuly-Plattform. B2B-Plattform für echte Fachkräfte.",
    },
  } as const;

  const lang = (params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua") as keyof typeof byLang;
  const canonical = `${DOMAIN}/${lang}/become-specialist`;

  return {
    title: byLang[lang].title,
    description: byLang[lang].description,
    alternates: {
      canonical,
      languages: {
        uk: `${DOMAIN}/ua/become-specialist`,
        ru: `${DOMAIN}/ru/become-specialist`,
        de: `${DOMAIN}/de/become-specialist`,
      },
    },
  };
}

export default async function BecomeSpecialistPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    return null;
  }

  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);

  if (featureFlags.newSpecialistFunnel) {
    return <SpecialistQuickRegisterForm lang={lang} />;
  }

  return <SpecialistApplicationForm lang={lang} dict={dict} />;
}

