import type { LegalPublicLang } from "@/content/legal/types";

function replaceSection(raw: string, sectionNumber: number, nextSectionNumber: number, replacement: string) {
  const pattern = new RegExp(
    `## § ${sectionNumber}[^\\n]*\\n[\\s\\S]*?(?=\\n## § ${nextSectionNumber} )`
  );
  return raw.replace(pattern, replacement.trim());
}

function bumpVersion(raw: string) {
  return raw
    .replace("Version 1.0 — August 2026", "Version 1.1 — August 2026")
    .replace("Версия 1.0 — август 2026", "Версия 1.1 — август 2026")
    .replace("Версія 1.0 — серпень 2026", "Версія 1.1 — серпень 2026");
}

const AGB_SECTION_14: Record<LegalPublicLang, string> = {
  de: `## § 14 Kostenpflichtige Zusatzleistungen, beworbene Anfragen und hervorgehobene Sichtbarkeit

1. Freuly kann optionale kostenpflichtige Zusatzleistungen anbieten. Dazu können insbesondere hervorgehobene Sichtbarkeit sowie die kostenpflichtige Freischaltung einer konkreten Kundenanfrage („beworbene Anfrage“) gehören.

2. Bezeichnung, Preis, Dauer, einmaliger oder wiederkehrender Charakter und konkrete Wirkung einer kostenpflichtigen Zusatzleistung werden vor Abschluss der Bestellung angezeigt.

3. Bei einer beworbenen Anfrage kann der Spezialist einen einmaligen kostenpflichtigen Zugang zur Bearbeitung einer konkreten Anfrage erwerben. Der Preis beträgt derzeit **10,00 € je Freischaltung**, sofern im konkreten Bestellvorgang kein anderer Preis ausdrücklich angezeigt wird.

4. Der Vertrag über diese Zusatzleistung kommt mit erfolgreichem Abschluss des Zahlungsvorgangs und der anschließenden Freischaltung der betreffenden Anfrage durch Freuly zustande.

5. Gegenstand der kostenpflichtigen Leistung ist die Freischaltung der konkreten Anfrage zur Bearbeitung einschließlich der Bereitstellung der hierfür erforderlichen Anfragedaten und – soweit für die Bearbeitung erforderlich und datenschutzrechtlich zulässig – der Kontaktdaten des anfragenden Endkunden. Freuly verkauft weder den Endkunden noch personenbezogene Daten als eigenständiges Wirtschaftsgut.

6. Die Zahlung für die Freischaltung einer beworbenen Anfrage ist eine **Einmalzahlung**. Sie begründet kein Abonnement, keine automatische Verlängerung und keine wiederkehrende Belastung des Zahlungsmittels.

7. Die Zahlung betrifft ausschließlich die Plattformleistung von Freuly. Ein Vertrag über die eigentliche Dienstleistung kommt ausschließlich zwischen Spezialist und Endkunde zustande.

8. Die Freischaltung einer Anfrage oder eine sonstige kostenpflichtige Zusatzleistung begründet insbesondere keinen Anspruch auf:

- einen Vertragsabschluss mit einem Endkunden;
- eine Antwort des Endkunden;
- eine bestimmte Anzahl von Kunden oder weiteren Anfragen;
- einen bestimmten Umsatz oder sonstigen wirtschaftlichen Erfolg;
- dauerhafte bevorzugte Sichtbarkeit;
- eine bestimmte organische Position außerhalb des beschriebenen Leistungsumfangs.

9. Nach erfolgreicher Zahlung von **10,00 €** für eine qualifizierte beworbene Anfrage kann eine einmalige Gutschrift in Höhe von **10,00 €** auf den ersten anschließenden Erwerb von Freuly Professional oder Freuly Growth gewährt werden.

10. Die Gutschrift kann nur innerhalb von **7 Kalendertagen** ab dem Zeitpunkt der erfolgreichen Zahlung für die beworbene Anfrage genutzt werden. Wird der erste qualifizierte Tariferwerb innerhalb dieses Zeitraums abgeschlossen, wird die Gutschrift im Bestellvorgang als Preisnachlass berücksichtigt, sofern die dort angezeigten technischen und vertraglichen Voraussetzungen erfüllt sind.

11. Nach Ablauf der 7 Kalendertage verfällt die Tarifgutschrift. Der bereits erworbene Zugang zur beworbenen Anfrage bleibt hiervon unberührt.

12. Die Gutschrift ist einmalig, nicht übertragbar, nicht in bar auszahlbar und an die zugrunde liegende Zahlung für die konkrete beworbene Anfrage gebunden.

13. Im Falle einer vollständigen Rückerstattung oder wirksamen Rückabwicklung der Zahlung für die beworbene Anfrage entfällt eine noch nicht verbrauchte Gutschrift. Soweit eine Gutschrift bereits verwendet wurde, gelten die gesetzlichen und im konkreten Bestellvorgang ausgewiesenen Abrechnungsregeln.

14. Soweit eine Anfrage wegen eines technischen Fehlers von Freuly trotz erfolgreicher Zahlung nicht freigeschaltet werden kann, bleiben die gesetzlichen Rechte des Spezialisten unberührt.
`,
  ru: `## § 14 Платные дополнительные услуги, продвигаемые заявки и повышенная видимость

1. Freuly может предлагать дополнительные платные функции. К ним могут относиться, в частности, повышенная видимость и платная разблокировка конкретной клиентской заявки («продвигаемая заявка»).

2. Название, цена, продолжительность, разовый или повторяющийся характер оплаты и конкретный эффект платной услуги показываются до завершения заказа.

3. Для продвигаемой заявки специалист может приобрести разовый платный доступ к обработке конкретной заявки. Текущая цена составляет **10,00 € за одну разблокировку**, если в конкретном процессе оформления прямо не указана иная цена.

4. Договор на эту дополнительную услугу считается заключённым после успешного завершения оплаты и последующей разблокировки соответствующей заявки Freuly.

5. Предметом платной услуги является разблокировка конкретной заявки для её обработки, включая предоставление необходимых данных заявки и — если это необходимо для обработки и допустимо законодательством о защите данных — контактных данных обратившегося конечного клиента. Freuly не продаёт клиента и не продаёт персональные данные как самостоятельный товар.

6. Оплата разблокировки продвигаемой заявки является **разовой**. Она не создаёт подписку, автоматическое продление или повторяющееся списание.

7. Платёж относится исключительно к платформенной услуге Freuly. Договор на фактическую услугу заключается исключительно между специалистом и конечным клиентом.

8. Разблокировка заявки или иная платная дополнительная услуга не гарантирует:

- заключение договора с конечным клиентом;
- ответ конечного клиента;
- определённое количество клиентов или последующих заявок;
- определённый доход или иной экономический результат;
- постоянную повышенную видимость;
- определённую органическую позицию вне описанного объёма услуги.

9. После успешной оплаты **10,00 €** за квалифицируемую продвигаемую заявку может предоставляться одноразовый зачёт **10,00 €** в счёт первой последующей покупки Freuly Professional или Freuly Growth.

10. Зачёт может быть использован только в течение **7 календарных дней** с момента успешной оплаты продвигаемой заявки. Если первая подходящая покупка тарифа завершается в этот срок, зачёт учитывается при оформлении как скидка при условии выполнения показанных там технических и договорных условий.

11. После истечения 7 календарных дней право на тарифный зачёт прекращается. Уже приобретённый доступ к продвигаемой заявке сохраняется.

12. Зачёт является одноразовым, не передаётся другому лицу, не выплачивается наличными и связан с конкретным платежом за соответствующую продвигаемую заявку.

13. При полном возврате или действительной отмене платежа за продвигаемую заявку неиспользованный зачёт прекращается. Если зачёт уже использован, применяются законные правила и условия расчётов, показанные при соответствующем заказе.

14. Если из-за технической ошибки Freuly заявка не может быть разблокирована после успешной оплаты, законные права специалиста сохраняются.
`,
  ua: `## § 14 Платні додаткові послуги, просувані запити та підвищена видимість

1. Freuly може пропонувати додаткові платні функції. До них можуть належати, зокрема, підвищена видимість і платне розблокування конкретного клієнтського запиту («просуваний запит»).

2. Назва, ціна, тривалість, разовий або повторюваний характер оплати та конкретний ефект платної послуги показуються до завершення замовлення.

3. Для просуваного запиту спеціаліст може придбати разовий платний доступ до обробки конкретного запиту. Поточна ціна становить **10,00 € за одне розблокування**, якщо в конкретному процесі оформлення прямо не вказано іншу ціну.

4. Договір щодо цієї додаткової послуги вважається укладеним після успішного завершення оплати та подальшого розблокування відповідного запиту Freuly.

5. Предметом платної послуги є розблокування конкретного запиту для його обробки, включно з наданням необхідних даних запиту та — якщо це необхідно для обробки й допустимо законодавством про захист даних — контактних даних кінцевого клієнта, який звернувся. Freuly не продає клієнта і не продає персональні дані як самостійний товар.

6. Оплата розблокування просуваного запиту є **разовою**. Вона не створює підписку, автоматичне продовження або повторюване списання.

7. Платіж стосується виключно платформної послуги Freuly. Договір щодо фактичної послуги укладається виключно між спеціалістом і кінцевим клієнтом.

8. Розблокування запиту або інша платна додаткова послуга не гарантує:

- укладення договору з кінцевим клієнтом;
- відповідь кінцевого клієнта;
- певну кількість клієнтів або наступних запитів;
- певний дохід або інший економічний результат;
- постійну підвищену видимість;
- певну органічну позицію поза описаним обсягом послуги.

9. Після успішної оплати **10,00 €** за кваліфікований просуваний запит може надаватися одноразове зарахування **10,00 €** у рахунок першої наступної покупки Freuly Professional або Freuly Growth.

10. Зарахування може бути використане лише протягом **7 календарних днів** з моменту успішної оплати просуваного запиту. Якщо перша відповідна покупка тарифу завершується в цей строк, зарахування враховується під час оформлення як знижка за умови виконання показаних там технічних і договірних умов.

11. Після закінчення 7 календарних днів право на тарифне зарахування припиняється. Уже придбаний доступ до просуваного запиту зберігається.

12. Зарахування є одноразовим, не передається іншій особі, не виплачується готівкою та пов’язане з конкретним платежем за відповідний просуваний запит.

13. У разі повного повернення або чинного скасування платежу за просуваний запит невикористане зарахування припиняється. Якщо зарахування вже використано, застосовуються законні правила та умови розрахунків, показані під час відповідного замовлення.

14. Якщо через технічну помилку Freuly запит не може бути розблокований після успішної оплати, законні права спеціаліста зберігаються.
`,
};

