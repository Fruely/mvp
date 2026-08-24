import type { LegalPublicLang } from "@/content/legal/types";

function replaceSection(raw: string, sectionNumber: number, nextSectionNumber: number, replacement: string) {
  const pattern = new RegExp(
    `## § ${sectionNumber}[^\\n]*\\n[\\s\\S]*?(?=\\n## § ${nextSectionNumber} )`
  );
  return raw.replace(pattern, replacement.trim());
}

function bumpCommercialVersion(raw: string) {
  return raw
    .replace("Version 1.1 — August 2026", "Version 1.2 — August 2026")
    .replace("Версия 1.1 — август 2026", "Версия 1.2 — август 2026")
    .replace("Версія 1.1 — серпень 2026", "Версія 1.2 — серпень 2026")
    .replace("Version 1.0 — August 2026", "Version 1.2 — August 2026")
    .replace("Версия 1.0 — август 2026", "Версия 1.2 — август 2026")
    .replace("Версія 1.0 — серпень 2026", "Версія 1.2 — серпень 2026");
}

const AGB_SECTION_9: Record<LegalPublicLang, string> = {
  de: `## § 9 Tarifstatus, Entwurf, Veröffentlichung und öffentliche Sichtbarkeit

1. Die Registrierung und Vorbereitung von Profildaten kann zunächst als nicht öffentlicher Entwurf erfolgen. Ein Entwurf ist für Endkunden nicht öffentlich sichtbar und nimmt nicht am kommerziellen Kanal für Kundenanfragen teil.

2. Für neue Spezialisten werden die öffentliche Veröffentlichung des Profils und die kommerzielle Teilnahme am Kundenanfrage-Kanal erst aktiviert, wenn ein hierfür vorgesehener kostenpflichtiger Tarif Freuly Professional oder Freuly Growth erfolgreich bezahlt wurde und die technischen Voraussetzungen für die Veröffentlichung erfüllt sind.

3. Freuly gewährt für neue Spezialisten keinen allgemein verfügbaren kostenlosen Zeitraum der öffentlichen Veröffentlichung und keine allgemein verfügbare kostenlose Testphase für die kommerzielle Nutzung des Kundenanfrage-Kanals.

4. Jeder bezahlte Tarif gilt für den im Bestellvorgang angegebenen Zeitraum. Ohne erneute manuelle Verlängerung kann die öffentliche Sichtbarkeit des Profils und die kommerzielle Teilnahme am Kundenanfrage-Kanal nach Ablauf des bezahlten Zeitraums deaktiviert werden.

5. Ein technisch vorgesehener Zeitraum zur Zahlungswiederherstellung, Webhook-Verarbeitung oder Fehlerbehebung begründet keinen Anspruch auf einen kostenlosen Tarif oder eine kostenlose Verlängerung der kommerziellen Nutzung.

6. Für Spezialisten, die bereits vor Einführung dieses Modells registriert waren, kann Freuly individuelle Übergangsregelungen anwenden. Eine solche Übergangsregelung ist kein allgemein verfügbarer Tarif und begründet keinen Anspruch anderer oder neuer Spezialisten auf dieselben Bedingungen.

7. Die Deaktivierung oder Ausblendung eines Profils führt nicht automatisch zur Löschung des Kontos oder der gespeicherten Profildaten.

8. Für eine erneute Aktivierung müssen die zu diesem Zeitpunkt geltenden Voraussetzungen für Veröffentlichung und kostenpflichtige kommerzielle Teilnahme erfüllt sein.
`,
  ru: `## § 9 Статус тарифа, черновик, публикация и публичная видимость

1. Регистрация и подготовка данных профиля могут сначала выполняться в режиме непубличного черновика. Черновик не виден конечным клиентам и не участвует в коммерческом канале клиентских заявок.

2. Для новых специалистов публичная публикация профиля и коммерческое участие в канале клиентских заявок активируются только после успешной оплаты предусмотренного для этого тарифа Freuly Professional или Freuly Growth и выполнения технических требований к публикации.

3. Freuly не предоставляет новым специалистам общедоступный бесплатный период публичной публикации и не предоставляет общедоступный бесплатный пробный период коммерческого использования канала клиентских заявок.

4. Каждый оплаченный тариф действует в течение срока, указанного при оформлении заказа. Если специалист не выполняет новое ручное продление, после окончания оплаченного периода публичная видимость профиля и коммерческое участие в канале заявок могут быть деактивированы.

5. Технический период, используемый для восстановления оплаты, обработки webhook или устранения ошибки, не создаёт права на бесплатный тариф или бесплатное продление коммерческого использования.

6. Для специалистов, зарегистрированных до введения этой модели, Freuly может применять индивидуальные переходные условия. Такой переходный режим не является общедоступным тарифом и не создаёт права для других или новых специалистов требовать аналогичные условия.

7. Деактивация или скрытие профиля не означает автоматического удаления аккаунта или сохранённых данных профиля.

8. Для повторной активации должны быть выполнены условия публикации и платного коммерческого участия, действующие на соответствующий момент.
`,
  ua: `## § 9 Статус тарифу, чернетка, публікація та публічна видимість

1. Реєстрація та підготовка даних профілю можуть спочатку виконуватися в режимі непублічної чернетки. Чернетка не видима кінцевим клієнтам і не бере участі в комерційному каналі клієнтських запитів.

2. Для нових спеціалістів публічна публікація профілю та комерційна участь у каналі клієнтських запитів активуються лише після успішної оплати передбаченого для цього тарифу Freuly Professional або Freuly Growth і виконання технічних вимог до публікації.

3. Freuly не надає новим спеціалістам загальнодоступний безкоштовний період публічної публікації та не надає загальнодоступний безкоштовний пробний період комерційного використання каналу клієнтських запитів.

4. Кожен оплачений тариф діє протягом строку, зазначеного під час оформлення замовлення. Якщо спеціаліст не виконує нове ручне продовження, після закінчення оплаченого періоду публічна видимість профілю та комерційна участь у каналі запитів можуть бути деактивовані.

5. Технічний період, що використовується для відновлення оплати, обробки webhook або усунення помилки, не створює права на безкоштовний тариф або безкоштовне продовження комерційного використання.

6. Для спеціалістів, зареєстрованих до запровадження цієї моделі, Freuly може застосовувати індивідуальні перехідні умови. Такий перехідний режим не є загальнодоступним тарифом і не створює права для інших або нових спеціалістів вимагати аналогічні умови.

7. Деактивація або приховування профілю не означає автоматичного видалення акаунта або збережених даних профілю.

8. Для повторної активації мають бути виконані умови публікації та платної комерційної участі, чинні на відповідний момент.
`,
};

