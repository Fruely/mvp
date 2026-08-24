import type { Lang } from "@/lib/i18n";
import { getPublicPricingCopy, type PublicPricingCopy } from "@/lib/pricing/publicPricingCopy";

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
      a: "Оба тарифа подключают коммерческое участие в канале заявок. Growth дополнительно даёт расширенную профессиональную страницу, редакторскую упаковку и увеличенную галерею.",
    },
    {
      q: "Гарантирует ли Freuly определённое количество клиентов или заявок?",
      a: "Нет. Freuly привлекает клиентский спрос и сопоставляет подходящие запросы со специалистами, но не гарантирует конкретное количество заявок, клиентов, заказов или доход.",
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
      a: "Обидва тарифи підключають комерційну участь у каналі запитів. Growth додатково дає розширену професійну сторінку, редакторське оформлення та збільшену галерею.",
    },
    {
      q: "Чи гарантує Freuly певну кількість клієнтів або запитів?",
      a: "Ні. Freuly залучає клієнтський попит і зіставляє відповідні запити зі спеціалістами, але не гарантує конкретну кількість запитів, клієнтів, замовлень або доходу.",
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
      a: "Beide Tarife aktivieren die kommerzielle Teilnahme am Anfragekanal. Growth ergänzt eine erweiterte professionelle Seite, redaktionelle Aufbereitung und eine größere Galerie.",
    },
    {
      q: "Garantiert Freuly eine bestimmte Anzahl von Kunden oder Anfragen?",
      a: "Nein. Freuly gewinnt Kundennachfrage und ordnet passende Anfragen Spezialisten zu, garantiert aber keine bestimmte Anzahl von Anfragen, Kunden, Aufträgen oder Umsätzen.",
    },
  ],
};

export function getCurrentPublicPricingCopy(lang: Lang): PublicPricingCopy {
  const base = getPublicPricingCopy(lang);
  return { ...base, faq: CURRENT_FAQ[lang] ?? CURRENT_FAQ.ua };
}
