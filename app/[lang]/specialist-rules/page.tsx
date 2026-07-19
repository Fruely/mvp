import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { SPECIALIST_RULES_METADATA, SITE_DOMAIN, hreflangSpecialistRules } from "@/lib/seo/siteMetadata";

export const dynamic = "force-dynamic";

type RuleItem = { title: string; body: string };

type SpecialistRulesDict = {
  title: string;
  intro: string;
  closing: string;
  rules: RuleItem[];
};

type StartOfferCopy = {
  title: string;
  bodyBeforeLink: string;
  linkText: string;
  bodyAfterLink: string;
};

function getStartOfferCopy(lang: Lang): StartOfferCopy {
  if (lang === "de") {
    return {
      title: "Kostenlose Startplatzierung für die ersten 50 Spezialisten",
      bodyBeforeLink:
        "Die Registrierung und Veröffentlichung des Profils erfolgt derzeit im Rahmen eines Startangebots für die ersten 50 registrierten und veröffentlichten Spezialisten: Die Platzierung ist für 3 Monate kostenlos. Während dieses Zeitraums kann der Spezialist die erweiterten Platzierungsmöglichkeiten kostenlos testen. Nach Ablauf der 3 Monate kann Freuly kostenpflichtige Tarife auf freiwilliger Basis anbieten. Es wird kein kostenpflichtiges Abonnement automatisch aktiviert, und es erfolgen keine automatischen Abbuchungen oder Zahlungen ohne separate Zustimmung des Spezialisten. Die aktuellen Tarifinformationen finden Sie auf der Seite",
      linkText: "Tarife",
      bodyAfterLink:
        ". Nach Erreichen der ersten 50 veröffentlichten Spezialisten können für neue Spezialisten andere Bedingungen gelten, zum Beispiel ein anderer kostenloser Testzeitraum oder andere Tarifangebote.",
    };
  }

  if (lang === "ru") {
    return {
      title: "Стартовое бесплатное размещение для первых 50 специалистов",
      bodyBeforeLink:
        "Регистрация и публикация профиля сейчас происходят в рамках стартового предложения для первых 50 зарегистрированных и опубликованных специалистов: размещение предоставляется бесплатно на 3 месяца. В течение этого периода специалист может бесплатно пользоваться расширенными возможностями размещения. После окончания 3 месяцев Freuly может предложить платные тарифы на добровольной основе. Платная подписка не подключается автоматически, автоматических списаний и платежей без отдельного согласия специалиста не происходит. Актуальная информация о тарифах доступна на странице",
      linkText: "Тарифы",
      bodyAfterLink:
        ". После заполнения первых 50 опубликованных мест для новых специалистов могут действовать другие условия, например другой бесплатный тестовый период или другие тарифные предложения.",
    };
  }

  return {
    title: "Стартове безкоштовне розміщення для перших 50 спеціалістів",
    bodyBeforeLink:
      "Реєстрація та публікація профілю зараз відбуваються в межах стартової пропозиції для перших 50 зареєстрованих і опублікованих спеціалістів: розміщення надається безкоштовно на 3 місяці. Протягом цього періоду спеціаліст може безкоштовно користуватися розширеними можливостями розміщення. Після завершення 3 місяців Freuly може запропонувати платні тарифи на добровільній основі. Платна підписка не підключається автоматично, автоматичних списань і платежів без окремої згоди спеціаліста не відбувається. Актуальна інформація про тарифи доступна на сторінці",
    linkText: "Тарифи",
    bodyAfterLink:
      ". Після заповнення перших 50 опублікованих місць для нових спеціалістів можуть діяти інші умови, наприклад інший безкоштовний тестовий період або інші тарифні пропозиції.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang =
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const seo = SPECIALIST_RULES_METADATA[lang];
  const canonical = `${SITE_DOMAIN}/${lang}/specialist-rules`;
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: { ...hreflangSpecialistRules() },
    },
  };
}

export default async function SpecialistRulesPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);
  const sr = dict.specialistRules as SpecialistRulesDict | undefined;
  if (!sr?.rules?.length) {
    return null;
  }

  const back = t(dict, "specialistRules.backToHome", { defaultValue: "← На головну" });
  const startOffer = getStartOfferCopy(lang);
  const translationNotice =
    lang === "ru"
      ? "Этот перевод предоставлен для удобства. В случае расхождений определяющей является немецкая версия."
      : lang === "ua"
        ? "Цей переклад надано для зручності. У разі розбіжностей визначальною є німецька версія."
        : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/${lang}`}
        className="mb-8 inline-block font-medium text-blue-600 hover:text-blue-700"
      >
        {back}
      </Link>

      <article className="prose prose-gray max-w-none">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">{sr.title}</h1>
        {translationNotice ? (
          <p
            className="not-prose mb-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950/90"
            role="note"
          >
            {translationNotice}
          </p>
        ) : null}
        <p className="text-lg text-gray-700">{sr.intro}</p>

        <ol className="mt-8 list-decimal space-y-8 pl-5 marker:font-semibold">
          <li className="pl-2">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">{startOffer.title}</h2>
            <p className="text-gray-700 leading-relaxed">
              {startOffer.bodyBeforeLink}{" "}
              <Link
                href={`/${lang}/pricing`}
                className="font-semibold text-blue-600 underline hover:text-blue-700"
              >
                {startOffer.linkText}
              </Link>
              {startOffer.bodyAfterLink}
            </p>
          </li>
          {sr.rules.map((rule, i) => (
            <li key={i} className="pl-2">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{rule.title}</h2>
              <p className="text-gray-700 leading-relaxed">{rule.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-10 border-t border-gray-200 pt-8 text-gray-800">{sr.closing}</p>
      </article>
    </div>
  );
}
