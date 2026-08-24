import { brandPlanText } from "@/lib/pricing/planDisplayBranding";

export type DemandChannelLang = "ru" | "ua" | "de";

export type DemandChannelCopy = {
  onboarding: {
    welcomeTitle: string;
    welcomeBody: string;
    start: string;
    continue: string;
    readyCta: string;
    publishReady: string;
    publishNotReady: string;
    steps: Record<"welcome" | "basic" | "about" | "services" | "photo" | "review", string>;
    reviewTitle: string;
    reviewBody: string;
    reviewReadyTitle: string;
    reviewReadyBody: string;
    reviewNotReadyTitle: string;
    reviewNotReadyBody: string;
    finishSetup: string;
    finishingSetup: string;
    draftUntilPaid: string;
    decideLater: string;
    checklistTitle: string;
  };
  billing: {
    kicker: string;
    title: string;
    subtitle: string;
    introTitle: string;
    introBody: string;
    planPickerTitle: string;
    planPickerSubtitle: string;
    professionalHint: string;
    growthHint: string;
    activateProfessional: string;
    activateGrowth: string;
    draftNotice: string;
    decideLater: string;
  };
};

const COPY: Record<DemandChannelLang, DemandChannelCopy> = {
  ru: {
    onboarding: {
      welcomeTitle: "Настройте канал клиентских заявок",
      welcomeBody: "Расскажите, какие услуги вы оказываете, где и на каких языках работаете. Эти данные помогают Freuly сопоставлять вас с подходящими запросами клиентов.",
      start: "Начать настройку",
      continue: "Продолжить настройку",
      readyCta: "Проверить готовность",
      publishReady: "Основные параметры уже заполнены. Проверьте их и завершите настройку перед подключением коммерческого доступа.",
      publishNotReady: "Заполните основные параметры, чтобы Freuly понимал, какие клиентские запросы вам подходят.",
      steps: { welcome: "Старт", basic: "Какие заявки вам подходят", about: "Почему выбирают вас", services: "Услуги и цены", photo: "Доверие", review: "Готовность" },
      reviewTitle: "Канал заявок почти готов",
      reviewBody: "Проверьте параметры. Профиль пока сохранён как невидимый черновик. После выбора Professional или Growth и успешной оплаты Freuly опубликует профиль и активирует канал клиентских заявок.",
      reviewReadyTitle: "Черновик готов к активации",
      reviewReadyBody: "Freuly уже понимает, какие услуги, языки и формат работы вам подходят. Теперь выберите пакет, чтобы опубликовать профиль и активировать канал заявок.",
      reviewNotReadyTitle: "Нужно уточнить параметры",
      reviewNotReadyBody: "Заполните обязательные пункты — без них Freuly не сможет надёжно сопоставлять ваш профиль с клиентскими запросами.",
      finishSetup: "Выбрать пакет и активировать канал",
      finishingSetup: "Переходим к активации…",
      draftUntilPaid: "До успешной оплаты профиль остаётся невидимым черновиком и не участвует в получении клиентских заявок.",
      decideLater: "Решу позже — сохранить черновик",
      checklistTitle: "Готовность к заявкам"
    },
    billing: {
      kicker: "Канал заявок",
      title: "Активируйте канал клиентских заявок",
      subtitle: "Профиль уже подготовлен. Для публикации профиля и коммерческого участия в получении подходящих клиентских запросов подключите Professional или Growth.",
      introTitle: "Freuly — не просто размещение в каталоге",
      introBody: "Мы создаём канал спроса на услуги специалистов: привлекаем клиентские запросы и сопоставляем их с подходящими специалистами по услуге, языку и формату работы. Оплата пакета активирует ваше коммерческое участие в этой системе.",
      planPickerTitle: "Выберите уровень подключения",
      planPickerSubtitle: "Оба платных пакета публикуют ваш профиль и подключают канал заявок. Growth дополнительно усиливает вашу презентацию полноценной профессиональной страницей.",
      professionalHint: "Публикация профиля, коммерческое подключение к каналу клиентских заявок, самостоятельное ведение профиля и до 5 фото в галерее.",
      growthHint: "Публикация профиля, коммерческое подключение к каналу клиентских заявок плюс профессиональная landing page и до 15 фото в галерее.",
      activateProfessional: "Активировать Professional",
      activateGrowth: "Активировать Growth",
      draftNotice: "Пока пакет не оплачен, профиль не публикуется и остаётся сохранённым черновиком.",
      decideLater: "Решу позже — оставить черновиком"
    }
  },
  ua: {
    onboarding: {
      welcomeTitle: "Налаштуйте канал клієнтських заявок",
      welcomeBody: "Розкажіть, які послуги ви надаєте, де та якими мовами працюєте. Ці дані допомагають Freuly зіставляти вас із відповідними запитами клієнтів.",
      start: "Почати налаштування",
      continue: "Продовжити налаштування",
      readyCta: "Перевірити готовність",
      publishReady: "Основні параметри вже заповнені. Перевірте їх і завершіть налаштування перед підключенням комерційного доступу.",
      publishNotReady: "Заповніть основні параметри, щоб Freuly розумів, які клієнтські запити вам підходять.",
      steps: { welcome: "Старт", basic: "Які заявки вам підходять", about: "Чому обирають вас", services: "Послуги та ціни", photo: "Довіра", review: "Готовність" },
      reviewTitle: "Канал заявок майже готовий",
      reviewBody: "Перевірте параметри. Профіль поки збережений як невидима чернетка. Після вибору Professional або Growth та успішної оплати Freuly опублікує профіль і активує канал клієнтських заявок.",
      reviewReadyTitle: "Чернетка готова до активації",
      reviewReadyBody: "Freuly вже розуміє, які послуги, мови та формат роботи вам підходять. Тепер оберіть пакет, щоб опублікувати профіль і активувати канал заявок.",
      reviewNotReadyTitle: "Потрібно уточнити параметри",
      reviewNotReadyBody: "Заповніть обов’язкові пункти — без них Freuly не зможе надійно зіставляти ваш профіль із клієнтськими запитами.",
      finishSetup: "Обрати пакет і активувати канал",
      finishingSetup: "Переходимо до активації…",
      draftUntilPaid: "До успішної оплати профіль залишається невидимою чернеткою та не бере участі в отриманні клієнтських заявок.",
      decideLater: "Вирішу пізніше — зберегти чернетку",
      checklistTitle: "Готовність до заявок"
    },
    billing: {
      kicker: "Канал заявок",
      title: "Активуйте канал клієнтських заявок",
      subtitle: "Профіль уже підготовлений. Для публікації профілю та комерційної участі в отриманні відповідних клієнтських запитів підключіть Professional або Growth.",
      introTitle: "Freuly — не просто розміщення в каталозі",
      introBody: "Ми створюємо канал попиту на послуги спеціалістів: залучаємо клієнтські запити та зіставляємо їх із відповідними спеціалістами за послугою, мовою і форматом роботи. Оплата пакета активує вашу комерційну участь у цій системі.",
      planPickerTitle: "Оберіть рівень підключення",
      planPickerSubtitle: "Обидва платні пакети публікують ваш профіль і підключають канал заявок. Growth додатково посилює вашу презентацію повноцінною професійною сторінкою.",
      professionalHint: "Публікація профілю, комерційне підключення до каналу клієнтських заявок, самостійне ведення профілю та до 5 фото в галереї.",
      growthHint: "Публікація профілю, комерційне підключення до каналу клієнтських заявок плюс професійна landing page та до 15 фото в галереї.",
      activateProfessional: "Активувати Professional",
      activateGrowth: "Активувати Growth",
      draftNotice: "Поки пакет не оплачено, профіль не публікується та залишається збереженою чернеткою.",
      decideLater: "Вирішу пізніше — залишити чернеткою"
    }
  },
  de: {
    onboarding: {
      welcomeTitle: "Richten Sie Ihren Kanal für Kundenanfragen ein",
      welcomeBody: "Teilen Sie uns mit, welche Leistungen Sie anbieten, wo und in welchen Sprachen Sie arbeiten. Diese Angaben helfen Freuly, Sie mit passenden Kundenanfragen abzugleichen.",
      start: "Einrichtung starten",
      continue: "Einrichtung fortsetzen",
      readyCta: "Bereitschaft prüfen",
      publishReady: "Die wichtigsten Angaben sind bereits vorhanden. Prüfen Sie sie und schließen Sie die Einrichtung ab, bevor Sie den kommerziellen Zugang aktivieren.",
      publishNotReady: "Vervollständigen Sie die wichtigsten Angaben, damit Freuly erkennen kann, welche Kundenanfragen zu Ihnen passen.",
      steps: { welcome: "Start", basic: "Passende Anfragen", about: "Warum Sie", services: "Leistungen & Preise", photo: "Vertrauen", review: "Bereitschaft" },
      reviewTitle: "Ihr Anfragekanal ist fast bereit",
      reviewBody: "Prüfen Sie Ihre Angaben. Ihr Profil bleibt zunächst als unsichtbarer Entwurf gespeichert. Nach Auswahl von Professional oder Growth und erfolgreicher Zahlung veröffentlicht Freuly das Profil und aktiviert den Anfragekanal.",
      reviewReadyTitle: "Ihr Entwurf ist bereit zur Aktivierung",
      reviewReadyBody: "Freuly kennt nun Ihre Leistungen, Sprachen und Ihr Arbeitsformat. Wählen Sie jetzt ein Paket, um Ihr Profil zu veröffentlichen und den Anfragekanal zu aktivieren.",
      reviewNotReadyTitle: "Einige Angaben fehlen noch",
      reviewNotReadyBody: "Vervollständigen Sie die Pflichtangaben — ohne sie kann Freuly Ihr Profil nicht zuverlässig mit Kundenanfragen abgleichen.",
      finishSetup: "Paket wählen und Anfragekanal aktivieren",
      finishingSetup: "Weiter zur Aktivierung…",
      draftUntilPaid: "Bis zur erfolgreichen Zahlung bleibt Ihr Profil ein unsichtbarer Entwurf und nimmt nicht an Kundenanfragen teil.",
      decideLater: "Später entscheiden — Entwurf speichern",
      checklistTitle: "Bereit für Anfragen"
    },
    billing: {
      kicker: "Anfragekanal",
      title: "Aktivieren Sie Ihren Kanal für Kundenanfragen",
      subtitle: "Ihr Profil ist vorbereitet. Für die Veröffentlichung und die kommerzielle Teilnahme an passenden Kundenanfragen aktivieren Sie Professional oder Growth.",
      introTitle: "Freuly ist mehr als ein Verzeichniseintrag",
      introBody: "Wir schaffen Nachfrage nach Leistungen: Freuly gewinnt Kundenanfragen und gleicht sie nach Leistung, Sprache und Arbeitsformat mit passenden Fachkräften ab. Mit einem bezahlten Paket aktivieren Sie Ihre kommerzielle Teilnahme an diesem System.",
      planPickerTitle: "Wählen Sie Ihren Zugang",
      planPickerSubtitle: "Beide bezahlten Pakete veröffentlichen Ihr Profil und aktivieren den Anfragekanal. Growth ergänzt dies um eine professionelle Landingpage für eine stärkere Präsentation.",
      professionalHint: "Profilveröffentlichung, kommerzieller Zugang zum Kundenanfrage-Kanal, eigenständige Profilpflege und bis zu 5 Galerie-Fotos.",
      growthHint: "Profilveröffentlichung, kommerzieller Zugang zum Kundenanfrage-Kanal plus professionelle Landingpage und bis zu 15 Galerie-Fotos.",
      activateProfessional: "Professional aktivieren",
      activateGrowth: "Growth aktivieren",
      draftNotice: "Bis zur Zahlung wird Ihr Profil nicht veröffentlicht und bleibt als Entwurf gespeichert.",
      decideLater: "Später entscheiden — Entwurf behalten"
    }
  }
};

