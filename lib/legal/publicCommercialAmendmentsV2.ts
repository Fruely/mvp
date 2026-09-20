import type { LegalPublicLang } from "@/content/legal/types";

function replaceSection(raw: string, sectionNumber: number, nextSectionNumber: number, replacement: string) {
  const pattern = new RegExp(
    `## § ${sectionNumber}[^\\n]*\\n[\\s\\S]*?(?=\\n## § ${nextSectionNumber} )`,
  );
  return raw.replace(pattern, replacement.trim());
}

function bumpFreeEntryVersion(raw: string) {
  return raw
    .replace("Version 1.2 — August 2026", "Version 1.3 — September 2026")
    .replace("Версия 1.2 — август 2026", "Версия 1.3 — сентябрь 2026")
    .replace("Версія 1.2 — серпень 2026", "Версія 1.3 — вересень 2026");
}

const SECTION_9: Record<LegalPublicLang, string> = {
  de: `## § 9 Entwurf, Veröffentlichung, Sichtbarkeit und Anfragezugang

1. Die Registrierung und Vorbereitung von Profildaten kann zunächst als nicht öffentlicher Entwurf erfolgen. Ein Entwurf ist für Endkunden nicht öffentlich sichtbar.

2. Ein vollständig ausgefülltes Profil kann nach Maßgabe der Plattformregeln veröffentlicht werden, ohne dass hierfür Freuly Professional oder Freuly Growth abgeschlossen werden muss. Die Veröffentlichung des Basisprofils ist nicht an den Erwerb eines kostenpflichtigen Tarifs gebunden.

3. Die kostenlose Veröffentlichung eines Profils begründet keinen kostenlosen Anspruch auf die Kontaktdaten von Kundenanfragen. Freuly kann passende Anfragen zunächst mit einer datensparsamen Vorschau anzeigen. Der Zugang zu den für die Bearbeitung erforderlichen Kontakt- und Anfragedaten kann durch einen einmaligen Erwerb für die konkrete Anfrage oder durch einen Tarif erfolgen, der diesen Zugang im beschriebenen Umfang enthält.

4. Wählt ein Endkunde einen konkreten Spezialisten aus, erhält dieser nach den Plattformregeln vorrangig die Möglichkeit, die Anfrage zu bearbeiten. Nimmt er die Anfrage nicht an, lehnt er sie ab oder läuft ein vorgesehenes Reaktionsfenster ab, kann Freuly die Anfrage im erforderlichen und datenschutzrechtlich zulässigen Umfang geeigneten anderen Spezialisten anbieten oder anderweitig bei der Vermittlung unterstützen.

5. Freuly kann die öffentliche Sichtbarkeit oder die Teilnahme an der Anfrageverteilung aus sachlichem Grund einschränken, insbesondere bei unvollständigen, unzutreffenden oder gesperrten Profilen, Verstößen gegen die Plattformregeln oder dauerhaft fehlender Reaktion auf Kundenanfragen. Eine solche Maßnahme ist nicht allein an das Fehlen eines kostenpflichtigen Tarifs geknüpft.

6. Für bereits früher registrierte Spezialisten können individuelle Übergangsregelungen gelten. Daraus entsteht kein Anspruch anderer Spezialisten auf identische Bedingungen.

7. Die Deaktivierung oder Ausblendung eines Profils führt nicht automatisch zur Löschung des Kontos oder der gespeicherten Profildaten.
`,
  ru: `## § 9 Черновик, публикация, видимость и доступ к заявкам

1. Регистрация и подготовка данных профиля могут сначала выполняться в режиме непубличного черновика. Черновик не виден конечным клиентам.

2. Полностью заполненный профиль может быть опубликован по правилам платформы без обязательного подключения Freuly Professional или Freuly Growth. Публикация базового профиля не зависит от покупки платного тарифа.

3. Бесплатная публикация профиля не означает бесплатного доступа к контактным данным клиентских заявок. Freuly может сначала показывать подходящую заявку в виде ограниченного превью. Доступ к контактным данным и сведениям, необходимым для обработки заявки, может предоставляться после разовой оплаты конкретной заявки либо в рамках тарифа, который включает такой доступ в описанном объёме.

4. Если конечный клиент выбрал конкретного специалиста, этот специалист по правилам платформы получает приоритетную возможность обработать обращение. Если он не принимает заявку, отказывается от неё или истекает предусмотренный срок реакции, Freuly может в необходимом и допустимом с точки зрения защиты данных объёме предложить запрос другим подходящим специалистам либо иным образом продолжить подбор.

5. Freuly может ограничить публичную видимость или участие в распределении заявок по объективной причине, в частности при неполном или недостоверном профиле, блокировке, нарушении правил платформы либо систематическом отсутствии реакции на клиентские запросы. Такое ограничение не применяется только из-за отсутствия платного тарифа.

6. Для ранее зарегистрированных специалистов могут действовать индивидуальные переходные условия. Они не создают права других специалистов требовать аналогичных условий.

7. Деактивация или скрытие профиля не означает автоматического удаления аккаунта или сохранённых данных профиля.
`,
  ua: `## § 9 Чернетка, публікація, видимість і доступ до запитів

1. Реєстрація та підготовка даних профілю можуть спочатку виконуватися в режимі непублічної чернетки. Чернетка не видима кінцевим клієнтам.

2. Повністю заповнений профіль може бути опублікований за правилами платформи без обов’язкового підключення Freuly Professional або Freuly Growth. Публікація базового профілю не залежить від придбання платного тарифу.

3. Безкоштовна публікація профілю не означає безкоштовного доступу до контактних даних клієнтських запитів. Freuly може спочатку показувати відповідний запит у вигляді обмеженого прев’ю. Доступ до контактних даних і відомостей, необхідних для обробки запиту, може надаватися після разової оплати конкретного запиту або в межах тарифу, що включає такий доступ в описаному обсязі.

4. Якщо кінцевий клієнт обрав конкретного спеціаліста, цей спеціаліст за правилами платформи отримує пріоритетну можливість опрацювати звернення. Якщо він не приймає запит, відмовляється від нього або спливає передбачений строк реакції, Freuly може в необхідному та допустимому з погляду захисту даних обсязі запропонувати запит іншим відповідним спеціалістам або іншим чином продовжити підбір.

5. Freuly може обмежити публічну видимість або участь у розподілі запитів з об’єктивної причини, зокрема через неповний чи недостовірний профіль, блокування, порушення правил платформи або систематичну відсутність реакції на клієнтські запити. Таке обмеження не застосовується лише через відсутність платного тарифу.

6. Для раніше зареєстрованих спеціалістів можуть діяти індивідуальні перехідні умови. Вони не створюють права інших спеціалістів вимагати аналогічних умов.

7. Деактивація або приховування профілю не означає автоматичного видалення акаунта або збережених даних профілю.
`,
};

