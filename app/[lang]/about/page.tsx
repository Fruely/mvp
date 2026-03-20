import Link from "next/link";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang as Lang);
  return {
    title: t(dict, "about.title"),
    description: t(dict, "about.description"),
  };
}

export default async function AboutPage({ params }: { params: { lang: string } }) {
  const lang = (isSupportedLang(params.lang) ? params.lang : "ua") as Lang;
  const dict = await getDictionary(lang);

  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">

      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">
          {t(dict, "about.title")}
        </h1>

        <p className="text-lg text-gray-600 leading-relaxed">
          {t(dict, "about.intro")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "about.whyTitle")}
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          {t(dict, "about.whyText1")}
        </p>

        <p className="text-gray-700 leading-relaxed">
          {t(dict, "about.whyText2")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "about.whatTitle")}
        </h2>

        <p className="text-gray-700 mb-4">
          {t(dict, "about.whatText")}
        </p>

        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>{t(dict, "about.whatList1")}</li>
          <li>{t(dict, "about.whatList2")}</li>
          <li>{t(dict, "about.whatList3")}</li>
          <li>{t(dict, "about.whatList4")}</li>
          <li>{t(dict, "about.whatList5")}</li>
        </ul>

        <p className="text-gray-700 mt-4">
          {t(dict, "about.whatOnlineNote")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "about.howTitle")}
        </h2>

        <ol className="list-decimal pl-6 text-gray-700 space-y-2">
          <li>{t(dict, "about.howStep1")}</li>
          <li>{t(dict, "about.howStep2")}</li>
          <li>{t(dict, "about.howStep3")}</li>
          <li>{t(dict, "about.howStep4")}</li>
        </ol>

        <p className="text-gray-700 mt-4">
          {t(dict, "about.howNote")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "about.forWhomTitle")}
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          {t(dict, "about.forWhomText")}
        </p>

        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>{t(dict, "about.forWhomList1")}</li>
          <li>{t(dict, "about.forWhomList2")}</li>
          <li>{t(dict, "about.forWhomList3")}</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "about.whyJoinTitle")}
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          {t(dict, "about.whyJoinText1")}
        </p>

        <p className="text-gray-700 leading-relaxed">
          {t(dict, "about.whyJoinText2")}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "about.missionTitle")}
        </h2>

        <p className="text-gray-700 leading-relaxed">
          {t(dict, "about.missionText")}
        </p>
      </section>

      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">
          {t(dict, "cta.specialist")}
        </h2>

        <p className="text-gray-700 mb-6">
          {t(dict, "about.ctaText")}
        </p>

        <Link
          href="/for-specialists"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition"
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