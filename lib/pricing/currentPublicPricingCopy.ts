import type { Lang } from "@/lib/i18n";
import { getPublicPricingCopy, type PublicPricingCopy } from "@/lib/pricing/publicPricingCopy";

const CURRENT_COPY: Record<Lang, Partial<PublicPricingCopy>> = {
  ru: {
    hero: {
      kicker: "Специалистам",
      title: "Подключите канал клиентских заявок Freuly",
      subtitle:
        "Professional подключает коммерческое участие в канале заявок. Growth добавляет расширенную Pro Page. Заполнение и профессиональная упаковка предложения доступны как отдельные услуги.",
    },
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
      subtitle:
        "Professional підключає комерційну участь у каналі запитів. Growth додає розширену Pro Page. Заповнення та професійне оформлення пропозиції доступні як окремі послуги.",
    },
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
      subtitle:
        "Professional aktiviert die kommerzielle Teilnahme am Anfragekanal. Growth ergänzt eine erweiterte Pro Page. Profilbefüllung und professionelle Angebotsaufbereitung sind separate Zusatzleistungen.",
    },
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
      a: "Да. Данные сохраняются как невидимый черновик. Пока тариф не оплачен, профиль не публикуется и не участвует в получении клиентских заявок.",
    },
    {
      q: "Когда профиль становится видимым клиентам?",
      a: "После успешной оплаты Freuly Professional или Freuly Growth и завершения автоматической публикации профиля.",
    },
    {
      q: "Что происходит, если я не активирую тариф сразу?",
      a: "Черновик остаётся сохранённым и невидимым. Вы можете вернуться к нему позже и активировать Professional или Growth, когда будете готовы.",
    },
    {
      q: "Продлевается ли тариф автоматически?",
      a: "Нет. Каждый оплаченный период завершается автоматически. Следующий месяц подключается вручную через checkout.",
    },
    {
      q: "Чем Professional отличается от Growth?",
      a: "Оба тарифа подключают коммерческое участие в канале заявок. Growth дополнительно даёт расширенную Pro Page и увеличенную галерею. Профессиональная упаковка предложения оплачивается отдельно.",
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
      a: "Так. Дані зберігаються як невидима чернетка. Поки тариф не оплачено, профіль не публікується і не бере участі в отриманні клієнтських запитів.",
    },
    {
      q: "Коли профіль стає видимим клієнтам?",
      a: "Після успішної оплати Freuly Professional або Freuly Growth та завершення автоматичної публікації профілю.",
    },
    {
      q: "Що відбувається, якщо я не активую тариф одразу?",
      a: "Чернетка залишається збереженою та невидимою. Ви можете повернутися до неї пізніше й активувати Professional або Growth, коли будете готові.",
    },
    {
      q: "Чи продовжується тариф автоматично?",
      a: "Ні. Кожен оплачений період завершується автоматично. Наступний місяць підключається вручну через checkout.",
    },
    {
      q: "Чим Professional відрізняється від Growth?",
      a: "Обидва тарифи підключають комерційну участь у каналі запитів. Growth додатково дає розширену Pro Page та збільшену галерею. Професійне оформлення пропозиції оплачується окремо.",
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
      a: "Ja. Die Daten bleiben als nicht sichtbarer Entwurf gespeichert. Solange kein Tarif bezahlt ist, wird das Profil nicht veröffentlicht und nimmt nicht am Kundenanfrage-Kanal teil.",
    },
    {
      q: "Wann wird mein Profil für Kunden sichtbar?",
      a: "Nach erfolgreicher Zahlung von Freuly Professional oder Freuly Growth und der anschließenden automatischen Veröffentlichung des Profils.",
    },
    {
      q: "Was passiert, wenn ich den Tarif nicht sofort aktiviere?",
      a: "Der Entwurf bleibt gespeichert und nicht sichtbar. Sie können später zurückkehren und Professional oder Growth aktivieren, sobald Sie bereit sind.",
    },
    {
      q: "Verlängert sich der Tarif automatisch?",
      a: "Nein. Jeder bezahlte Zeitraum endet automatisch. Der nächste Monat wird manuell im Checkout aktiviert.",
    },
    {
      q: "Was ist der Unterschied zwischen Professional und Growth?",
      a: "Beide Tarife aktivieren die kommerzielle Teilnahme am Anfragekanal. Growth ergänzt eine erweiterte Pro Page und eine größere Galerie. Die professionelle Aufbereitung des Angebots ist eine separate Zusatzleistung.",
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
