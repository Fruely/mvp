import type { Lang } from "@/lib/i18n";

export const SPECIALIST_FREE_ENTRY_LINE: Record<Lang, string> = {
  ru: "Регистрация и публикация профиля — бесплатно. Платите только за доступ к заявкам: разово или по подписке от 29€/мес.",
  ua: "Реєстрація та публікація профілю — безкоштовно. Платіть лише за доступ до запитів: разово або за підпискою від 29 €/міс.",
  de: "Registrierung und Profilveröffentlichung sind kostenlos. Sie zahlen nur für den Zugang zu Anfragen: einzeln oder per Tarif ab 29 €/Monat.",
};

/**
 * Public starting price for direct pay-per-lead access.
 * The exact offer price remains server-authoritative and is shown before checkout.
 * Keep this in sync with the lowest currently offered professional pricing rule.
 */
export const ONE_OFF_REQUEST_ACCESS_FROM_EUR = 20;

export const ONE_OFF_REQUEST_ACCESS_LINE: Record<Lang, string> = {
  ru: "Разовый доступ к заявке — от 20 €. Точная цена конкретной заявки показывается до оплаты.",
  ua: "Разовий доступ до запиту — від 20 €. Точна ціна конкретного запиту показується до оплати.",
  de: "Einzelzugang zu einer Anfrage — ab 20 €. Der genaue Preis der konkreten Anfrage wird vor der Zahlung angezeigt.",
};