const SECTION_11: Record<LegalPublicLang, string> = {
  de: `## § 11 Tarife, Einzelzugänge, Preise und Leistungsumfang

1. Die Registrierung, Vorbereitung und Veröffentlichung eines Basisprofils kann ohne Erwerb von Freuly Professional oder Freuly Growth erfolgen.

2. Freuly kann kostenpflichtige Tarife und einmalige kostenpflichtige Anfragezugänge anbieten. Professional und Growth sind optionale Tarife; sie sind keine Voraussetzung für die Veröffentlichung des Basisprofils.

3. Ein Tarif kann insbesondere den Zugang zu Kontakten passender Kundenanfragen im bezahlten Zeitraum sowie zusätzliche Profil- und Darstellungsfunktionen enthalten. Der jeweils aktuelle Leistungsumfang, Preis und Zeitraum werden vor dem Erwerb angezeigt.

4. Ohne Tarif kann ein Spezialist, soweit für die konkrete Anfrage angeboten, einen einmaligen kostenpflichtigen Zugang zu einer bestimmten Anfrage erwerben. Preis und konkrete Wirkung werden vor der Bestellung angezeigt.

5. Ein bezahlter Tarifzeitraum wird nicht automatisch kostenpflichtig verlängert. Ein weiterer Zeitraum wird durch einen neuen manuellen Checkout erworben, sofern beim konkreten Produkt nicht ausdrücklich etwas anderes angegeben wird. Ein einmaliger Anfragezugang begründet kein Abonnement.

6. Die Zahlung vergütet ausschließlich die jeweils beschriebene Plattformleistung. Freuly garantiert weder bei einem Tarif noch bei einem Einzelzugang eine Antwort des Endkunden, einen Vertragsabschluss, eine bestimmte Anzahl von Anfragen, Kunden, Umsätzen oder sonstigen wirtschaftlichen Erfolg.

7. Weitere optionale kostenpflichtige Leistungen können gesondert angeboten werden. Preis, Dauer und Leistungsumfang werden vor dem jeweiligen Erwerb angezeigt.
`,
  ru: `## § 11 Тарифы, разовый доступ, цены и объём услуг

1. Регистрация, подготовка и публикация базового профиля могут осуществляться без покупки Freuly Professional или Freuly Growth.

2. Freuly может предлагать платные тарифы и разовый платный доступ к отдельным клиентским заявкам. Professional и Growth являются дополнительными вариантами и не являются условием публикации базового профиля.

3. Тариф может включать, в частности, доступ к контактам подходящих клиентских заявок в течение оплаченного периода, а также дополнительные функции профиля и представления специалиста. Актуальные функции, цена и срок показываются до покупки.

4. Без тарифа специалист может, если это предусмотрено для конкретной заявки, приобрести разовый платный доступ к определённому обращению. Цена и конкретный результат покупки показываются до оплаты.

5. Оплаченный период тарифа не продлевается автоматически с новым списанием. Следующий период приобретается через новый ручной checkout, если для конкретного продукта прямо не указано иное. Разовая покупка заявки не создаёт подписку.

6. Платёж относится исключительно к описанной платформенной услуге. Ни тариф, ни разовый доступ не гарантируют ответ конечного клиента, заключение договора, определённое количество заявок или клиентов, доход либо иной коммерческий результат.

7. Другие дополнительные платные функции могут предлагаться отдельно. Их цена, срок и объём показываются до соответствующей покупки.
`,
  ua: `## § 11 Тарифи, разовий доступ, ціни та обсяг послуг

1. Реєстрація, підготовка та публікація базового профілю можуть здійснюватися без придбання Freuly Professional або Freuly Growth.

2. Freuly може пропонувати платні тарифи та разовий платний доступ до окремих клієнтських запитів. Professional і Growth є додатковими варіантами та не є умовою публікації базового профілю.

3. Тариф може включати, зокрема, доступ до контактів відповідних клієнтських запитів протягом оплаченого періоду, а також додаткові функції профілю та представлення спеціаліста. Актуальні функції, ціна та строк показуються до придбання.

4. Без тарифу спеціаліст може, якщо це передбачено для конкретного запиту, придбати разовий платний доступ до певного звернення. Ціна та конкретний результат придбання показуються до оплати.

5. Оплачений період тарифу не продовжується автоматично з новим списанням. Наступний період придбавається через новий ручний checkout, якщо для конкретного продукту прямо не зазначено інше. Разова купівля запиту не створює підписку.

6. Платіж стосується виключно описаної платформної послуги. Ні тариф, ні разовий доступ не гарантують відповідь кінцевого клієнта, укладення договору, певну кількість запитів або клієнтів, дохід чи інший комерційний результат.

7. Інші додаткові платні функції можуть пропонуватися окремо. Їхня ціна, строк та обсяг показуються до відповідного придбання.
`,
};

export function applyPublicCommercialAmendmentsV2(
  slug: string,
  lang: LegalPublicLang,
  raw: string,
): string {
  if (slug !== "agb") return raw;
  let result = bumpFreeEntryVersion(raw);
  result = replaceSection(result, 9, 10, SECTION_9[lang]);
  result = replaceSection(result, 11, 12, SECTION_11[lang]);
  return result;
}
