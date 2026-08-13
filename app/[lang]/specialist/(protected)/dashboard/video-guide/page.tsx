export const dynamic = "force-dynamic";

import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import { dashboardPageStackClass } from "@/components/dashboard/dashboardStyles";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { isSupportedLang } from "@/lib/i18n";
import {
  VIDEO_GUIDE_EMBED_URL,
  VIDEO_GUIDE_ITEMS,
  VIDEO_GUIDE_MAIN_ID,
  type VideoGuideLocalizedCopy,
} from "@/content/dashboard/videoGuideItems";

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

function pickLocalized(lang: "ru" | "ua" | "de", localized: VideoGuideLocalizedCopy): string {
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
  const allMaterialsTitleByLang: Record<"ru" | "ua" | "de", string> = {
    ru: "Все материалы",
    ua: "Усі матеріали",
    de: "Alle Materialien",
  };

  const mainVideoItem =
    VIDEO_GUIDE_ITEMS.find((item) => item.id === VIDEO_GUIDE_MAIN_ID) ?? VIDEO_GUIDE_ITEMS[0];
  const hasMainVideo = Boolean(mainVideoItem?.embedUrl);

  return (
    <div className={dashboardPageStackClass}>
      <DashboardPageHeader title={pageTitleByLang[activeLang]} subtitle={introByLang[activeLang]} />

      <Card>
        <CardContent className="pt-freuly-6">
          <div className="grid gap-freuly-6 lg:grid-cols-[2fr_1fr]">
            <div className="min-w-0">
              <div className="mb-freuly-3 flex flex-wrap items-center gap-2">
                <Badge variant="info">{pickLocalized(activeLang, mainVideoItem.badge)}</Badge>
                <p className="text-freuly-body font-semibold text-freuly-text-primary">
                  {pickLocalized(activeLang, mainVideoItem.title)}
                </p>
              </div>
              {hasMainVideo ? (
                <div className="overflow-hidden rounded-freuly-md border border-freuly-border-default bg-black">
                  <iframe
                    src={mainVideoItem.embedUrl ?? VIDEO_GUIDE_EMBED_URL}
                    title={pickLocalized(activeLang, mainVideoItem.title)}
                    className="h-[240px] w-full sm:h-[360px]"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-freuly-md border border-dashed border-freuly-border-default bg-freuly-border-subtle p-freuly-6 text-freuly-body-sm text-freuly-text-secondary">
                  {mainVideoFallbackByLang[activeLang]}
                </div>
              )}
            </div>

            <aside className="rounded-freuly-md border border-freuly-border-default bg-freuly-border-subtle/50 p-freuly-4">
              <h2 className="text-freuly-label text-freuly-text-primary">{listTitleByLang[activeLang]}</h2>
              <ul className="mt-freuly-3 space-y-2 text-freuly-body-sm text-freuly-text-secondary">
                {VIDEO_GUIDE_TOPICS[activeLang].map((topic) => (
                  <li key={topic} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-freuly-primary" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{updatesTitleByLang[activeLang]}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
            {updatesBodyByLang[activeLang]}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{allMaterialsTitleByLang[activeLang]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-freuly-4 md:grid-cols-2 xl:grid-cols-3">
            {VIDEO_GUIDE_ITEMS.map((item) => {
              const hasVideo = Boolean(item.embedUrl);
              return (
                <article
                  key={item.id}
                  className={`rounded-freuly-md border p-freuly-4 ${
                    hasVideo
                      ? "border-freuly-border-default bg-freuly-surface"
                      : "border-freuly-warning-border bg-freuly-warning-light/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-freuly-body font-semibold text-freuly-text-primary">
                      {pickLocalized(activeLang, item.title)}
                    </h3>
                    <Badge variant={hasVideo ? "info" : "warning"}>
                      {pickLocalized(activeLang, item.badge)}
                    </Badge>
                  </div>
                  <p className="mt-freuly-2 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
                    {pickLocalized(activeLang, item.description)}
                  </p>
                  {hasVideo ? (
                    <div className="mt-freuly-3 overflow-hidden rounded-freuly-md border border-freuly-border-default bg-black">
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
                    <p className="mt-freuly-3 text-xs font-medium text-freuly-warning">
                      {comingSoonLineByLang[activeLang]}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
