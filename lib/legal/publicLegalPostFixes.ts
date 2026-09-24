import type { LegalPublicLang } from "@/content/legal/types";

export function applyPublicLegalPostFixes(
  slug: string,
  lang: LegalPublicLang,
  raw: string
): string {
  let result = raw;

  if (slug === "agb") {
    if (lang === "ru") {
      result = result.replace("Версия 1.0 — август 2026 г.", "Версия 1.1 — август 2026 г.");
    }
    if (lang === "ua") {
      result = result.replace("Версія 1.0 — серпень 2026", "Версія 1.1 — серпень 2026");
    }
  }

  if (slug === "datenschutz") {
    if (lang === "de") {
      result = result
        .replace(
          "Wenn ein Endkunde über Freuly eine Anfrage an einen Spezialisten stellt, verarbeiten wir insbesondere folgende Daten:",
          "Wenn ein Endkunde über Freuly eine Anfrage stellt — an einen konkret ausgewählten Spezialisten oder zur Unterstützung bei der Suche nach einem passenden Spezialisten — verarbeiten wir insbesondere folgende Daten:",
        )
        .replace(
          "- ausgewählter Spezialist",
          "- ausgewählter Spezialist, soweit ein konkretes Profil ausgewählt wurde",
        )
        .replace(
          "- sie dem ausgewählten Spezialisten zuzuordnen",
          [
            "- sie zunächst dem ausgewählten Spezialisten zuzuordnen, soweit ein konkretes Profil ausgewählt wurde",
            "- geeignete Spezialisten anhand der Anfrage zu ermitteln und ihnen bei Bedarf nur eine datensparsame Vorschau zur Relevanzprüfung bereitzustellen",
            "- die Anfrage bei Ablehnung, Nichtannahme oder Ablauf eines vorgesehenen Reaktionsfensters im erforderlichen Umfang weiterzuvermitteln",
          ].join("\n"),
        )
        .replace(
          "Der ausgewählte Spezialist erhält die für die Bearbeitung der Anfrage erforderlichen Daten und verarbeitet diese anschließend in eigener datenschutzrechtlicher Verantwortung.",
          "Vollständige Kontaktdaten des Endkunden erhält nur ein Spezialist, der nach den Plattformregeln zur Bearbeitung der konkreten Anfrage berechtigt ist. Andere geeignete Spezialisten können vor einer Freischaltung nur eine begrenzte, datensparsame Vorschau erhalten. Nach der Freischaltung verarbeitet der empfangende Spezialist die erhaltenen Daten in eigener datenschutzrechtlicher Verantwortung.",
        )
        .replace(
          "Soweit Nutzer gleichwohl freiwillig besondere Kategorien personenbezogener Daten im Nachrichtentext angeben und die Anfrage absenden, erfolgt die Verarbeitung dieser Angaben ausschließlich zur Bearbeitung und Übermittlung der Anfrage an den ausgewählten Spezialisten.",
          "Soweit Nutzer gleichwohl freiwillig besondere Kategorien personenbezogener Daten im Nachrichtentext angeben und die Anfrage absenden, erfolgt die Verarbeitung dieser Angaben ausschließlich zur Bearbeitung der Anfrage und — nur soweit für die Bearbeitung erforderlich und datenschutzrechtlich zulässig — zur Übermittlung an einen nach den Plattformregeln berechtigten Spezialisten.",
        );
    }

    if (lang === "ru") {
      result = result
        .replace(
          "Когда конечный клиент отправляет через Freuly заявку специалисту, мы обрабатываем, в частности, следующие данные:",
          "Когда конечный клиент отправляет через Freuly заявку — конкретно выбранному специалисту или для помощи в подборе подходящего специалиста — мы обрабатываем, в частности, следующие данные:",
        )
        .replace(
          "- выбранный специалист",
          "- выбранный специалист, если клиент выбрал конкретный профиль",
        )
        .replace(
          "- связать её с выбранным специалистом",
          [
            "- сначала связать её с выбранным специалистом, если клиент выбрал конкретный профиль",
            "- определить подходящих специалистов и при необходимости показать им только ограниченное превью для оценки релевантности",
            "- при отказе, непринятии заявки или истечении предусмотренного срока реакции продолжить подбор и перераспределить запрос в необходимом объёме",
          ].join("\n"),
        )
        .replace(
          "Выбранный специалист получает необходимые для обработки заявки данные и далее обрабатывает их уже как самостоятельный ответственный за обработку.",
          "Полные контактные данные клиента получает только специалист, который по правилам платформы получил право на обработку конкретной заявки. До разблокировки другим подходящим специалистам может показываться только ограниченное превью. После получения данных специалист обрабатывает их как самостоятельный ответственный за обработку.",
        )
        .replace(
          "Если пользователь всё же добровольно указывает специальные категории данных в тексте сообщения и отправляет форму, такие данные обрабатываются исключительно для обработки и передачи заявки выбранному специалисту.",
          "Если пользователь всё же добровольно указывает специальные категории данных в тексте сообщения и отправляет форму, такие данные обрабатываются исключительно для обработки заявки и — только в необходимом и допустимом с точки зрения защиты данных объёме — для передачи специалисту, который по правилам платформы получил право на её обработку.",
        );
    }

    if (lang === "ua") {
      result = result
        .replace(
          "Коли кінцевий клієнт надсилає через Freuly запит спеціалісту, ми обробляємо, зокрема, такі дані:",
          "Коли кінцевий клієнт надсилає через Freuly запит — конкретно обраному спеціалісту або для допомоги в підборі відповідного спеціаліста — ми обробляємо, зокрема, такі дані:",
        )
        .replace(
          "- обраний спеціаліст",
          "- обраний спеціаліст, якщо клієнт обрав конкретний профіль",
        )
        .replace(
          "- пов’язати його з обраним спеціалістом",
          [
            "- спочатку пов’язати його з обраним спеціалістом, якщо клієнт обрав конкретний профіль",
            "- визначити відповідних спеціалістів і за потреби показати їм лише обмежене прев’ю для оцінки релевантності",
            "- у разі відмови, неприйняття запиту або спливу передбаченого строку реакції продовжити підбір і перерозподілити запит у необхідному обсязі",
          ].join("\n"),
        )
        .replace(
          "Обраний спеціаліст отримує необхідні для обробки запиту дані та надалі обробляє їх уже як самостійний відповідальний за обробку.",
          "Повні контактні дані клієнта отримує лише спеціаліст, який за правилами платформи отримав право на обробку конкретного запиту. До розблокування іншим відповідним спеціалістам може показуватися лише обмежене прев’ю. Після отримання даних спеціаліст обробляє їх як самостійний відповідальний за обробку.",
        )
        .replace(
          "Якщо користувач усе ж добровільно зазначає спеціальні категорії даних у тексті повідомлення та надсилає форму, такі дані обробляються виключно для обробки й передавання запиту обраному спеціалісту.",
          "Якщо користувач усе ж добровільно зазначає спеціальні категорії даних у тексті повідомлення та надсилає форму, такі дані обробляються виключно для обробки запиту та — лише в необхідному й допустимому з погляду захисту даних обсязі — для передавання спеціалісту, який за правилами платформи отримав право на його обробку.",
        );
    }
  }

  return result;
}
