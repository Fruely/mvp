import Link from "next/link";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

const DOMAIN = "https://freuly.de";

const COPY: Record<Lang, {
  h1: string;
  intro: string[];
  whyTitle: string;
  whyItems: string[];
  howTitle: string;
  howText: string;
  availableTitle: string;
  availablePlaceholder: string;
  ctaHeading: string;
  ctaText: string;
  ctaButton: string;
  otherTitle: string;
  seeAlso: string;
  home: string;
  allSpecialists: string;
  becomeSpecialist: string;
}> = {
  ua: {
    h1: "Психологи в Німеччині, які розмовляють українською",
    intro: [
      "Переїзд до Німеччини — це серйозний життєвий крок, пов'язаний з адаптацією, стресом та багатьма запитаннями. Знайти психолога, який розмовляє вашою мовою, — один із найважливіших кроків до комфортного життя в новій країні.",
      "На платформі Freuly ви можете знайти україномовних психологів, які працюють у Німеччині — як офлайн, так і онлайн. Це спеціалісти, які розуміють вашу культуру та контекст.",
      "Вам не потрібно пояснювати базові речі чи підбирати слова чужою мовою — ви можете говорити вільно і бути зрозумілим.",
    ],
    whyTitle: "Чому важливо говорити рідною мовою",
    whyItems: [
      "Простіше виражати емоції та описувати переживання",
      "Легше ставити складні та особисті запитання",
      "Швидше виникає довіра між вами та спеціалістом",
      "Немає бар'єру перекладу — терапія проходить природно",
    ],
    howTitle: "Як обрати психолога",
    howText: "Зверніть увагу на спеціалізацію, формат роботи (онлайн або офлайн) та відгуки інших клієнтів. На Freuly кожен спеціаліст вказує мови, якими працює, своє місто та напрямок. Ви можете порівняти кілька профілів і обрати того, хто вам підходить.",
    availableTitle: "Доступні спеціалісти",
    availablePlaceholder: "Список спеціалістів цієї категорії з'явиться тут у міру розширення бази Freuly.",
    ctaHeading: "Готові знайти свого психолога?",
    ctaText: "Оберіть спеціаліста та надішліть заявку — це перший крок до вирішення вашої ситуації.",
    ctaButton: "Знайти психолога",
    otherTitle: "Інші категорії спеціалістів",
    seeAlso: "Дивіться також",
    home: "Головна сторінка",
    allSpecialists: "Усі спеціалісти",
    becomeSpecialist: "Стати спеціалістом",
  },
  ru: {
    h1: "Психологи в Германии, говорящие на украинском и русском",
    intro: [
      "Переезд в Германию — это серьёзный жизненный шаг, связанный с адаптацией, стрессом и множеством вопросов. Найти психолога, который говорит на вашем языке, — один из самых важных шагов к комфортной жизни в новой стране.",
      "На платформе Freuly вы можете найти украиноязычных и русскоязычных психологов, работающих в Германии — как офлайн, так и онлайн. Это специалисты, которые понимают вашу культуру и контекст.",
      "Вам не нужно объяснять базовые вещи или подбирать слова на чужом языке — вы можете говорить свободно и быть понятым.",
    ],
    whyTitle: "Почему важно говорить на родном языке",
    whyItems: [
      "Проще выражать эмоции и описывать переживания",
      "Легче задавать сложные и личные вопросы",
      "Быстрее возникает доверие между вами и специалистом",
      "Нет барьера перевода — терапия проходит естественно",
    ],
    howTitle: "Как выбрать психолога",
    howText: "Обратите внимание на специализацию, формат работы (онлайн или офлайн) и отзывы других клиентов. На Freuly каждый специалист указывает языки, на которых работает, свой город и направление. Вы можете сравнить несколько профилей и выбрать того, кто вам подходит.",
    availableTitle: "Доступные специалисты",
    availablePlaceholder: "Список специалистов этой категории появится здесь по мере расширения базы Freuly.",
    ctaHeading: "Готовы найти своего психолога?",
    ctaText: "Выберите специалиста и отправьте заявку — это первый шаг к решению вашей ситуации.",
    ctaButton: "Найти психолога",
    otherTitle: "Другие категории специалистов",
    seeAlso: "Смотрите также",
    home: "Главная страница",
    allSpecialists: "Все специалисты",
    becomeSpecialist: "Стать специалистом",
  },
  de: {
    h1: "Psychologen in Deutschland — Ukrainisch und Russisch",
    intro: [
      "Der Umzug nach Deutschland ist ein großer Lebensschritt, der mit Anpassung, Stress und vielen Fragen verbunden ist. Einen Psychologen zu finden, der Ihre Sprache spricht, ist einer der wichtigsten Schritte zu einem komfortablen Leben im neuen Land.",
      "Auf der Plattform Freuly finden Sie ukrainisch- und russischsprachige Psychologen, die in Deutschland arbeiten — sowohl offline als auch online. Das sind Spezialisten, die Ihre Kultur und Ihren Kontext verstehen.",
      "Sie müssen keine grundlegenden Dinge erklären oder nach Worten in einer fremden Sprache suchen — Sie können frei sprechen und verstanden werden.",
    ],
    whyTitle: "Warum die Muttersprache wichtig ist",
    whyItems: [
      "Leichteres Ausdrücken von Emotionen und Erlebnissen",
      "Einfacher, schwierige und persönliche Fragen zu stellen",
      "Schnellerer Vertrauensaufbau zwischen Ihnen und dem Spezialisten",
      "Keine Übersetzungsbarriere — die Therapie verläuft natürlich",
    ],
    howTitle: "Wie Sie einen Psychologen wählen",
    howText: "Achten Sie auf die Spezialisierung, das Arbeitsformat (online oder offline) und die Bewertungen anderer Klienten. Auf Freuly gibt jeder Spezialist die Sprachen an, in denen er arbeitet, seine Stadt und Fachrichtung. Sie können mehrere Profile vergleichen und den passenden auswählen.",
    availableTitle: "Verfügbare Spezialisten",
    availablePlaceholder: "Die Liste der Spezialisten in dieser Kategorie wird hier erscheinen, sobald die Freuly-Datenbank wächst.",
    ctaHeading: "Bereit, Ihren Psychologen zu finden?",
    ctaText: "Wählen Sie einen Spezialisten und senden Sie eine Anfrage — das ist der erste Schritt zur Lösung Ihrer Situation.",
    ctaButton: "Psychologen finden",
    otherTitle: "Weitere Kategorien von Spezialisten",
    seeAlso: "Siehe auch",
    home: "Startseite",
    allSpecialists: "Alle Spezialisten",
    becomeSpecialist: "Spezialist werden",
  },
};

