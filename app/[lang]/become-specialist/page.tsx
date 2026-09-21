import type { Metadata } from "next";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import SpecialistQuickRegisterForm from "@/components/SpecialistQuickRegisterForm";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const byLang = {
    ua: {
      title: "Створити безкоштовний профіль спеціаліста | Freuly",
      description:
        "Зареєструйтеся та опублікуйте базовий профіль спеціаліста на Freuly безкоштовно. Платний доступ потрібен лише для контактів клієнтських запитів або функцій тарифу.",
    },
    ru: {
      title: "Создать бесплатный профиль специалиста | Freuly",
      description:
        "Зарегистрируйтесь и опубликуйте базовый профиль специалиста на Freuly бесплатно. Платный доступ нужен только для контактов клиентских заявок или функций тарифа.",
    },
    de: {
      title: "Kostenloses Spezialistenprofil erstellen | Freuly",
      description:
        "Registrieren und veröffentlichen Sie Ihr Basisprofil auf Freuly kostenlos. Kostenpflichtig sind nur Kundenkontakt-Zugänge oder zusätzliche Tariffunktionen.",
    },
  } as const;

  const lang = (params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua") as keyof typeof byLang;
  const canonical = `${SITE_DOMAIN}/${lang}/become-specialist`;

  return {
    title: byLang[lang].title,
    description: byLang[lang].description,
    alternates: {
      canonical,
      languages: {
        uk: `${SITE_DOMAIN}/ua/become-specialist`,
        ru: `${SITE_DOMAIN}/ru/become-specialist`,
        de: `${SITE_DOMAIN}/de/become-specialist`,
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

  return <SpecialistQuickRegisterForm lang={lang} dict={dict} />;
}
