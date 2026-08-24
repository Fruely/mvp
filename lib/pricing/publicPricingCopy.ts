import type { Lang } from "@/lib/i18n";

export type PricingFaqItem = { q: string; a: string };

export type PublicPricingCopy = {
  hero: { kicker: string; title: string; subtitle: string };
  notice: { title: string; lead: string; points: string[] };
  professional: { name: string; price: string; description: string; features: string[] };
  growth: { name: string; price: string; badge: string; description: string; features: string[] };
  compareTitle: string;
  faqTitle: string;
  faq: PricingFaqItem[];
  disclaimer: string;
  preview: {
    professionalLabel: string;
    growthLabel: string;
  };
};

const COPY: Record<Lang, PublicPricingCopy> = {
  ru: {
    hero: {
      kicker: "Специалистам",
      title: "Подключите канал клиентских заявок Freuly",
      subtitle:
        "Professional подключает коммерческое участие в канале заявок. Growth добавляет расширенную профессиональную страницу и редакторскую упаковку.",
    },
    notice: {
      title: "Как начинается работа с Freuly",
      lead:
        "Зарегистрируйтесь и подготовьте профиль как черновик. Публичная видимость и участие в получении клиентских заявок включаются только после оплаты Professional или Growth.",
      points: [
        "До оплаты профиль сохраняется как невидимый черновик.",
        "Черновик можно редактировать и оставить на потом без обязательств.",
        "После успешной оплаты профиль публикуется и канал клиентских заявок активируется.",
        "Каждый оплаченный период завершается автоматически; следующий месяц подключается вручную через checkout.",
        "Freuly не гарантирует конкретное количество заявок, клиентов или доход.",
      ],
    },
    professional: {
      name: "Freuly Professional",
      price: "29 € / месяц",
      description:
        "Для специалиста, который хочет подключиться к каналу клиентских заявок Freuly и самостоятельно вести свой профиль.",
      features: [
        "коммерческое участие в канале клиентских заявок",
        "публичный профессиональный профиль после оплаты",
        "услуги и цены",
        "до 5 фотографий в галерее (аватар отдельно)",
        "языки, формат работы, город и радиус",
        "отображение в категориях и поиске Freuly",
        "уведомления о подходящих заявках",
        "Telegram-уведомления при подключении",
        "самостоятельное редактирование профиля",
      ],
    },
    growth: {
      name: "Freuly Growth",
      price: "59 € / месяц",
      badge: "Расширенный формат",
      description:
        "Для специалиста, которому нужен тот же канал заявок плюс расширенная профессиональная страница и редакторская упаковка предложения.",
      features: [
        "всё из Freuly Professional",
        "до 15 фотографий в галерее",
        "расширенная страница в формате mini-landing page",
        "редакторская проработка позиционирования",
        "профессиональное описание и сильный заголовок",
        "структурирование до 5 основных услуг",
        "SEO-оптимизированный текст страницы",
        "рекомендации по визуальной подаче и фото",
        "одна стартовая публикация в соцсетях Freuly",
        "один раунд согласованных правок",
      ],
    },
    compareTitle: "Сравнение тарифов",
    faqTitle: "Частые вопросы",
    faq: [
      {
        q: "Можно ли сначала заполнить профиль и решить позже?",
        a: "Да. Данные сохраняются как черновик. Пока тариф не оплачен, профиль не публикуется и не участвует в получении клиентских заявок.",
      },
      {
        q: "Когда профиль становится видимым клиентам?",
        a: "После успешной оплаты Freuly Professional или Freuly Growth и завершения автоматической публикации профиля.",
      },
      {
        q: "Есть ли бесплатный период публичного размещения?",
        a: "Нет. Бесплатно можно подготовить только невидимый черновик. Публичное размещение и коммерческое участие в канале заявок начинаются после оплаты.",
      },
      {
        q: "Продлевается ли подписка автоматически?",
        a: "Нет. Каждый оплаченный период завершается автоматически. Следующий месяц подключается вручную через checkout.",
      },
      {
        q: "Чем Professional отличается от Growth?",
        a: "Оба тарифа подключают коммерческое участие в канале заявок. Growth дополнительно даёт расширенную профессиональную страницу, редакторскую упаковку и увеличенную галерею.",
      },
      {
        q: "Гарантирует ли Freuly определённое количество клиентов или заявок?",
        a: "Нет. Freuly привлекает клиентский спрос и сопоставляет подходящие запросы со специалистами, но не гарантирует конкретное количество заявок, клиентов, заказов или доход.",
      },
    ],
    disclaimer:
      "Оплата тарифа активирует публичный профиль и коммерческое участие в канале клиентских заявок Freuly на оплаченный период. Автоматического повторного списания нет. Freuly не гарантирует конкретное количество просмотров, заявок, заказов или доход.",
    preview: {
      professionalLabel: "Посмотреть пример профиля",
      growthLabel: "Посмотреть пример Growth Page",
    },
  },
  ua: {
    hero: {
      kicker: "Спеціалістам",
      title: "Підключіть канал клієнтських запитів Freuly",
      subtitle:
        "Professional підключає комерційну участь у каналі запитів. Growth додає розширену професійну сторінку та редакторське оформлення.",
    },
    notice: {
      title: "Як починається робота з Freuly",
      lead:
        "Зареєструйтеся та підготуйте профіль як чернетку. Публічна видимість і участь в отриманні клієнтських запитів вмикаються лише після оплати Professional або Growth.",
      points: [
        "До оплати профіль зберігається як невидима чернетка.",
        "Чернетку можна редагувати та залишити на потім без зобов’язань.",
        "Після успішної оплати профіль публікується, а канал клієнтських запитів активується.",
        "Кожен оплачений період завершується автоматично; наступний місяць підключається вручну через checkout.",
        "Freuly не гарантує конкретну кількість запитів, клієнтів або доходу.",
      ],
    },
    professional: {
      name: "Freuly Professional",
      price: "29 € / місяць",
      description:
        "Для спеціаліста, який хоче підключитися до каналу клієнтських запитів Freuly та самостійно вести свій профіль.",
      features: [
        "комерційна участь у каналі клієнтських запитів",
        "публічний професійний профіль після оплати",
        "послуги та ціни",
        "до 5 фотографій у галереї (аватар окремо)",
        "мови, формат роботи, місто та радіус",
        "відображення в категоріях і пошуку Freuly",
        "сповіщення про відповідні запити",
        "Telegram-сповіщення після підключення",
        "самостійне редагування профілю",
      ],
    },
    growth: {
      name: "Freuly Growth",
      price: "59 € / місяць",
      badge: "Розширений формат",
      description:
        "Для спеціаліста, якому потрібен той самий канал запитів плюс розширена професійна сторінка та редакторське оформлення пропозиції.",
      features: [
        "усе з Freuly Professional",
        "до 15 фотографій у галереї",
        "розширена сторінка у форматі mini-landing page",
        "редакторське опрацювання позиціонування",
        "професійний опис і сильний заголовок",
        "структурування до 5 основних послуг",
        "SEO-оптимізований текст сторінки",
        "рекомендації щодо візуальної подачі та фото",
        "одна стартова публікація в соцмережах Freuly",
        "один раунд погоджених правок",
      ],
    },
    compareTitle: "Порівняння тарифів",
    faqTitle: "Поширені запитання",
    faq: [
      {
        q: "Чи можна спочатку заповнити профіль і вирішити пізніше?",
        a: "Так. Дані зберігаються як чернетка. Поки тариф не оплачено, профіль не публікується і не бере участі в отриманні клієнтських запитів.",
      },
      {
        q: "Коли профіль стає видимим клієнтам?",
        a: "Після успішної оплати Freuly Professional або Freuly Growth та завершення автоматичної публікації профілю.",
      },
      {
        q: "Чи є безкоштовний період публічного розміщення?",
        a: "Ні. Безкоштовно можна підготувати лише невидиму чернетку. Публічне розміщення і комерційна участь у каналі запитів починаються після оплати.",
      },
      {
        q: "Чи продовжується підписка автоматично?",
        a: "Ні. Кожен оплачений період завершується автоматично. Наступний місяць підключається вручну через checkout.",
      },
      {
        q: "Чим Professional відрізняється від Growth?",
        a: "Обидва тарифи підключають комерційну участь у каналі запитів. Growth додатково дає розширену професійну сторінку, редакторське оформлення та збільшену галерею.",
      },
      {
        q: "Чи гарантує Freuly певну кількість клієнтів або запитів?",
        a: "Ні. Freuly залучає клієнтський попит і зіставляє відповідні запити зі спеціалістами, але не гарантує конкретну кількість запитів, клієнтів, замовлень або доходу.",
      },
    ],
    disclaimer:
      "Оплата тарифу активує публічний профіль і комерційну участь у каналі клієнтських запитів Freuly на оплачений період. Автоматичного повторного списання немає. Freuly не гарантує конкретну кількість переглядів, запитів, замовлень або доходу.",
    preview: {
      professionalLabel: "Переглянути приклад профілю",
      growthLabel: "Переглянути приклад Growth Page",
    },
  },
  de: {
    hero: {
      kicker: "Für Spezialisten",
      title: "Aktivieren Sie Ihren Kanal für Kundenanfragen bei Freuly",
      subtitle:
        "Professional aktiviert die kommerzielle Teilnahme am Anfragekanal. Growth ergänzt eine erweiterte professionelle Seite und redaktionelle Aufbereitung.",
    },
    notice: {
      title: "So starten Sie mit Freuly",
      lead:
        "Registrieren Sie sich und bereiten Sie Ihr Profil als Entwurf vor. Öffentliche Sichtbarkeit und die Teilnahme an Kundenanfragen werden erst nach der Zahlung von Professional oder Growth aktiviert.",
      points: [
        "Vor der Zahlung bleibt das Profil ein nicht sichtbarer Entwurf.",
        "Der Entwurf kann bearbeitet und ohne Verpflichtung für später gespeichert werden.",
        "Nach erfolgreicher Zahlung wird das Profil veröffentlicht und der Kundenanfrage-Kanal aktiviert.",
        "Jeder bezahlte Zeitraum endet automatisch; der nächste Monat wird manuell im Checkout aktiviert.",
        "Freuly garantiert keine bestimmte Zahl von Anfragen, Kunden oder Umsätzen.",
      ],
    },
    professional: {
      name: "Freuly Professional",
      price: "29 € / Monat",
      description:
        "Für Spezialisten, die den Freuly-Kanal für Kundenanfragen aktivieren und ihr Profil selbst verwalten möchten.",
      features: [
        "kommerzielle Teilnahme am Kundenanfrage-Kanal",
        "öffentliches professionelles Profil nach Zahlung",
        "Leistungen und Preise",
        "bis zu 5 Galeriebilder (Avatar separat)",
        "Sprachen, Arbeitsformat, Ort und Radius",
        "Sichtbarkeit in Kategorien und Freuly-Suche",
        "Benachrichtigungen zu passenden Anfragen",
        "Telegram-Benachrichtigungen nach Verbindung",
        "eigenständige Profilbearbeitung",
      ],
    },
    growth: {
      name: "Freuly Growth",
      price: "59 € / Monat",
      badge: "Erweitertes Format",
      description:
        "Für Spezialisten, die denselben Anfragekanal plus eine erweiterte professionelle Seite und redaktionelle Aufbereitung ihres Angebots möchten.",
      features: [
        "alles aus Freuly Professional",
        "bis zu 15 Galeriebilder",
        "erweiterte Seite im Mini-Landing-Page-Format",
        "redaktionelle Positionierungsarbeit",
        "professionelle Beschreibung und starke Überschrift",
        "Strukturierung von bis zu 5 Hauptleistungen",
        "SEO-optimierter Seitentext",
        "Empfehlungen für visuelle Darstellung und Fotos",
        "eine Startveröffentlichung in Freuly-Social-Media",
        "eine abgestimmte Korrekturrunde",
      ],
    },
    compareTitle: "Tarifvergleich",
    faqTitle: "Häufige Fragen",
    faq: [
      {
        q: "Kann ich mein Profil zuerst ausfüllen und später entscheiden?",
        a: "Ja. Die Daten bleiben als Entwurf gespeichert. Solange kein Tarif bezahlt ist, wird das Profil nicht veröffentlicht und nimmt nicht am Kundenanfrage-Kanal teil.",
      },
      {
        q: "Wann wird mein Profil für Kunden sichtbar?",
        a: "Nach erfolgreicher Zahlung von Freuly Professional oder Freuly Growth und der anschließenden automatischen Veröffentlichung des Profils.",
      },
      {
        q: "Gibt es eine kostenlose Phase für die öffentliche Veröffentlichung?",
        a: "Nein. Kostenlos kann nur ein nicht sichtbarer Entwurf vorbereitet werden. Öffentliche Sichtbarkeit und kommerzielle Teilnahme am Anfragekanal beginnen nach der Zahlung.",
      },
      {
        q: "Verlängert sich das Abonnement automatisch?",
        a: "Nein. Jeder bezahlte Zeitraum endet automatisch. Der nächste Monat wird manuell im Checkout aktiviert.",
      },
      {
        q: "Was ist der Unterschied zwischen Professional und Growth?",
        a: "Beide Tarife aktivieren die kommerzielle Teilnahme am Anfragekanal. Growth ergänzt eine erweiterte professionelle Seite, redaktionelle Aufbereitung und eine größere Galerie.",
      },
      {
        q: "Garantiert Freuly eine bestimmte Anzahl von Kunden oder Anfragen?",
        a: "Nein. Freuly gewinnt Kundennachfrage und ordnet passende Anfragen Spezialisten zu, garantiert aber keine bestimmte Anzahl von Anfragen, Kunden, Aufträgen oder Umsätzen.",
      },
    ],
    disclaimer:
      "Die Tarifzahlung aktiviert das öffentliche Profil und die kommerzielle Teilnahme am Freuly-Kundenanfrage-Kanal für den bezahlten Zeitraum. Es gibt keine automatische wiederkehrende Abbuchung. Freuly garantiert keine bestimmte Anzahl von Aufrufen, Anfragen, Aufträgen oder Umsätzen.",
    preview: {
      professionalLabel: "Profilbeispiel ansehen",
      growthLabel: "Growth-Page-Beispiel ansehen",
    },
  },
};

export function getPublicPricingCopy(lang: Lang): PublicPricingCopy {
  return COPY[lang] ?? COPY.ua;
}