function brandDemandCopy(copy: DemandChannelCopy): DemandChannelCopy {
  return {
    onboarding: {
      ...copy.onboarding,
      welcomeTitle: brandPlanText(copy.onboarding.welcomeTitle),
      welcomeBody: brandPlanText(copy.onboarding.welcomeBody),
      start: brandPlanText(copy.onboarding.start),
      continue: brandPlanText(copy.onboarding.continue),
      readyCta: brandPlanText(copy.onboarding.readyCta),
      publishReady: brandPlanText(copy.onboarding.publishReady),
      publishNotReady: brandPlanText(copy.onboarding.publishNotReady),
      steps: Object.fromEntries(
        Object.entries(copy.onboarding.steps).map(([key, value]) => [key, brandPlanText(value)]),
      ) as DemandChannelCopy["onboarding"]["steps"],
      reviewTitle: brandPlanText(copy.onboarding.reviewTitle),
      reviewBody: brandPlanText(copy.onboarding.reviewBody),
      reviewReadyTitle: brandPlanText(copy.onboarding.reviewReadyTitle),
      reviewReadyBody: brandPlanText(copy.onboarding.reviewReadyBody),
      reviewNotReadyTitle: brandPlanText(copy.onboarding.reviewNotReadyTitle),
      reviewNotReadyBody: brandPlanText(copy.onboarding.reviewNotReadyBody),
      finishSetup: brandPlanText(copy.onboarding.finishSetup),
      finishingSetup: brandPlanText(copy.onboarding.finishingSetup),
      draftUntilPaid: brandPlanText(copy.onboarding.draftUntilPaid),
      decideLater: brandPlanText(copy.onboarding.decideLater),
      checklistTitle: brandPlanText(copy.onboarding.checklistTitle),
    },
    billing: Object.fromEntries(
      Object.entries(copy.billing).map(([key, value]) => [key, brandPlanText(value)]),
    ) as DemandChannelCopy["billing"],
  };
}

export function getDemandChannelCopy(lang: string): DemandChannelCopy {
  return brandDemandCopy(COPY[lang === "de" ? "de" : lang === "ua" ? "ua" : "ru"]);
}
