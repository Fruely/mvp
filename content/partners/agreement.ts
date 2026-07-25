import type { Lang } from "@/lib/i18n";
import { PARTNER_AGREEMENT_VERSION } from "@/lib/partners/featureFlags";

/**
 * Structural Partner Agreement draft — NOT final legal text.
 * TODO LEGAL REVIEW before production marketing claims.
 */
export type AgreementBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export function getPartnerAgreementDraft(lang: Lang): {
  version: string;
  title: string;
  disclaimer: string;
  blocks: AgreementBlock[];
} {
  const version = PARTNER_AGREEMENT_VERSION;

  if (lang === "de") {
    return {
      version,
      title: "Partnervereinbarung Freuly (Entwurf)",
      disclaimer:
        "TODO LEGAL REVIEW: Dies ist ein struktureller Entwurf und kein endgültiger Rechtsvertrag.",
      blocks: [
        {
          type: "h2",
          text: "1. Gegenstand",
        },
        {
          type: "p",
          text: "Freuly betreibt eine Plattform zur Vermittlung von Spezialisten. Partner können über eine persönliche Empfehlungslink neue Spezialisten auf die Plattform aufmerksam machen.",
        },
        {
          type: "h2",
          text: "2. Vergütung",
        },
        {
          type: "p",
          text: "Eine Vergütung entsteht nur bei einem qualifizierten Ergebnis gemäß den jeweils gültigen Partnerbedingungen (in der Regel bestätigte Erstzahlung eines neuen Spezialisten). Es besteht keine Erfolgsgarantie und kein Anspruch auf ein Mindesteinkommen.",
        },
        {
          type: "h2",
          text: "3. Pflichten des Partners",
        },
        {
          type: "ul",
          items: [
            "Wahrheitsgemäße Darstellung von Freuly",
            "Kein Spam, keine irreführende Werbung, keine Pyramidensysteme",
            "Kein Missbrauch von Tracking- oder Cookie-Mechanismen",
            "Einhaltung geltender Werbe- und Datenschutzregeln",
          ],
        },
        {
          type: "h2",
          text: "4. Auszahlungen",
        },
        {
          type: "p",
          text: "Auszahlungen erfolgen über Stripe Connect (Hosted Onboarding). Freuly speichert keine IBAN- oder KYC-Dokumente. Bis zur Freigabe von Live-Auszahlungen können Gutschriften als ausstehend geführt werden.",
        },
        {
          type: "h2",
          text: "5. Laufzeit und Beendigung",
        },
        {
          type: "p",
          text: "Freuly kann die Partnerteilnahme bei Verstößen pausieren oder beenden. Der Partner kann die Teilnahme jederzeit beenden.",
        },
      ],
    };
  }

  if (lang === "ua") {
    return {
      version,
      title: "Партнерська угода Freuly (чернетка)",
      disclaimer:
        "TODO LEGAL REVIEW: Це структурний шаблон, а не остаточний юридичний договір.",
      blocks: [
        {
          type: "h2",
          text: "1. Предмет",
        },
        {
          type: "p",
          text: "Freuly — платформа для пошуку спеціалістів. Партнер може розповідати аудиторії про Freuly за персональним referral-посиланням.",
        },
        {
          type: "h2",
          text: "2. Винагорода",
        },
        {
          type: "p",
          text: "Винагорода нараховується лише за кваліфікований результат згідно з чинними умовами (зазвичай підтверджена перша оплата нового спеціаліста). Гарантованого заробітку немає.",
        },
        {
          type: "h2",
          text: "3. Обов’язки партнера",
        },
        {
          type: "ul",
          items: [
            "Чесно описувати Freuly",
            "Не використовувати спам, оманливу рекламу чи MLM/пірамідні схеми",
            "Не підміняти attribution",
            "Дотримуватися правил реклами та захисту даних",
          ],
        },
        {
          type: "h2",
          text: "4. Виплати",
        },
        {
          type: "p",
          text: "Виплати здійснюються через Stripe Connect (hosted onboarding). Freuly не зберігає IBAN і KYC-документи. До активації live payouts нарахування можуть залишатися pending.",
        },
        {
          type: "h2",
          text: "5. Строк і припинення",
        },
        {
          type: "p",
          text: "Freuly може призупинити або завершити участь при порушеннях. Партнер може припинити участь у будь-який час.",
        },
      ],
    };
  }

  return {
    version,
    title: "Партнёрское соглашение Freuly (черновик)",
    disclaimer:
      "TODO LEGAL REVIEW: Это структурный шаблон, а не окончательный юридический договор.",
    blocks: [
      {
        type: "h2",
        text: "1. Предмет",
      },
      {
        type: "p",
        text: "Freuly — платформа для поиска специалистов. Партнёр может рассказывать аудитории о Freuly по персональной referral-ссылке.",
      },
      {
        type: "h2",
        text: "2. Вознаграждение",
      },
      {
        type: "p",
        text: "Вознаграждение начисляется только за квалифицированный результат по действующим условиям (обычно подтверждённая первая оплата нового специалиста). Гарантированного заработка нет.",
      },
      {
        type: "h2",
        text: "3. Обязанности партнёра",
      },
      {
        type: "ul",
        items: [
          "Честно описывать Freuly",
          "Не использовать спам, вводящую в заблуждение рекламу или MLM/пирамиды",
          "Не подменять attribution",
          "Соблюдать правила рекламы и защиты данных",
        ],
      },
      {
        type: "h2",
        text: "4. Выплаты",
      },
      {
        type: "p",
        text: "Выплаты выполняются через Stripe Connect (hosted onboarding). Freuly не хранит IBAN и KYC-документы. До активации live payouts начисления могут оставаться pending.",
      },
      {
        type: "h2",
        text: "5. Срок и прекращение",
      },
      {
        type: "p",
        text: "Freuly может приостановить или завершить участие при нарушениях. Партнёр может прекратить участие в любое время.",
      },
    ],
  };
}
