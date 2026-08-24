import type { LegalPublicLang } from "@/content/legal/types";

function replaceSection(raw: string, sectionNumber: number, nextSectionNumber: number, replacement: string) {
  const pattern = new RegExp(
    `## § ${sectionNumber}[^\\n]*\\n[\\s\\S]*?(?=\\n## § ${nextSectionNumber} )`,
  );
  return raw.replace(pattern, replacement.trim());
}

const SECTION_9: Record<LegalPublicLang, string> = {
  de: `## § 9 Tarifstatus, Entwurf, Veröffentlichung und öffentliche Sichtbarkeit

1. Die Registrierung und Vorbereitung von Profildaten kann zunächst als nicht öffentlicher Entwurf erfolgen. Ein Entwurf ist für Endkunden nicht öffentlich sichtbar und nimmt nicht am kommerziellen Kanal für Kundenanfragen teil.

2. Für neue Spezialisten werden die öffentliche Veröffentlichung des Profils und die kommerzielle Teilnahme am Kundenanfrage-Kanal erst aktiviert, wenn Freuly Professional oder Freuly Growth erfolgreich bezahlt wurde und die technischen Voraussetzungen für die Veröffentlichung erfüllt sind.

3. Jeder bezahlte Tarif gilt für den im Bestellvorgang angegebenen Zeitraum. Ohne erneute manuelle Verlängerung kann die öffentliche Sichtbarkeit des Profils und die kommerzielle Teilnahme am Kundenanfrage-Kanal nach Ablauf des bezahlten Zeitraums deaktiviert werden.

4. Ein technisch vorgesehener Zeitraum zur Zahlungswiederherstellung, Webhook-Verarbeitung oder Fehlerbehebung ändert den vereinbarten Tarifstatus nicht und begründet keinen zusätzlichen kommerziellen Leistungszeitraum.

5. Für Spezialisten, die bereits vor Einführung dieses Modells registriert waren, kann Freuly individuelle Übergangsregelungen anwenden. Eine solche Übergangsregelung ist kein allgemein verfügbarer Tarif und begründet keinen Anspruch anderer oder neuer Spezialisten auf dieselben Bedingungen.

6. Die Deaktivierung oder Ausblendung eines Profils führt nicht automatisch zur Löschung des Kontos oder der gespeicherten Profildaten.

7. Für eine erneute Aktivierung müssen die zu diesem Zeitpunkt geltenden Voraussetzungen für Veröffentlichung und kostenpflichtige kommerzielle Teilnahme erfüllt sein.
`,
  ru: `## § 9 Статус тарифа, черновик, публикация и публичная видимость

1. Регистрация и подготовка данных профиля могут сначала выполняться в режиме непубличного черновика. Черновик не виден конечным клиентам и не участвует в коммерческом канале клиентских заявок.

2. Для новых специалистов публичная публикация профиля и коммерческое участие в канале клиентских заявок активируются только после успешной оплаты Freuly Professional или Freuly Growth и выполнения технических требований к публикации.

3. Каждый оплаченный тариф действует в течение срока, указанного при оформлении заказа. Если специалист не выполняет новое ручное продление, после окончания оплаченного периода публичная видимость профиля и коммерческое участие в канале заявок могут быть деактивированы.

4. Технический период, используемый для восстановления оплаты, обработки webhook или устранения ошибки, не изменяет согласованный статус тарифа и не создаёт дополнительного периода коммерческого доступа.

5. Для специалистов, зарегистрированных до введения этой модели, Freuly может применять индивидуальные переходные условия. Такой переходный режим не является общедоступным тарифом и не создаёт права для других или новых специалистов требовать аналогичные условия.

6. Деактивация или скрытие профиля не означает автоматического удаления аккаунта или сохранённых данных профиля.

7. Для повторной активации должны быть выполнены условия публикации и платного коммерческого участия, действующие на соответствующий момент.
`,
  ua: `## § 9 Статус тарифу, чернетка, публікація та публічна видимість

1. Реєстрація та підготовка даних профілю можуть спочатку виконуватися в режимі непублічної чернетки. Чернетка не видима кінцевим клієнтам і не бере участі в комерційному каналі клієнтських запитів.

2. Для нових спеціалістів публічна публікація профілю та комерційна участь у каналі клієнтських запитів активуються лише після успішної оплати Freuly Professional або Freuly Growth і виконання технічних вимог до публікації.

3. Кожен оплачений тариф діє протягом строку, зазначеного під час оформлення замовлення. Якщо спеціаліст не виконує нове ручне продовження, після закінчення оплаченого періоду публічна видимість профілю та комерційна участь у каналі запитів можуть бути деактивовані.

4. Технічний період, що використовується для відновлення оплати, обробки webhook або усунення помилки, не змінює погоджений статус тарифу й не створює додаткового періоду комерційного доступу.

5. Для спеціалістів, зареєстрованих до запровадження цієї моделі, Freuly може застосовувати індивідуальні перехідні умови. Такий перехідний режим не є загальнодоступним тарифом і не створює права для інших або нових спеціалістів вимагати аналогічні умови.

6. Деактивація або приховування профілю не означає автоматичного видалення акаунта або збережених даних профілю.

7. Для повторної активації мають бути виконані умови публікації та платної комерційної участі, чинні на відповідний момент.
`,
};

export function applyPublicCommercialAmendmentsV2(
  slug: string,
  lang: LegalPublicLang,
  raw: string,
): string {
  if (slug !== "agb") return raw;
  return replaceSection(raw, 9, 10, SECTION_9[lang]);
}
