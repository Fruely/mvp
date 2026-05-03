export type VideoGuideLocalizedCopy = {
  ru: string;
  ua: string;
  de: string;
};

export type VideoGuideItem = {
  id: string;
  title: VideoGuideLocalizedCopy;
  description: VideoGuideLocalizedCopy;
  embedUrl: string | null;
  badge: VideoGuideLocalizedCopy;
};

export const VIDEO_GUIDE_MAIN_ID = "profile-launch";
export const VIDEO_GUIDE_EMBED_URL = "https://www.youtube.com/embed/2eEnzEFqMEg";

export const VIDEO_GUIDE_ITEMS: VideoGuideItem[] = [
  {
    id: VIDEO_GUIDE_MAIN_ID,
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
    embedUrl: VIDEO_GUIDE_EMBED_URL,
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
