import type { Lang } from "@/lib/i18n";
import { getPublicPricingCopy, type PublicPricingCopy } from "@/lib/pricing/publicPricingCopy";
import { ONE_OFF_REQUEST_ACCESS_LINE, SPECIALIST_FREE_ENTRY_LINE } from "@/lib/commercial/freeEntryPositioning";

const CURRENT_COPY: Record<Lang, Partial<PublicPricingCopy>> = {
  ru: {
    hero: {
      kicker: "Специалистам",
      title: "Подключите канал клиентских заявок Freuly",
      subtitle: SPECIALIST_FREE_ENTRY_LINE.ru,
    },
    notice: {
      title: "Профиль бесплатно — платите только за доступ к заявкам",
      lead: SPECIALIST_FREE_ENTRY_LINE.ru,
      points: [
        "Неполный профиль сохраняется как черновик и не виден клиентам.",
        "После публикации базовый профиль остаётся видимым без обязательной подписки.",
        ONE_OFF_REQUEST_ACCESS_LINE.ru,
        "Professional — 29 €/мес., Growth — 59 €/мес.; оба тарифа дают доступ к подходящим заявкам в рамках оплаченного периода.",
        "Автоматического повторного списания нет: следующий период подключается вручную.",
      ],
    },
    professional: {
      name: "Freuly Professional",
      price: "29 € / месяц",
      description:
        "Для специалиста, которому удобнее получать доступ к подходящим клиентским заявкам в рамках тарифа вместо отдельных покупок.",
      features: [
        "доступ к контактам подходящих заявок в рамках оплаченного периода",
        "публичный профиль (бесплатная публикация)",
        "услуги и цены",
        "до 5 фотографий в галерее (аватар отдельно)",
        "языки, формат работы, город и радиус",
        "отображение в категориях и поиске Freuly",
        "уведомления о подходящих заявках",
        "Telegram-уведомления при подключении",
        "самостоятельное редактирование профиля",
      ],
    },
    disclaimer:
      `${SPECIALIST_FREE_ENTRY_LINE.ru} ${ONE_OFF_REQUEST_ACCESS_LINE.ru} Автоматического повторного списания нет. Freuly не гарантирует конкретное количество просмотров, заявок, заказов или доход.`,
    growth: {
      name: "Freuly Growth",
      price: "59 € / месяц",
      badge: "Расширенный формат",
      description:
        "Канал клиентских заявок плюс расширенная Pro Page для специалиста, которому нужна более сильная профессиональная презентация.",
      features: [
        "всё из Freuly Professional",
        "до 15 фотографий в галерее",
        "расширенная Pro Page в формате mini-landing page",
        "дополнительные смысловые блоки страницы",
        "больше пространства для услуг, подхода и преимуществ",
        "расширенная визуальная подача",
        "самостоятельное редактирование Pro Page",
      ],
    },
  },
  ua: {
    hero: {
      kicker: "Спеціалістам",
      title: "Підключіть канал клієнтських запитів Freuly",
      subtitle: SPECIALIST_FREE_ENTRY_LINE.ua,
    },
    notice: {
      title: "Профіль безкоштовно — платіть лише за доступ до запитів",
      lead: SPECIALIST_FREE_ENTRY_LINE.ua,
      points: [
        "Неповний профіль зберігається як чернетка і не видимий клієнтам.",
        "Після публікації базовий профіль залишається видимим без обов’язкової підписки.",
        ONE_OFF_REQUEST_ACCESS_LINE.ua,
        "Professional — 29 €/міс., Growth — 59 €/міс.; обидва тарифи дають доступ до відповідних запитів у межах оплаченого періоду.",
        "Автоматичного повторного списання немає: наступний період підключається вручну.",
      ],
    },
    professional: {
      name: "Freuly Professional",
      price: "29 € / місяць",
      description:
        "Для спеціаліста, якому зручніше отримувати доступ до відповідних клієнтських запитів у межах тарифу замість окремих покупок.",
      features: [
        "доступ до контактів відповідних запитів у межах оплаченого періоду",
        "публічний профіль (безкоштовна публікація)",
        "послуги та ціни",
        "до 5 фотографій у галереї (аватар окремо)",
        "мови, формат роботи, місто та радіус",
        "відображення в категоріях і пошуку Freuly",
        "сповіщення про відповідні запити",
        "Telegram-сповіщення після підключення",
        "самостійне редагування профілю",
      ],
    },
    disclaimer:
      `${SPECIALIST_FREE_ENTRY_LINE.ua} ${ONE_OFF_REQUEST_ACCESS_LINE.ua} Автоматичного повторного списання немає. Freuly не гарантує конкретну кількість переглядів, запитів, замовлень або доходу.`,
    growth: {
      name: "Freuly Growth",
      price: "59 € / місяць",
      badge: "Розширений формат",
      description:
        "Канал клієнтських запитів плюс розширена Pro Page для спеціаліста, якому потрібна сильніша професійна презентація.",
      features: [
        "усе з Freuly Professional",
        "до 15 фотографій у галереї",
        "розширена Pro Page у форматі mini-landing page",
        "додаткові змістові блоки сторінки",
        "більше простору для послуг, підходу та переваг",
        "розширена візуальна подача",
        "самостійне редагування Pro Page",
      ],
    },
  },
  de: {
    hero: {
      kicker: "Für Spezialisten",
      title: "Aktivieren Sie Ihren Kanal für Kundenanfragen bei Freuly",
      subtitle: SPECIALIST_FREE_ENTRY_LINE.de,
    },
    notice: {
      title: "Profil kostenlos — zahlen Sie nur für Anfragezugang",
      lead: SPECIALIST_FREE_ENTRY_LINE.de,
      points: [
        "Ein unvollständiges Profil bleibt als Entwurf gespeichert und ist für Kunden nicht sichtbar.",
        "Nach der Veröffentlichung bleibt das Basisprofil ohne Pflicht-Tarif sichtbar.",
        ONE_OFF_REQUEST_ACCESS_LINE.de,
        "Professional kostet 29 €/Monat, Growth 59 €/Monat; beide Tarife geben Anfragezugang im bezahlten Zeitraum.",
        "Es gibt keine automatische wiederkehrende Abbuchung; der nächste Zeitraum wird manuell aktiviert.",
      ],
    },
    professional: {
      name: "Freuly Professional",
      price: "29 € / Monat",
      description:
        "Für Spezialisten, die passende Kundenanfragen lieber im Tarif statt über einzelne Käufe freischalten möchten.",
      features: [
        "Zugang zu Kontakten passender Anfragen im bezahlten Zeitraum",
        "öffentliches Profil (kostenlose Veröffentlichung)",
        "Leistungen und Preise",
        "bis zu 5 Galeriebilder (Avatar separat)",
        "Sprachen, Arbeitsformat, Ort und Radius",
        "Sichtbarkeit in Kategorien und Freuly-Suche",
        "Benachrichtigungen zu passenden Anfragen",
        "Telegram-Benachrichtigungen nach Verbindung",
        "eigenständige Profilbearbeitung",
      ],
    },
    disclaimer:
      `${SPECIALIST_FREE_ENTRY_LINE.de} ${ONE_OFF_REQUEST_ACCESS_LINE.de} Es gibt keine automatische wiederkehrende Abbuchung. Freuly garantiert keine bestimmte Anzahl von Aufrufen, Anfragen, Aufträgen oder Umsätzen.`,
    growth: {
      name: "Freuly Growth",
      price: "59 € / Monat",
      badge: "Erweitertes Format",
      description:
        "Kundenanfrage-Kanal plus erweiterte Pro Page für Spezialisten, die ihr Angebot professioneller präsentieren möchten.",
      features: [
        "alles aus Freuly Professional",
        "bis zu 15 Galeriebilder",
        "erweiterte Pro Page im Mini-Landing-Page-Format",
        "zusätzliche Inhaltsblöcke",
        "mehr Raum für Leistungen, Arbeitsweise und Vorteile",
        "erweiterte visuelle Präsentation",
        "eigenständige Bearbeitung der Pro Page",
      ],
    },
  },
};

