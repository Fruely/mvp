import type { Metadata } from "next";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import SpecialistApplicationForm from "@/components/SpecialistApplicationForm";
import SpecialistQuickRegisterForm from "@/components/SpecialistQuickRegisterForm";
import { featureFlags } from "@/lib/featureFlags";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DOMAIN = "https://freuly.de";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = (params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua") as Lang;
  const dict = await getDictionary(lang);
  const canonical = `${DOMAIN}/${lang}/become-specialist`;

  return {
    title: t(dict, "becomeSpecialist.title"),
    description: t(dict, "becomeSpecialist.description"),
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
    return <SpecialistQuickRegisterForm lang={lang} dict={dict} />;
  }

  return <SpecialistApplicationForm lang={lang} dict={dict} />;
}