const PRIVACY_SECTION_6: Record<LegalPublicLang, string> = {
  de: `## § 6 Anfragen von Endkunden / Leads

Wenn ein Endkunde über Freuly eine Anfrage übermittelt, verarbeiten wir insbesondere folgende Daten:

- Name
- E-Mail-Adresse
- Telefonnummer
- Nachricht / Mitteilungstext
- ausgewählter Spezialist oder für die Anfrage relevante Kategorie bzw. Zuordnungsmerkmale
- Zeitpunkt der Anfrage
- Status der Anfrage
- weitere technisch mit der Anfrage verbundene Informationen

Diese Daten werden insbesondere verarbeitet, um:

- die Anfrage entgegenzunehmen und im System zu speichern
- die Anfrage dem ausgewählten Spezialisten zuzuordnen oder – soweit der Endkunde keinen einzelnen Spezialisten abschließend ausgewählt hat bzw. die Plattformfunktion dies vorsieht – geeigneten Spezialisten anhand der für die Anfrage relevanten Kriterien zuzuordnen bzw. anzubieten
- die Anfrage im Admin- und Spezialistenbereich bereitzustellen
- geeignete Spezialisten über eine neue oder verfügbare Anfrage zu benachrichtigen
- die Bearbeitung, Freischaltung und Nachverfolgung der Anfrage innerhalb der Plattform zu ermöglichen
- Missbrauch zu verhindern und die Plattform ordnungsgemäß zu betreiben

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Durchführung vorvertraglicher Maßnahmen auf Anfrage der betroffenen Person erfolgt. Ergänzend kann Art. 6 Abs. 1 lit. f DSGVO für den sicheren Betrieb, die technische Zuordnung, Missbrauchsprävention und Nachverfolgung der Anfrage einschlägig sein.

Freuly speichert die Anfrage nicht nur zur Weiterleitung, sondern auch zur internen Bearbeitung, Zuordnung und Nachverfolgung.

Soweit eine Anfrage zunächst mehreren geeigneten Spezialisten angeboten oder als beworbene Anfrage bereitgestellt wird, erhalten diese Spezialisten vor einer Freischaltung nur die Informationen, die für die Prüfung der fachlichen bzw. organisatorischen Eignung und die Entscheidung über die Bearbeitung erforderlich sind. Vollständige Kontaktdaten des Endkunden werden nur dem Spezialisten bereitgestellt, der nach den jeweiligen Plattformregeln zur Bearbeitung der konkreten Anfrage berechtigt bzw. freigeschaltet ist, soweit dies für die Bearbeitung erforderlich und datenschutzrechtlich zulässig ist.

Der Spezialist verarbeitet die ihm nach einer solchen Zuordnung oder Freischaltung bereitgestellten Kundendaten anschließend in eigener datenschutzrechtlicher Verantwortung.

### Besondere Kategorien personenbezogener Daten

Freuly ist nicht darauf ausgelegt, über das Anfrageformular strukturiert Gesundheitsdaten oder andere besondere Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO zu erheben.

Da Nutzer im freien Nachrichtentext freiwillig sensible Angaben machen können, bitten wir darum, keine unnötigen sensiblen Daten zu übermitteln.

Soweit Nutzer gleichwohl freiwillig besondere Kategorien personenbezogener Daten im Nachrichtentext angeben und die Anfrage absenden, erfolgt die Verarbeitung dieser Angaben ausschließlich zur Bearbeitung, Zuordnung und – soweit erforderlich – Übermittlung der Anfrage an den zur Bearbeitung berechtigten Spezialisten. Rechtsgrundlage ist insoweit zusätzlich Art. 9 Abs. 2 lit. a DSGVO.
`,
  ru: `## § 6 Заявки конечных клиентов / лиды

Когда конечный клиент отправляет заявку через Freuly, мы обрабатываем, в частности, следующие данные:

- имя
- адрес электронной почты
- номер телефона
- текст сообщения
- выбранный специалист либо категория / признаки, относящиеся к заявке
- время отправки заявки
- статус заявки
- иные технические сведения, связанные с заявкой

Эти данные обрабатываются, в частности, для того, чтобы:

- принять заявку и сохранить её в системе
- связать её с выбранным специалистом либо — если клиент окончательно не выбрал одного специалиста или это предусмотрено функцией платформы — подобрать и/или предложить заявку подходящим специалистам по относящимся к заявке критериям
- отобразить заявку в админке и кабинете специалиста
- уведомить подходящих специалистов о новой или доступной заявке
- обеспечить обработку, разблокировку и отслеживание заявки внутри платформы
- предотвращать злоупотребления и обеспечивать нормальную работу платформы

Правовым основанием является ст. 6 абз. 1 лит. b DSGVO, если обработка необходима для преддоговорных мер по запросу субъекта данных. Дополнительно ст. 6 абз. 1 лит. f DSGVO может применяться для безопасной работы платформы, технического распределения заявок, предотвращения злоупотреблений и отслеживания их обработки.

Freuly хранит заявку не только для пересылки, но и для внутренней обработки, распределения и отслеживания.

Если заявка сначала предлагается нескольким подходящим специалистам или предоставляется как продвигаемая заявка, до разблокировки таким специалистам показывается только та информация, которая необходима для оценки профессиональной или организационной применимости заявки и решения о её обработке. Полные контактные данные конечного клиента предоставляются только тому специалисту, который по правилам платформы получил право на обработку либо разблокировал конкретную заявку, если это необходимо для обработки и допустимо законодательством о защите данных.

После такого распределения или разблокировки специалист самостоятельно несёт ответственность за дальнейшую обработку полученных персональных данных клиента.

### Специальные категории персональных данных

Freuly не предназначен для структурированного сбора через форму заявки медицинских данных или иных специальных категорий персональных данных в смысле ст. 9 DSGVO.

Поскольку пользователь может добровольно указать чувствительные сведения в свободном тексте, мы просим не передавать ненужные чувствительные данные.

Если пользователь всё же добровольно указывает специальные категории данных в тексте сообщения и отправляет заявку, такие данные обрабатываются исключительно для обработки, распределения и — при необходимости — передачи заявки специалисту, имеющему право её обрабатывать. Дополнительным правовым основанием в этой части является ст. 9 абз. 2 лит. a DSGVO.
`,
  ua: `## § 6 Запити кінцевих клієнтів / ліди

Коли кінцевий клієнт надсилає запит через Freuly, ми обробляємо, зокрема, такі дані:

- ім’я
- адреса електронної пошти
- номер телефону
- текст повідомлення
- обраний спеціаліст або категорія / ознаки, що стосуються запиту
- час надсилання запиту
- статус запиту
- інші технічні відомості, пов’язані із запитом

Ці дані обробляються, зокрема, щоб:

- прийняти запит і зберегти його в системі
- пов’язати його з обраним спеціалістом або — якщо клієнт остаточно не обрав одного спеціаліста чи це передбачено функцією платформи — підібрати та/або запропонувати запит відповідним спеціалістам за критеріями, що стосуються запиту
- відобразити запит в адмінці та кабінеті спеціаліста
- повідомити відповідних спеціалістів про новий або доступний запит
- забезпечити обробку, розблокування та відстеження запиту всередині платформи
- запобігати зловживанням і забезпечувати належну роботу платформи

Правовою підставою є ст. 6 абз. 1 літ. b DSGVO, якщо обробка необхідна для переддоговірних заходів на запит суб’єкта даних. Додатково ст. 6 абз. 1 літ. f DSGVO може застосовуватися для безпечної роботи платформи, технічного розподілу запитів, запобігання зловживанням і відстеження їх обробки.

Freuly зберігає запит не лише для пересилання, а й для внутрішньої обробки, розподілу та відстеження.

Якщо запит спочатку пропонується кільком відповідним спеціалістам або надається як просуваний запит, до розблокування таким спеціалістам показується лише та інформація, яка необхідна для оцінки професійної або організаційної відповідності запиту та рішення щодо його обробки. Повні контактні дані кінцевого клієнта надаються лише тому спеціалісту, який за правилами платформи отримав право на обробку або розблокував конкретний запит, якщо це необхідно для обробки й допустимо законодавством про захист даних.

Після такого розподілу або розблокування спеціаліст самостійно несе відповідальність за подальшу обробку отриманих персональних даних клієнта.

### Спеціальні категорії персональних даних

Freuly не призначений для структурованого збору через форму запиту медичних даних або інших спеціальних категорій персональних даних у розумінні ст. 9 DSGVO.

Оскільки користувач може добровільно вказати чутливі відомості у вільному тексті, ми просимо не передавати зайві чутливі дані.

Якщо користувач усе ж добровільно вказує спеціальні категорії даних у тексті повідомлення та надсилає запит, такі дані обробляються виключно для обробки, розподілу та — за необхідності — передачі запиту спеціалісту, який має право його обробляти. Додатковою правовою підставою в цій частині є ст. 9 абз. 2 літ. a DSGVO.
`,
};

