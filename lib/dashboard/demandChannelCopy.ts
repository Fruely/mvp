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
      publishReady: "Основные параметры уже заполнены. Проверьте их и завершите настройку. Публикация не требует оплаты тарифа.",
      publishNotReady: "Заполните основные параметры, чтобы Freuly понимал, какие клиентские запросы вам подходят.",
      steps: { welcome: "Старт", basic: "Какие заявки вам подходят", about: "Почему выбирают вас", services: "Услуги и цены", photo: "Доверие", review: "Готовность" },
      reviewTitle: "Канал заявок почти готов",
      reviewBody: "Проверьте параметры. Пока профиль не опубликован, он сохранён как черновик и не виден клиентам. Публикация не требует подписки: после неё подходящие заявки можно покупать отдельно или подключить доступ в рамках тарифа.",
      reviewReadyTitle: "Параметры для подбора заявок настроены",
      reviewReadyBody: "Freuly уже понимает, какие услуги, языки и формат работы вам подходят. Подписка Professional или Growth не обязательна для участия в канале заявок — это способ получать доступ к заявкам в рамках тарифа.",
      reviewNotReadyTitle: "Нужно уточнить параметры",
      reviewNotReadyBody: "Заполните обязательные пункты — без них Freuly не сможет надёжно сопоставлять ваш профиль с клиентскими запросами.",
      finishSetup: "Перейти к тарифам",
      finishingSetup: "Переходим к тарифам…",
      draftUntilPaid: "Вы работаете без подписки. Подходящие заявки можно покупать отдельно. Подключите Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа.",
      decideLater: "Решу позже — сохранить черновик",
      checklistTitle: "Готовность к заявкам"
    },
    billing: {
      kicker: "Тарифы",
      title: "Подписка Professional или Growth",
      subtitle: "Профиль можно публиковать без подписки. Professional или Growth включают доступ к контактам заявок в рамках тарифа. Без подписки подходящие заявки можно покупать отдельно.",
      introTitle: "Два способа работать с заявками",
      introBody: "Freuly сопоставляет вас с подходящими клиентскими запросами. После публикации вы можете получать заявки без подписки: контакты открываются покупкой отдельно. Professional или Growth — подписка с доступом к заявкам в рамках тарифа, а не условие участия в канале.",
      planPickerTitle: "Выберите тариф",
      planPickerSubtitle: "Оба тарифа включают доступ к контактам подходящих заявок в рамках подписки. Growth дополнительно усиливает презентацию профессиональной страницей.",
      professionalHint: "Доступ к контактам заявок в рамках тарифа, публичный профиль, самостоятельное ведение и до 5 фото в галерее.",
      growthHint: "Доступ к контактам заявок в рамках тарифа плюс профессиональная landing page и до 15 фото в галерее.",
      activateProfessional: "Подключить Professional",
      activateGrowth: "Подключить Growth",
      draftNotice: "Пока профиль не опубликован, он не виден клиентам. Публикация не требует оплаты тарифа.",
      decideLater: "Решу позже"
    }
  },
  ua: {
    onboarding: {
      welcomeTitle: "Налаштуйте канал клієнтських заявок",
      welcomeBody: "Розкажіть, які послуги ви надаєте, де та якими мовами працюєте. Ці дані допомагають Freuly зіставляти вас із відповідними запитами клієнтів.",
      start: "Почати налаштування",
      continue: "Продовжити налаштування",
      readyCta: "Перевірити готовність",
      publishReady: "Основні параметри вже заповнені. Перевірте їх і завершіть налаштування. Публікація не потребує оплати тарифу.",
      publishNotReady: "Заповніть основні параметри, щоб Freuly розумів, які клієнтські запити вам підходять.",
      steps: { welcome: "Старт", basic: "Які заявки вам підходять", about: "Чому обирають вас", services: "Послуги та ціни", photo: "Довіра", review: "Готовність" },
      reviewTitle: "Канал заявок майже готовий",
      reviewBody: "Перевірте параметри. Поки профіль не опубліковано, він збережений як чернетка і не видимий клієнтам. Публікація не потребує підписки: після неї відповідні запити можна купувати окремо або підключити доступ у межах тарифу.",
      reviewReadyTitle: "Параметри для підбору заявок налаштовані",
      reviewReadyBody: "Freuly вже розуміє, які послуги, мови та формат роботи вам підходять. Підписка Professional або Growth не обов’язкова для участі в каналі заявок — це спосіб отримувати доступ до запитів у межах тарифу.",
      reviewNotReadyTitle: "Потрібно уточнити параметри",
      reviewNotReadyBody: "Заповніть обов’язкові пункти — без них Freuly не зможе надійно зіставляти ваш профіль із клієнтськими запитами.",
      finishSetup: "Перейти до тарифів",
      finishingSetup: "Переходимо до тарифів…",
      draftUntilPaid: "Ви працюєте без підписки. Відповідні запити можна купувати окремо. Підключіть Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу.",
      decideLater: "Вирішу пізніше — зберегти чернетку",
      checklistTitle: "Готовність до заявок"
    },
    billing: {
      kicker: "Тарифи",
      title: "Підписка Professional або Growth",
      subtitle: "Профіль можна публікувати без підписки. Professional або Growth включають доступ до контактів запитів у межах тарифу. Без підписки відповідні запити можна купувати окремо.",
      introTitle: "Два способи працювати із запитами",
      introBody: "Freuly зіставляє вас із відповідними клієнтськими запитами. Після публікації ви можете отримувати запити без підписки: контакти відкриваються покупкою окремо. Professional або Growth — підписка з доступом до запитів у межах тарифу, а не умова участі в каналі.",
      planPickerTitle: "Оберіть тариф",
      planPickerSubtitle: "Обидва тарифи включають доступ до контактів відповідних запитів у межах підписки. Growth додатково посилює презентацію професійною сторінкою.",
      professionalHint: "Доступ до контактів запитів у межах тарифу, публічний профіль, самостійне ведення та до 5 фото в галереї.",
      growthHint: "Доступ до контактів запитів у межах тарифу плюс професійна landing page та до 15 фото в галереї.",
      activateProfessional: "Підключити Professional",
      activateGrowth: "Підключити Growth",
      draftNotice: "Поки профіль не опубліковано, він не видимий клієнтам. Публікація не потребує оплати тарифу.",
      decideLater: "Вирішу пізніше"
    }
  },
  de: {
    onboarding: {
      welcomeTitle: "Richten Sie Ihren Kanal für Kundenanfragen ein",
      welcomeBody: "Teilen Sie uns mit, welche Leistungen Sie anbieten, wo und in welchen Sprachen Sie arbeiten. Diese Angaben helfen Freuly, Sie mit passenden Kundenanfragen abzugleichen.",
      start: "Einrichtung starten",
      continue: "Einrichtung fortsetzen",
      readyCta: "Bereitschaft prüfen",
      publishReady: "Die wichtigsten Angaben sind bereits vorhanden. Prüfen Sie sie und schließen Sie die Einrichtung ab. Die Veröffentlichung erfordert keine Tarifzahlung.",
      publishNotReady: "Vervollständigen Sie die wichtigsten Angaben, damit Freuly erkennen kann, welche Kundenanfragen zu Ihnen passen.",
      steps: { welcome: "Start", basic: "Passende Anfragen", about: "Warum Sie", services: "Leistungen & Preise", photo: "Vertrauen", review: "Bereitschaft" },
      reviewTitle: "Ihr Anfragekanal ist fast bereit",
      reviewBody: "Prüfen Sie Ihre Angaben. Solange das Profil nicht veröffentlicht ist, bleibt es ein Entwurf und für Kunden unsichtbar. Die Veröffentlichung erfordert kein Abo: danach können passende Anfragen einzeln gekauft oder im Rahmen des Tarifs freigeschaltet werden.",
      reviewReadyTitle: "Parameter für die Anfragezuordnung sind eingerichtet",
      reviewReadyBody: "Freuly kennt nun Ihre Leistungen, Sprachen und Ihr Arbeitsformat. Professional oder Growth sind keine Voraussetzung für die Teilnahme am Anfragekanal — so erhalten Sie Zugang zu Anfragen im Rahmen des Tarifs.",
      reviewNotReadyTitle: "Einige Angaben fehlen noch",
      reviewNotReadyBody: "Vervollständigen Sie die Pflichtangaben — ohne sie kann Freuly Ihr Profil nicht zuverlässig mit Kundenanfragen abgleichen.",
      finishSetup: "Zu den Tarifen",
      finishingSetup: "Weiter zu den Tarifen…",
      draftUntilPaid: "Sie arbeiten ohne Abo. Passende Anfragen können einzeln gekauft werden. Aktivieren Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten.",
      decideLater: "Später entscheiden — Entwurf speichern",
      checklistTitle: "Bereit für Anfragen"
    },
    billing: {
      kicker: "Tarife",
      title: "Abo Professional oder Growth",
      subtitle: "Das Profil kann ohne Abo veröffentlicht werden. Professional oder Growth enthalten den Zugang zu Kontakten von Anfragen im Rahmen des Tarifs. Ohne Abo können passende Anfragen einzeln gekauft werden.",
      introTitle: "Zwei Wege, mit Anfragen zu arbeiten",
      introBody: "Freuly ordnet Sie passenden Kundenanfragen zu. Nach der Veröffentlichung können Sie Anfragen ohne Abo erhalten: Kontakte werden durch Einzelkauf freigeschaltet. Professional oder Growth sind ein Abo mit Zugang zu Anfragen im Rahmen des Tarifs, keine Voraussetzung für die Teilnahme am Kanal.",
      planPickerTitle: "Wählen Sie Ihren Tarif",
      planPickerSubtitle: "Beide Tarife enthalten den Zugang zu Kontakten passender Anfragen im Rahmen des Abos. Growth ergänzt dies um eine professionelle Landingpage.",
      professionalHint: "Zugang zu Anfragekontakten im Rahmen des Tarifs, öffentliches Profil, eigenständige Profilpflege und bis zu 5 Galerie-Fotos.",
      growthHint: "Zugang zu Anfragekontakten im Rahmen des Tarifs plus professionelle Landingpage und bis zu 15 Galerie-Fotos.",
      activateProfessional: "Professional wählen",
      activateGrowth: "Growth wählen",
      draftNotice: "Solange das Profil nicht veröffentlicht ist, bleibt es für Kunden unsichtbar. Die Veröffentlichung erfordert keine Tarifzahlung.",
      decideLater: "Später entscheiden"
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