const AGB_SECTION_11: Record<LegalPublicLang, string> = {
  de: `## § 11 Tarife, Preise und Leistungsumfang

1. Freuly kann kostenpflichtige Tarife und kostenpflichtige Zusatzleistungen anbieten. Die Vorbereitung eines nicht öffentlichen Entwurfs kann ohne Tarifzahlung möglich sein; daraus entsteht kein Anspruch auf öffentliche Sichtbarkeit oder kommerzielle Teilnahme am Kundenanfrage-Kanal.

2. Für die reguläre öffentliche und kommerzielle Nutzung durch neue Spezialisten sind derzeit insbesondere Freuly Professional und Freuly Growth vorgesehen. Die jeweils aktuellen Namen, Preise, Laufzeiten und enthaltenen Funktionen werden auf der Tarifseite und spätestens vor Abschluss des kostenpflichtigen Bestellvorgangs angezeigt.

3. Für den konkreten Vertrag gilt der Leistungsumfang, der vor Abschluss der Bestellung angezeigt wurde.

4. Ein bezahlter Zeitraum wird nicht automatisch kostenpflichtig verlängert. Ein weiterer Zeitraum wird durch einen neuen manuellen Checkout erworben, sofern beim konkreten Produkt nicht ausdrücklich etwas anderes angegeben wird.

5. Die Tarifzahlung vergütet die vereinbarten Plattformfunktionen und die kommerzielle Teilnahme am Freuly-System. Sie garantiert keine bestimmte Anzahl von Kundenanfragen, Kunden, Vertragsabschlüssen, Umsätzen oder sonstigen wirtschaftlichen Ergebnissen.

6. Zusätzliche kostenpflichtige Leistungen können gesondert angeboten werden. Preis, Dauer und Leistungsumfang werden vor dem jeweiligen Erwerb angezeigt.
`,
  ru: `## § 11 Тарифы, цены и объём услуг

1. Freuly может предлагать платные тарифы и дополнительные платные услуги. Подготовка непубличного черновика может быть доступна без оплаты тарифа, однако это не создаёт права на публичную видимость или коммерческое участие в канале клиентских заявок.

2. Для обычного публичного и коммерческого использования новыми специалистами в настоящее время предусмотрены, в частности, Freuly Professional и Freuly Growth. Актуальные названия, цены, сроки и включённые функции указываются на странице тарифов и не позднее завершения платного заказа.

3. Для конкретного договора действует тот объём услуг, который был показан до завершения заказа.

4. Оплаченный период не продлевается автоматически с новым списанием. Следующий период приобретается через новый ручной checkout, если для конкретного продукта прямо не указано иное.

5. Оплата тарифа является оплатой согласованных функций платформы и коммерческого участия в системе Freuly. Она не гарантирует определённое количество клиентских заявок, клиентов, заключённых договоров, дохода или иного экономического результата.

6. Дополнительные платные услуги могут предлагаться отдельно. Их цена, срок и объём показываются до соответствующей покупки.
`,
  ua: `## § 11 Тарифи, ціни та обсяг послуг

1. Freuly може пропонувати платні тарифи та додаткові платні послуги. Підготовка непублічної чернетки може бути доступна без оплати тарифу, однак це не створює права на публічну видимість або комерційну участь у каналі клієнтських запитів.

2. Для звичайного публічного та комерційного використання новими спеціалістами наразі передбачені, зокрема, Freuly Professional і Freuly Growth. Актуальні назви, ціни, строки та включені функції зазначаються на сторінці тарифів і не пізніше завершення платного замовлення.

3. Для конкретного договору діє той обсяг послуг, який був показаний до завершення замовлення.

4. Оплачений період не продовжується автоматично з новим списанням. Наступний період придбавається через новий ручний checkout, якщо для конкретного продукту прямо не зазначено інше.

5. Оплата тарифу є оплатою погоджених функцій платформи та комерційної участі в системі Freuly. Вона не гарантує певну кількість клієнтських запитів, клієнтів, укладених договорів, доходу або іншого економічного результату.

6. Додаткові платні послуги можуть пропонуватися окремо. Їхня ціна, строк та обсяг показуються до відповідної покупки.
`,
};

export function applyPublicCommercialAmendments(
  slug: string,
  lang: LegalPublicLang,
  raw: string,
): string {
  if (slug !== "agb") return raw;
  let result = raw;
  result = replaceSection(result, 9, 10, AGB_SECTION_9[lang]);
  result = replaceSection(result, 11, 12, AGB_SECTION_11[lang]);
  return bumpCommercialVersion(result);
}