const PRIVACY_RECIPIENTS: Record<LegalPublicLang, string[]> = {
  de: [
    "- der vom Endkunden ausgewählte Spezialist bei einer direkt adressierten Anfrage",
    "- soweit die Plattformfunktion dies vorsieht, geeignete Spezialisten in beschränktem Umfang zur Prüfung einer angebotenen bzw. beworbenen Anfrage",
    "- der nach den Plattformregeln zur Bearbeitung einer konkreten Anfrage berechtigte bzw. freigeschaltete Spezialist hinsichtlich der für die Bearbeitung erforderlichen Anfrage- und Kontaktdaten",
  ],
  ru: [
    "- специалист, которого конечный клиент выбрал при прямой адресной заявке",
    "- если это предусмотрено функцией платформы — подходящие специалисты в ограниченном объёме данных для предварительной оценки предложенной или продвигаемой заявки",
    "- специалист, который по правилам платформы получил право на обработку или разблокировал конкретную заявку, — в отношении необходимых данных заявки и контактных данных",
  ],
  ua: [
    "- спеціаліст, якого кінцевий клієнт обрав у прямому адресному запиті",
    "- якщо це передбачено функцією платформи — відповідні спеціалісти в обмеженому обсязі даних для попередньої оцінки запропонованого або просуваного запиту",
    "- спеціаліст, який за правилами платформи отримав право на обробку або розблокував конкретний запит, — щодо необхідних даних запиту та контактних даних",
  ],
};

function amendAgb(raw: string, lang: LegalPublicLang) {
  return bumpVersion(replaceSection(raw, 14, 15, AGB_SECTION_14[lang]));
}

function amendPrivacy(raw: string, lang: LegalPublicLang) {
  let result = bumpVersion(replaceSection(raw, 6, 7, PRIVACY_SECTION_6[lang]));

  const selectedSpecialistLine = {
    de: /- der jeweils ausgewählte Spezialist bei einer Anfrage/,
    ru: /- выбранный специалист при запросе/,
    ua: /- обраний спеціаліст при запиті/,
  }[lang];

  result = result.replace(selectedSpecialistLine, PRIVACY_RECIPIENTS[lang].join("\n"));
  return result;
}

export function applyPublicLegalAmendments(
  slug: string,
  lang: LegalPublicLang,
  raw: string
): string {
  if (slug === "agb") return amendAgb(raw, lang);
  if (slug === "datenschutz") return amendPrivacy(raw, lang);
  return raw;
}
