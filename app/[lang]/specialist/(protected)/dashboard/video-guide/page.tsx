export const dynamic = "force-dynamic";

import { isSupportedLang } from "@/lib/i18n";

type LocalizedCopy = {
  ru: string;
  ua: string;
  de: string;
};

type VideoGuideItem = {
  id: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  embedUrl: string | null;
  badge: LocalizedCopy;
};

const VIDEO_GUIDE_ITEMS: VideoGuideItem[] = [
  {
    id: "profile-launch",
    title: {
      ru: "Запуск и публикация профиля",
      ua: "Запуск і публікація профілю",
      de: "Profilstart und Veröffentlichung",
    },
    description: {
      ru: "Как заполнить профиль, добавить услуги, галерею и опубликоваться на Freuly.",
      ua: "Як заповнити профіль, додати послуги, галерею та опублікуватися на Freuly.",
      de: "So füllen Sie Ihr Profil aus, fügen Leistungen und Galerie hinzu und veröffentlichen Ihr Profil auf Freuly.",
    },
    embedUrl: "https://www.youtube.com/embed/2eEnzEFqMEg",
    badge: {
      ru: "Старт",
      ua: "Старт",
      de: "Start",
    },
  },
  {
    id: "payments-coming-soon",
    title: {
      ru: "Оплата и тарифы",
      ua: "Оплата й тарифи",
      de: "Zahlung und Tarife",
    },
    description: {
      ru: "Скоро здесь появится отдельный видеогид о подписке, оплате размещения и тарифах Freuly.",
      ua: "Незабаром тут зʼявиться окремий відеогід про підписку, оплату розміщення та тарифи Freuly.",
      de: "Hier erscheint bald ein eigener Videoguide zu Abonnement, Zahlung und Tarifen bei Freuly.",
    },
    embedUrl: null,
    badge: {
      ru: "Скоро",
      ua: "Скоро",
      de: "Bald",
    },
  },
  {
    id: "dashboard-updates",
    title: {
      ru: "Новые возможности кабинета",
      ua: "Нові можливості кабінету",
      de: "Neue Dashboard-Funktionen",
    },
    description: {
      ru: "Когда в кабинете появляются новые функции, мы будем добавлять сюда пояснения и новые видеогиды.",
      ua: "Коли в кабінеті зʼявлятимуться нові функції, ми додаватимемо сюди пояснення та нові відеогіди.",
      de: "Wenn neue Funktionen im Dashboard erscheinen, ergänzen wir hier Erklärungen und neue Videoguides.",
    },
    embedUrl: null,
    badge: {
      ru: "Обновления",
      ua: "Оновлення",
      de: "Updates",
    },
  },
];

const VIDEO_GUIDE_TOPICS: Record<"ru" | "ua" | "de", string[]> = {
  ru: [
    "Регистрация и вход в кабинет",
    "Заполнение профиля специалиста",
    "Добавление услуг",
    "Добавление галереи и фото",
    "Публикация профиля",
    "Основные вкладки кабинета",
    "Работа с заявками",
    "Новые возможности кабинета",
  ],
  ua: [
    "Реєстрація та вхід до кабінету",
    "Заповнення профілю спеціаліста",
    "Додавання послуг",
    "Додавання галереї та фото",
    "Публікація профілю",
    "Основні вкладки кабінету",
    "Робота із заявками",
    "Нові можливості кабінету",
  ],
  de: [
    "Registrierung und Anmeldung im Dashboard",
    "Spezialistenprofil ausfüllen",
    "Leistungen hinzufügen",
    "Galerie und Fotos hinzufügen",
    "Profil veröffentlichen",
    "Wichtige Dashboard-Bereiche",
    "Anfragen bearbeiten",
    "Neue Funktionen im Dashboard",
  ],
};

function pickLocalized(
  lang: "ru" | "ua" | "de",
  localized: LocalizedCopy
): string {
  return localized[lang];
}

export default async function SpecialistDashboardVideoGuidePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const lang = isSupportedLang(resolvedParams.lang) ? resolvedParams.lang : "ru";
  const activeLang = lang as "ru" | "ua" | "de";

  const pageTitleByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Видеогид и обновления",
    ua: "Відеогід та оновлення",
    de: "Videoguide und Updates",
  };
  const introByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Посмотрите видеогиды по кабинету специалиста Freuly: как заполнить профиль, добавить услуги и галерею, опубликовать профиль, работать с заявками и пользоваться новыми возможностями кабинета.",
    ua: "Перегляньте відеогіди по кабінету спеціаліста Freuly: як заповнити профіль, додати послуги й галерею, опублікувати профіль, працювати із заявками та користуватися новими можливостями кабінету.",
    de: "Sehen Sie sich die Videoguides zum Freuly-Spezialistenkonto an: Profil ausfüllen, Leistungen und Galerie hinzufügen, Profil veröffentlichen, Anfragen bearbeiten und neue Dashboard-Funktionen nutzen.",
  };

  const listTitleByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Что показано в видеогиде",
    ua: "Що показано у відеогіді",
    de: "Was im Videoguide gezeigt wird",
  };

  const updatesTitleByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Что нового",
    ua: "Що нового",
    de: "Was ist neu",
  };
  const updatesBodyByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Когда в кабинете появляются новые функции, мы будем добавлять сюда пояснения и обновлять видеогиды. Здесь также появятся материалы об оплате, тарифах и новых возможностях Freuly.",
    ua: "Коли в кабінеті зʼявлятимуться нові функції, ми додаватимемо сюди пояснення та оновлюватимемо відеогіди. Тут також зʼявляться матеріали про оплату, тарифи та нові можливості Freuly.",
    de: "Wenn neue Funktionen im Dashboard erscheinen, ergänzen wir hier Erklärungen und aktualisieren die Videoguides. Hier erscheinen auch Materialien zu Zahlung, Tarifen und neuen Möglichkeiten bei Freuly.",
  };
  const comingSoonLineByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Этот материал скоро будет доступен.",
    ua: "Цей матеріал скоро буде доступний.",
    de: "Dieses Material wird bald verfugbar sein.",
  };
  const mainVideoFallbackByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Видео скоро будет доступно.",
    ua: "Відео скоро буде доступне.",
    de: "Das Video wird bald verfugbar sein.",
  };

  const mainVideoItem = VIDEO_GUIDE_ITEMS[0];
  const hasMainVideo = Boolean(mainVideoItem?.embedUrl);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {pageTitleByLang[activeLang]}
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-gray-600">
          {introByLang[activeLang]}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {pickLocalized(activeLang, mainVideoItem.badge)}
              </span>
              <p className="text-sm font-semibold text-gray-900">
                {pickLocalized(activeLang, mainVideoItem.title)}
              </p>
            </div>
            {hasMainVideo ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
                <iframe
                  src={mainVideoItem.embedUrl ?? ""}
                  title={pickLocalized(activeLang, mainVideoItem.title)}
                  className="h-[240px] w-full sm:h-[360px]"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                {mainVideoFallbackByLang[activeLang]}
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {listTitleByLang[activeLang]}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {VIDEO_GUIDE_TOPICS[activeLang].map((topic) => (
                <li key={topic} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          {updatesTitleByLang[activeLang]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {updatesBodyByLang[activeLang]}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          {activeLang === "de" ? "Alle Materialien" : activeLang === "ua" ? "Усі матеріали" : "Все материалы"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {VIDEO_GUIDE_ITEMS.map((item) => {
            const hasVideo = Boolean(item.embedUrl);
            return (
              <article
                key={item.id}
                className={`rounded-xl border p-4 ${
                  hasVideo
                    ? "border-gray-200 bg-white shadow-sm"
                    : "border-amber-200 bg-amber-50/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {pickLocalized(activeLang, item.title)}
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      hasVideo
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pickLocalized(activeLang, item.badge)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {pickLocalized(activeLang, item.description)}
                </p>
                {hasVideo ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-black">
                    <iframe
                      src={item.embedUrl ?? ""}
                      title={pickLocalized(activeLang, item.title)}
                      className="h-[180px] w-full"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-medium text-amber-800">
                    {comingSoonLineByLang[activeLang]}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
