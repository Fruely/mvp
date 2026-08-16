import type { LegalPublicLang } from "@/content/legal/types";

export function applyPublicLegalPostFixes(
  slug: string,
  lang: LegalPublicLang,
  raw: string
): string {
  let result = raw;

  if (slug === "agb") {
    if (lang === "de") {
      result = result.replace(
        "6. Die Zahlung für die Freischaltung einer beworbenen Anfrage ist eine **Einmalzahlung**. Sie begründet kein Abonnement, keine automatische Verlängerung und keine wiederkehrende Belastung des Zahlungsmittels.",
        "6. Die Zahlung für die Freischaltung einer beworbenen Anfrage ist eine **Einmalzahlung**. Sie begründet kein Abonnement, keine automatische Verlängerung und keine wiederkehrende Belastung des Zahlungsmittels. Nach erfolgreicher Zahlung stellt Freuly dem Spezialisten eine Rechnung bzw. einen entsprechenden Rechnungsbeleg in elektronischer Form bereit; die technische Bereitstellung kann über den eingesetzten Zahlungsdienstleister erfolgen."
      );
      result = result
        .replace("innerhalb von **7 Kalendertagen**", "innerhalb von **72 Stunden**")
        .replace("Nach Ablauf der 7 Kalendertage", "Nach Ablauf der 72 Stunden");
    }
    if (lang === "ru") {
      result = result.replace("Версия 1.0 — август 2026 г.", "Версия 1.1 — август 2026 г.");
      result = result.replace(
        "6. Оплата разблокировки продвигаемой заявки является **разовой**. Она не создаёт подписку, автоматическое продление или повторяющееся списание.",
        "6. Оплата разблокировки продвигаемой заявки является **разовой**. Она не создаёт подписку, автоматическое продление или повторяющееся списание. После успешной оплаты Freuly предоставляет специалисту счёт либо соответствующий расчётный документ в электронной форме; технически документ может предоставляться через используемого платёжного провайдера."
      );
      result = result
        .replace("в течение **7 календарных дней**", "в течение **72 часов**")
        .replace("После истечения 7 календарных дней", "После истечения 72 часов");
    }
    if (lang === "ua") {
      result = result.replace("Версія 1.0 — серпень 2026", "Версія 1.1 — серпень 2026");
      result = result.replace(
        "6. Оплата розблокування просуваного запиту є **разовою**. Вона не створює підписку, автоматичне продовження або повторюване списання.",
        "6. Оплата розблокування просуваного запиту є **разовою**. Вона не створює підписку, автоматичне продовження або повторюване списання. Після успішної оплати Freuly надає спеціалісту рахунок або відповідний розрахунковий документ в електронній формі; технічно документ може надаватися через використовуваного платіжного провайдера."
      );
      result = result
        .replace("протягом **7 календарних днів**", "протягом **72 годин**")
        .replace("Після закінчення 7 календарних днів", "Після закінчення 72 годин");
    }
  }

  if (slug === "datenschutz") {
    if (lang === "ru") {
      result = result.replace(
        "- выбранный специалист при отправке заявки",
        [
          "- специалист, которого конечный клиент выбрал при прямой адресной заявке",
          "- если это предусмотрено функцией платформы — подходящие специалисты в ограниченном объёме данных для предварительной оценки предложенной или продвигаемой заявки",
          "- специалист, который по правилам платформы получил право на обработку или разблокировал конкретную заявку, — в отношении необходимых данных заявки и контактных данных",
        ].join("\n")
      );
    }

    if (lang === "ua") {
      result = result.replace(
        "- обраний спеціаліст при надсиланні запиту",
        [
          "- спеціаліст, якого кінцевий клієнт обрав у прямому адресному запиті",
          "- якщо це передбачено функцією платформи — відповідні спеціалісти в обмеженому обсязі даних для попередньої оцінки запропонованого або просуваного запиту",
          "- спеціаліст, який за правилами платформи отримав право на обробку або розблокував конкретний запит, — щодо необхідних даних запиту та контактних даних",
        ].join("\n")
      );
    }
  }

  return result;
}
