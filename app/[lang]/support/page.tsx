import type { Metadata } from "next";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { SUPPORT_METADATA, hreflangSupport, SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import SupportContactForm from "@/components/support/SupportContactForm";

const copy = {
  ru: {
    title: "Контакты и поддержка",
    intro:
      "Свяжитесь с нами, если у вас есть вопрос о платформе, оплате, профиле специалиста или поиске услуги.",
    directTitle: "Связаться напрямую",
    phoneLabel: "Телефон",
    emailLabel: "Email",
    response: "На письменные обращения мы обычно отвечаем в течение 24 часов.",
    callNote:
      "Если мы не ответили на звонок, оставьте сообщение через форму — мы обязательно свяжемся с вами.",
    formTitle: "Напишите нам",
    formIntro: "Опишите ваш вопрос, и мы ответим по указанному email.",
    privacyBefore: "Отправляя форму, вы соглашаетесь с обработкой данных согласно ",
    privacyLink: "Политике конфиденциальности",
  },
  ua: {
    title: "Контакти та підтримка",
    intro:
      "Зв’яжіться з нами, якщо у вас є запитання щодо платформи, оплати, профілю спеціаліста або пошуку послуги.",
    directTitle: "Зв’язатися безпосередньо",
    phoneLabel: "Телефон",
    emailLabel: "Email",
    response: "На письмові звернення ми зазвичай відповідаємо протягом 24 годин.",
    callNote:
      "Якщо ми не відповіли на дзвінок, залиште повідомлення через форму — ми обов’язково зв’яжемося з вами.",
    formTitle: "Напишіть нам",
    formIntro: "Опишіть ваше запитання, і ми відповімо на вказаний email.",
    privacyBefore: "Надсилаючи форму, ви погоджуєтеся з обробкою даних відповідно до ",
    privacyLink: "Політики конфіденційності",
  },
  de: {
    title: "Kontakt und Support",
    intro:
      "Kontaktieren Sie uns bei Fragen zur Plattform, zu Zahlungen, zu Ihrem Profil oder zur Suche nach einer Dienstleistung.",
    directTitle: "Direkter Kontakt",
    phoneLabel: "Telefon",
    emailLabel: "E-Mail",
    response: "Schriftliche Anfragen beantworten wir in der Regel innerhalb von 24 Stunden.",
    callNote:
      "Falls wir Ihren Anruf nicht entgegennehmen können, senden Sie uns bitte das Formular. Wir melden uns bei Ihnen.",
    formTitle: "Schreiben Sie uns",
    formIntro: "Beschreiben Sie Ihr Anliegen. Wir antworten an die angegebene E-Mail-Adresse.",
    privacyBefore: "Mit dem Absenden stimmen Sie der Datenverarbeitung gemäß der ",
    privacyLink: "Datenschutzerklärung",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const seo = SUPPORT_METADATA[lang];
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `${SITE_DOMAIN}/${lang}/support`,
      languages: { ...hreflangSupport() },
    },
  };
}

export default function SupportPage({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const text = copy[lang];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-freuly-primary">
          Freuly
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-freuly-text-primary sm:text-4xl">
          {text.title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-freuly-text-secondary">{text.intro}</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-freuly-border-default bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-freuly-text-primary">{text.directTitle}</h2>

          <dl className="mt-7 space-y-6">
            <div>
              <dt className="text-sm font-medium text-freuly-text-secondary">{text.phoneLabel}</dt>
              <dd className="mt-1">
                <a
                  href="tel:+4916092686432"
                  className="text-lg font-semibold text-freuly-primary hover:underline"
                >
                  +49 160 92686432
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-freuly-text-secondary">{text.emailLabel}</dt>
              <dd className="mt-1">
                <a
                  href="mailto:freuly.de@gmail.com"
                  className="break-all text-lg font-semibold text-freuly-primary hover:underline"
                >
                  freuly.de@gmail.com
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-7 text-sm leading-6 text-freuly-text-secondary">{text.response}</p>
          <p className="mt-3 text-sm leading-6 text-freuly-text-secondary">{text.callNote}</p>
        </section>

        <section className="rounded-2xl border border-freuly-border-default bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-freuly-text-primary">{text.formTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-freuly-text-secondary">{text.formIntro}</p>
          <SupportContactForm lang={lang} />
          <p className="mt-5 text-xs leading-5 text-freuly-text-secondary">
            {text.privacyBefore}
            <a
              href={`/${lang}/datenschutzerklaerung`}
              className="font-medium text-freuly-primary hover:underline"
            >
              {text.privacyLink}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
