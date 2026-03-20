import Link from "next/link";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang as Lang);
  return {
    title: t(dict, "support.title"),
    description: t(dict, "support.description"),
  };
}

export default async function SupportPage({ params }: { params: { lang: string } }) {
  const lang = (isSupportedLang(params.lang) ? params.lang : "ua") as Lang;
  const dict = await getDictionary(lang);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">

      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">
          {t(dict, "support.title")}
        </h1>

        <p className="text-lg text-gray-600">
          {t(dict, "support.intro")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "support.contactTitle")}
        </h2>

        <p className="text-gray-700 mb-2">
          {t(dict, "support.contactText")}
        </p>

        <p className="text-blue-600 font-semibold">
          info@freuly.de
        </p>

        <p className="text-gray-700 mt-4">
          {t(dict, "support.responseTime")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "support.faqTitle")}
        </h2>

        <p className="text-gray-700 mb-3">
          <b>{t(dict, "support.faq1q")}</b>
        </p>

        <p className="text-gray-700 mb-6">
          {t(dict, "support.faq1a")}
        </p>

        <p className="text-gray-700 mb-3">
          <b>{t(dict, "support.faq2q")}</b>
        </p>

        <p className="text-gray-700 mb-6">
          {t(dict, "support.faq2a")}
        </p>

        <p className="text-gray-700 mb-3">
          <b>{t(dict, "support.faq3q")}</b>
        </p>

        <p className="text-gray-700">
          {t(dict, "support.faq3a")}
        </p>
      </section>

      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "cta.specialist")}
        </h2>

        <Link
          href="/for-specialists"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full"
        >
          {t(dict, "cta.joinButton")}
        </Link>
      </section>

      <div className="text-center">
        <Link href={`/${lang}`} className="text-blue-600 hover:underline">
          {t(dict, "support.backToHome")}
        </Link>
      </div>

    </div>
  );
}