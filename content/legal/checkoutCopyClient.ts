/**
 * Client-safe checkout disclosure strings (no fs).
 * Wording source of truth: docs/legal/final-review/checkout-copy.{de,ru,ua}.md
 */
import type { LegalPublicLang } from "./types";
import type { PaidPlanCode } from "@/lib/billing/plans";

export type CheckoutPlanCode = PaidPlanCode | "promoted_request";

const CHECKOUT_DISCLOSURE: Record<
  LegalPublicLang,
  Record<"basic" | "premium" | "promoted_request", string>
> = {
  de: {
    basic:
      "Monatliches Abonnement Freuly Pro: 29 € pro Monat (brutto, sofern Umsatzsteuer anfällt). Enthält eigenständiges Profil-Management, öffentliche Präsenz auf Freuly, Teilnahme am Kundenanfrage-Kanal und bis zu 5 Galeriebilder. Das Abonnement wird ausschließlich durch manuelle Verlängerung im Checkout fortgeführt; es erfolgt keine automatische wiederkehrende Abbuchung.",
    premium:
      "Monatliches Abonnement Freuly Pro Premium: 59 € pro Monat (brutto, sofern Umsatzsteuer anfällt). Enthält alles aus Freuly Pro sowie eine erweiterte Pro Page und bis zu 15 Galeriebilder. Manuelle Profilbefüllung oder professionelle Marketing-Aufbereitung sind nicht im Monatsabonnement enthalten und können separat beauftragt werden. Das Abonnement wird ausschließlich durch manuelle Verlängerung im Checkout fortgeführt; es erfolgt keine automatische wiederkehrende Abbuchung.",
    promoted_request:
      "Einmalige Zahlung Promoted Request: 10 € (brutto, sofern Umsatzsteuer anfällt). Ermöglicht die bevorzugte Sichtbarkeit einer konkreten Serviceanfrage für einen begrenzten Zeitraum gemäß den jeweils gültigen Produktregeln.\n\nWenn Sie nach einer erfolgreichen Promoted-Request-Zahlung innerhalb von 7 Kalendertagen erstmals ein Abonnement Freuly Pro oder Freuly Pro Premium abschließen, kann der Betrag von 10 € als Gutschrift auf die erste Abo-Zahlung angerechnet werden, sofern die technischen Voraussetzungen erfüllt sind und die Gutschrift zum Zeitpunkt des Checkouts verfügbar ist.\n\nDie Gutschrift ist einmalig, nicht übertragbar und an die konkrete Promoted-Request-Zahlung gebunden. Nach Ablauf von 7 Kalendertagen ab der Promoted-Request-Zahlung entfällt der Anspruch auf die Gutschrift.",
  },
  ru: {
    basic:
      "Ежемесячная подписка Freuly Pro: 29 € в месяц (брутто, если применяется НДС). Включает самостоятельное управление профилем, публичное присутствие на Freuly, участие в канале клиентских заявок и до 5 изображений в галерее. Подписка продлевается исключительно путём ручного продления при оформлении заказа; автоматическое повторное списание не производится.",
    premium:
      "Ежемесячная подписка Freuly Pro Premium: 59 € в месяц (брутто, если применяется НДС). Включает всё из Freuly Pro, а также расширенную Pro Page и до 15 изображений в галерее. Ручное заполнение профиля и профессиональная маркетинговая упаковка не входят в ежемесячную подписку и могут быть заказаны отдельно. Подписка продлевается исключительно путём ручного продления при оформлении заказа; автоматическое повторное списание не производится.",
    promoted_request:
      "Разовый доступ к конкретной заявке клиента: 20 € (брутто, если применяется НДС). После завершения регистрации специалиста оплата открывает доступ к этой конкретной заявке. Это разовая покупка без подписки и без автоматических последующих списаний. Альтернатива — Freuly Professional от 29 € / месяц; стоимость разовой заявки не засчитывается в последующую оплату тарифа.",
  },
  ua: {
    basic:
      "Щомісячна підписка Freuly Pro: 29 € на місяць (брутто, якщо застосовується ПДВ). Містить самостійне керування профілем, публічну присутність на Freuly, участь у каналі клієнтських запитів і до 5 зображень у галереї. Підписка продовжується виключно шляхом ручного продовження під час оформлення замовлення; автоматичне повторне списання не здійснюється.",
    premium:
      "Щомісячна підписка Freuly Pro Premium: 59 € на місяць (брутто, якщо застосовується ПДВ). Містить усе з Freuly Pro, а також розширену Pro Page і до 15 зображень у галереї. Ручне заповнення профілю та професійне маркетингове оформлення не входять до щомісячної підписки й можуть бути замовлені окремо. Підписка продовжується виключно шляхом ручного продовження під час оформлення замовлення; автоматичне повторне списання не здійснюється.",
    promoted_request:
      "Разовий доступ до конкретної заявки клієнта: 20 € (брутто, якщо застосовується ПДВ). Після завершення реєстрації спеціаліста оплата відкриває доступ до цієї конкретної заявки. Це разова покупка без підписки та без автоматичних наступних списань. Альтернатива — Freuly Professional від 29 € / місяць; вартість разової заявки не зараховується в подальшу оплату тарифу.",
  },
};

export function getCheckoutDisclosureText(
  lang: LegalPublicLang,
  planCode: CheckoutPlanCode
): string {
  const key =
    planCode === "promoted_request"
      ? "promoted_request"
      : planCode === "basic" || planCode === "premium"
        ? planCode
        : "basic";
  return CHECKOUT_DISCLOSURE[lang][key];
}