const CATEGORY_LINKS = [
  "masseurs",
  "tutors",
  "cosmetology",
  "nutritionists",
  "it_specialists",
  "cleaning",
] as const;

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? params.lang : "ua";
  return {
    title: COPY[lang as Lang]?.h1
      ? `${COPY[lang as Lang].h1} | Freuly`
      : "Психологи в Германии | Freuly",
    description: COPY[lang as Lang]?.intro[0] ?? "",
    alternates: {
      canonical: `${DOMAIN}/${lang}/psychologists-germany`,
    },
  };
}

export default async function PsychologistsGermanyPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua/psychologists-germany");
  }

  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);
  const copy = COPY[lang];
  const specLang = lang === "ua" ? "uk" : lang;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {copy.h1}
      </h1>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-700">
        {copy.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.whyTitle}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {copy.whyItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.howTitle}</h2>
        <p className="mt-3 text-gray-700 leading-relaxed">{copy.howText}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.availableTitle}</h2>
        <p className="mt-3 text-gray-600 italic">{copy.availablePlaceholder}</p>
      </section>

      <section className="mt-12 rounded-2xl bg-blue-50 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900">{copy.ctaHeading}</h2>
        <p className="mx-auto mt-2 max-w-md text-gray-600">{copy.ctaText}</p>
        <Link
          href={`/${lang}/category/psychologists`}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-base font-semibold text-white transition hover:bg-blue-700"
        >
          {copy.ctaButton}
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">{copy.otherTitle}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {CATEGORY_LINKS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/${lang}/category/${slug}`}
                className="text-blue-600 hover:underline"
              >
                {t(dict, `categories.${slug}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-gray-200 pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {copy.seeAlso}
        </h3>
        <nav className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={`/${lang}`} className="text-blue-600 hover:underline">
            {copy.home}
          </Link>
          <Link href={`/specialists?lang=${specLang}`} className="text-blue-600 hover:underline">
            {copy.allSpecialists}
          </Link>
          <Link href="/become-specialist" className="text-blue-600 hover:underline">
            {copy.becomeSpecialist}
          </Link>
        </nav>
      </section>
    </main>
  );
}