const CURRENT_FAQ: Record<Lang, PublicPricingCopy["faq"]> = {
  ru: [
    {
      q: "Можно ли сначала заполнить профиль и решить позже?",
      a: "Да. Данные сохраняются как черновик, пока профиль не опубликован. Публикация не требует оплаты тарифа. После публикации подходящие заявки можно покупать отдельно.",
    },
    {
      q: "Сколько стоит открыть одну заявку без подписки?",
      a: ONE_OFF_REQUEST_ACCESS_LINE.ru,
    },
    {
      q: "Когда профиль становится видимым клиентам?",
      a: "После публикации заполненного профиля. Подписка Professional или Growth для публикации не требуется.",
    },
    {
      q: "Что происходит, если я не активирую тариф сразу?",
      a: "После публикации вы работаете без подписки: подходящие заявки можно покупать отдельно. Подключите Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа.",
    },
    {
      q: "Продлевается ли тариф автоматически?",
      a: "Нет. Каждый оплаченный период завершается автоматически. Следующий месяц подключается вручную через checkout.",
    },
    {
      q: "Чем Professional отличается от Growth?",
      a: "Оба тарифа включают доступ к контактам заявок в рамках подписки. Growth дополнительно даёт расширенную Pro Page и увеличенную галерею. Профессиональная упаковка предложения оплачивается отдельно.",
    },
    {
      q: "Может ли Freuly помочь заполнить или упаковать профиль?",
      a: "Да. Простое заполнение профиля по вашим готовым материалам стоит 30 € разово. Профессиональная упаковка продукта и предложения для Pro Page — 149 € разово. Упаковка социальных сетей оценивается отдельно.",
    },
    {
      q: "Гарантирует ли Freuly определённое количество клиентов или заявок?",
      a: "Нет. Freuly привлекает клиентский спрос и сопоставляет подходящие запросы со специалистами. Решение клиента также зависит от качества профиля, предложения, цены, фотографии, скорости ответа и других факторов, которые находятся в зоне ответственности специалиста.",
    },
  ],
  ua: [
    {
      q: "Чи можна спочатку заповнити профіль і вирішити пізніше?",
      a: "Так. Дані зберігаються як чернетка, поки профіль не опубліковано. Публікація не потребує оплати тарифу. Після публікації відповідні запити можна купувати окремо.",
    },
    {
      q: "Скільки коштує відкрити один запит без підписки?",
      a: ONE_OFF_REQUEST_ACCESS_LINE.ua,
    },
    {
      q: "Коли профіль стає видимим клієнтам?",
      a: "Після публікації заповненого профілю. Підписка Professional або Growth для публікації не потрібна.",
    },
    {
      q: "Що відбувається, якщо я не активую тариф одразу?",
      a: "Після публікації ви працюєте без підписки: відповідні запити можна купувати окремо. Підключіть Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу.",
    },
    {
      q: "Чи продовжується тариф автоматично?",
      a: "Ні. Кожен оплачений період завершується автоматично. Наступний місяць підключається вручну через checkout.",
    },
    {
      q: "Чим Professional відрізняється від Growth?",
      a: "Обидва тарифи включають доступ до контактів запитів у межах підписки. Growth додатково дає розширену Pro Page та збільшену галерею. Професійне оформлення пропозиції оплачується окремо.",
    },
    {
      q: "Чи може Freuly допомогти заповнити або професійно оформити профіль?",
      a: "Так. Просте заповнення профілю за вашими готовими матеріалами коштує 30 € одноразово. Професійне оформлення продукту та пропозиції для Pro Page — 149 € одноразово. Оформлення соціальних мереж оцінюється окремо.",
    },
    {
      q: "Чи гарантує Freuly певну кількість клієнтів або запитів?",
      a: "Ні. Freuly залучає клієнтський попит і зіставляє відповідні запити зі спеціалістами. Рішення клієнта також залежить від якості профілю, пропозиції, ціни, фотографії, швидкості відповіді та інших факторів у зоні відповідальності спеціаліста.",
    },
  ],
  de: [
    {
      q: "Kann ich mein Profil zuerst ausfüllen und später entscheiden?",
      a: "Ja. Die Daten bleiben als Entwurf gespeichert, solange das Profil nicht veröffentlicht ist. Die Veröffentlichung erfordert keine Tarifzahlung. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden.",
    },
    {
      q: "Was kostet der Einzelzugang zu einer Anfrage ohne Tarif?",
      a: ONE_OFF_REQUEST_ACCESS_LINE.de,
    },
    {
      q: "Wann wird mein Profil für Kunden sichtbar?",
      a: "Nach Veröffentlichung eines vollständigen Profils. Ein Professional- oder Growth-Abo ist dafür nicht erforderlich.",
    },
    {
      q: "Was passiert, wenn ich den Tarif nicht sofort aktiviere?",
      a: "Nach der Veröffentlichung arbeiten Sie ohne Abo: passende Anfragen können einzeln gekauft werden. Aktivieren Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten.",
    },
    {
      q: "Verlängert sich der Tarif automatisch?",
      a: "Nein. Jeder bezahlte Zeitraum endet automatisch. Der nächste Monat wird manuell im Checkout aktiviert.",
    },
    {
      q: "Was ist der Unterschied zwischen Professional und Growth?",
      a: "Beide Tarife enthalten den Zugang zu Anfragekontakten im Rahmen des Abos. Growth ergänzt eine erweiterte Pro Page und eine größere Galerie. Die professionelle Aufbereitung des Angebots ist eine separate Zusatzleistung.",
    },
    {
      q: "Kann Freuly mein Profil ausfüllen oder mein Angebot professionell aufbereiten?",
      a: "Ja. Die einfache Profilbefüllung mit Ihren fertigen Materialien kostet einmalig 30 €. Die professionelle Produkt- und Angebotsaufbereitung für die Pro Page kostet einmalig 149 €. Social-Media-Aufbereitung wird separat kalkuliert.",
    },
    {
      q: "Garantiert Freuly eine bestimmte Anzahl von Kunden oder Anfragen?",
      a: "Nein. Freuly gewinnt Kundennachfrage und ordnet passende Anfragen Spezialisten zu. Die Entscheidung des Kunden hängt zusätzlich von Profilqualität, Angebot, Preis, Foto, Reaktionsgeschwindigkeit und weiteren Faktoren im Verantwortungsbereich des Spezialisten ab.",
    },
  ],
};

export function getCurrentPublicPricingCopy(lang: Lang): PublicPricingCopy {
  const base = getPublicPricingCopy(lang);
  const current = CURRENT_COPY[lang] ?? CURRENT_COPY.ua;
  return {
    ...base,
    ...current,
    hero: current.hero ?? base.hero,
    growth: current.growth ?? base.growth,
    faq: CURRENT_FAQ[lang] ?? CURRENT_FAQ.ua,
  };
}
