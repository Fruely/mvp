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
      reviewBody: "Проверьте параметры. После завершения настройки останется выбрать Professional или Growth и активировать коммерческий доступ к клиентским запросам Freuly.",
      reviewReadyTitle: "Параметры для подбора заявок настроены",
      reviewReadyBody: "Freuly уже понимает, какие услуги, языки и формат работы вам подходят. Завершите настройку, чтобы перейти к активации канала заявок.",
      reviewNotReadyTitle: "Нужно уточнить параметры",
      reviewNotReadyBody: "Заполните обязательные пункты — без них Freuly не сможет надёжно сопоставлять ваш профиль с клиентскими запросами.",
      finishSetup: "Завершить настройку и выбрать пакет",
      finishingSetup: "Завершаем настройку…",
      checklistTitle: "Готовность к заявкам"
    },
    billing: {
      kicker: "Канал заявок",
      title: "Активируйте канал клиентских заявок",
      subtitle: "Ознакомительный режим позволяет настроить профиль и изучить кабинет. Для коммерческого использования Freuly и участия в получении подходящих клиентских запросов подключите Professional или Growth.",
      introTitle: "Freuly — не просто размещение в каталоге",
      introBody: "Мы создаём канал спроса на услуги специалистов: привлекаем клиентские запросы и сопоставляем их с подходящими специалистами по услуге, языку и формату работы. Оплата пакета активирует ваше коммерческое участие в этой системе.",
      planPickerTitle: "Выберите уровень подключения",
      planPickerSubtitle: "Оба платных пакета подключают коммерческий доступ к каналу заявок. Growth дополнительно усиливает вашу презентацию полноценной профессиональной страницей.",
      professionalHint: "Коммерческое подключение к каналу клиентских заявок, самостоятельное ведение профиля и до 5 фото в галерее.",
      growthHint: "Коммерческое подключение к каналу клиентских заявок плюс профессиональная landing page и до 15 фото в галерее.",
      activateProfessional: "Активировать Professional",
      activateGrowth: "Активировать Growth"
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
      reviewBody: "Перевірте параметри. Після завершення налаштування залишиться обрати Professional або Growth і активувати комерційний доступ до клієнтських запитів Freuly.",
      reviewReadyTitle: "Параметри для підбору заявок налаштовані",
      reviewReadyBody: "Freuly вже розуміє, які послуги, мови та формат роботи вам підходять. Завершіть налаштування, щоб перейти до активації каналу заявок.",
      reviewNotReadyTitle: "Потрібно уточнити параметри",
      reviewNotReadyBody: "Заповніть обов’язкові пункти — без них Freuly не зможе надійно зіставляти ваш профіль із клієнтськими запитами.",
      finishSetup: "Завершити налаштування й обрати пакет",
      finishingSetup: "Завершуємо налаштування…",
      checklistTitle: "Готовність до заявок"
    },
    billing: {
      kicker: "Канал заявок",
      title: "Активуйте канал клієнтських заявок",
      subtitle: "Ознайомчий режим дозволяє налаштувати профіль і вивчити кабінет. Для комерційного використання Freuly та участі в отриманні відповідних клієнтських запитів підключіть Professional або Growth.",
      introTitle: "Freuly — не просто розміщення в каталозі",
      introBody: "Ми створюємо канал попиту на послуги спеціалістів: залучаємо клієнтські запити та зіставляємо їх із відповідними спеціалістами за послугою, мовою і форматом роботи. Оплата пакета активує вашу комерційну участь у цій системі.",
      planPickerTitle: "Оберіть рівень підключення",
      planPickerSubtitle: "Обидва платні пакети підключають комерційний доступ до каналу заявок. Growth додатково посилює вашу презентацію повноцінною професійною сторінкою.",
      professionalHint: "Комерційне підключення до каналу клієнтських заявок, самостійне ведення профілю та до 5 фото в галереї.",
      growthHint: "Комерційне підключення до каналу клієнтських заявок плюс професійна landing page та до 15 фото в галереї.",
      activateProfessional: "Активувати Professional",
      activateGrowth: "Активувати Growth"
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
      reviewBody: "Prüfen Sie Ihre Angaben. Danach wählen Sie Professional oder Growth und aktivieren den kommerziellen Zugang zu Kundenanfragen bei Freuly.",
      reviewReadyTitle: "Ihre Matching-Angaben sind eingerichtet",
      reviewReadyBody: "Freuly kennt nun Ihre Leistungen, Sprachen und Ihr Arbeitsformat. Schließen Sie die Einrichtung ab, um den Anfragekanal zu aktivieren.",
      reviewNotReadyTitle: "Einige Angaben fehlen noch",
      reviewNotReadyBody: "Vervollständigen Sie die Pflichtangaben — ohne sie kann Freuly Ihr Profil nicht zuverlässig mit Kundenanfragen abgleichen.",
      finishSetup: "Einrichtung abschließen und Paket wählen",
      finishingSetup: "Einrichtung wird abgeschlossen…",
      checklistTitle: "Bereit für Anfragen"
    },
    billing: {
      kicker: "Anfragekanal",
      title: "Aktivieren Sie Ihren Kanal für Kundenanfragen",
      subtitle: "Im Kennenlernmodus können Sie Ihr Profil einrichten und das Fachkräfte-Konto kennenlernen. Für die kommerzielle Nutzung von Freuly und die Teilnahme an passenden Kundenanfragen aktivieren Sie Professional oder Growth.",
      introTitle: "Freuly ist mehr als ein Verzeichniseintrag",
      introBody: "Wir schaffen Nachfrage nach Leistungen: Freuly gewinnt Kundenanfragen und gleicht sie nach Leistung, Sprache und Arbeitsformat mit passenden Fachkräften ab. Mit einem bezahlten Paket aktivieren Sie Ihre kommerzielle Teilnahme an diesem System.",
      planPickerTitle: "Wählen Sie Ihren Zugang",
      planPickerSubtitle: "Beide bezahlten Pakete aktivieren den kommerziellen Zugang zum Anfragekanal. Growth ergänzt dies um eine professionelle Landingpage für eine stärkere Präsentation.",
      professionalHint: "Kommerzieller Zugang zum Kundenanfrage-Kanal, eigenständige Profilpflege und bis zu 5 Galerie-Fotos.",
      growthHint: "Kommerzieller Zugang zum Kundenanfrage-Kanal plus professionelle Landingpage und bis zu 15 Galerie-Fotos.",
      activateProfessional: "Professional aktivieren",
      activateGrowth: "Growth aktivieren"
    }
  }
};

export function getDemandChannelCopy(lang: string): DemandChannelCopy {
  return COPY[lang === "de" ? "de" : lang === "ua" ? "ua" : "ru"];
}
