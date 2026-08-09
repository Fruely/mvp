import { OPERATOR } from "../lib/render.mjs";
import { p, h2 } from "./_helpers.mjs";

/** @type {import("../lib/render.mjs").default} */
export const AGB_BLOCKS = [
  {
    type: "title",
    de: "# Allgemeine Geschäftsbedingungen für Spezialisten (AGB)",
    ru: "# Общие условия для специалистов (AGB)",
    ua: "# Загальні умови для спеціалістів (AGB)",
  },
  p(
    "agb-meta-01",
    "Version 1.0 — August 2026. Anbieter: " + OPERATOR.de,
    "Версия 1.0 — август 2026 г. Поставщик: " + OPERATOR.ru,
    "Версія 1.0 — серпень 2026 р. Постачальник: " + OPERATOR.ua
  ),
  p(
    "agb-meta-02",
    "Maßgebliche Sprachfassung ist Deutsch. Übersetzungen dienen der Orientierung.",
    "Юридически определяющей является немецкая версия. Переводы предоставлены для удобства.",
    "Юридично визначальною є німецька версія. Переклади надано для зручності."
  ),

  h2("§ 1 Geltungsbereich und Vertragspartner", "§ 1 Сфера действия и стороны договора", "§ 1 Сфера дії та сторони договору"),
  p(
    "agb-01-01",
    "Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform Freuly durch Spezialistinnen und Spezialisten (nachfolgend „Spezialist“). Vertragspartner ist " + OPERATOR.de,
    "Настоящие общие условия (AGB) регулируют использование платформы Freuly специалистами (далее «специалист»). Договорная сторона: " + OPERATOR.ru,
    "Ці загальні умови (AGB) регулюють використання платформи Freuly спеціалістами (далі «спеціаліст»). Договірна сторона: " + OPERATOR.ua
  ),
  p(
    "agb-01-02",
    "Freuly ist eine B2B-Plattform zur Veröffentlichung von Spezialistenprofilen und zur Vermittlung von Kontaktanfragen. Freuly ist weder Arbeitgeber noch Vermittler von Arbeitsverträgen zwischen Spezialist und Endkunden.",
    "Freuly — B2B-платформа для публикации профилей специалистов и передачи контактных запросов. Freuly не является работодателем и не выступает посредником в трудовых договорах между специалистом и конечными клиентами.",
    "Freuly — B2B-платформа для публікації профілів спеціалістів і передачі контактних запитів. Freuly не є роботодавцем і не виступає посередником у трудових договорах між спеціалістом і кінцевими клієнтами."
  ),

  h2("§ 2 Vertragsschluss", "§ 2 Заключение договора", "§ 2 Укладення договору"),
  p(
    "agb-02-01",
    "Der Vertrag kommt durch Registrierung, Annahme dieser AGB und ggf. Abschluss eines kostenpflichtigen Abonnements zustande. Freuly kann Registrierungen und Profile vor Veröffentlichung prüfen.",
    "Договор заключается путём регистрации, принятия настоящих AGB и, при необходимости, оформления платной подписки. Freuly может проверять регистрации и профили до публикации.",
    "Договір укладається шляхом реєстрації, прийняття цих AGB і, за потреби, оформлення платної підписки. Freuly може перевіряти реєстрації та профілі до публікації."
  ),
  p(
    "agb-02-02",
    "Mit Abschluss eines kostenpflichtigen Tarifs im Checkout schließen Sie ein entgeltliches Abonnement bzw. einen entgeltlichen Zusatzdienst ab. Preise und Leistungsumfang werden vor Vertragsschluss im Checkout ausgewiesen.",
    "При оформлении платного тарифа в checkout вы заключаете платную подписку или платную дополнительную услугу. Цены и объём услуг указываются до заключения договора при оформлении заказа.",
    "Під час оформлення платного тарифу в checkout ви укладаєте платну підписку або платну додаткову послугу. Ціни та обсяг послуг зазначаються до укладення договору під час оформлення замовлення."
  ),

  h2("§ 3 Gewerbliche Nutzer", "§ 3 Коммерческие пользователи", "§ 3 Комерційні користувачі"),
  p(
    "agb-03-01",
    "Die Nutzung der kostenpflichtigen Plattformleistungen richtet sich ausschließlich an gewerbliche Nutzer im Sinne der Verordnung (EU) 2019/1150. Mit Registrierung und Abschluss eines kostenpflichtigen Tarifs erklären Sie, dass Sie die Plattform in gewerblicher Eigenschaft nutzen.",
    "Использование платных услуг платформы предназначено исключительно для коммерческих пользователей в смысле Регламента (ЕС) 2019/1150. Регистрируясь и оформляя платный тариф, вы заявляете, что используете платформу в коммерческом качестве.",
    "Використання платних послуг платформи призначене виключно для комерційних користувачів у розумінні Регламенту (ЄС) 2019/1150. Реєструючись і оформлюючи платний тариф, ви заявляєте, що використовуєте платформу в комерційній якості."
  ),
  p(
    "agb-03-02",
    "Freuly verlangt derzeit weder einen Gewerbeschein noch eine KYC-Prüfung vor der Registrierung oder vor der ersten Veröffentlichung. Der Spezialist ist selbst dafür verantwortlich, dass er zur gewerblichen Nutzung berechtigt ist und alle berufs- und gewerberechtlichen Pflichten erfüllt.",
    "Freuly в настоящее время не требует ни торгового свидетельства, ни KYC-проверки до регистрации или до первой публикации. Специалист сам отвечает за право на коммерческое использование и выполнение всех профессиональных и торговых обязанностей.",
    "Freuly наразі не вимагає ні торговельного свідоцтва, ні KYC-перевірки до реєстрації або до першої публікації. Спеціаліст сам відповідає за право комерційного використання та виконання всіх професійних і торговельних обов’язків."
  ),

  h2("§ 4 Leistungen von Freuly", "§ 4 Услуги Freuly", "§ 4 Послуги Freuly"),
  p(
    "agb-04-01",
    "Freuly stellt technische Infrastruktur bereit: Profilverwaltung, öffentliche Darstellung, Anfragevermittlung, Abrechnung von Plattformgebühren und optionale Zusatzfunktionen gemäß dem gewählten Tarif.",
    "Freuly предоставляет техническую инфраструктуру: управление профилем, публичное отображение, передачу запросов, выставление счетов за платформенные сборы и дополнительные функции согласно выбранному тарифу.",
    "Freuly надає технічну інфраструктуру: керування профілем, публічне відображення, передачу запитів, виставлення рахунків за платформені збори та додаткові функції згідно з обраним тарифом."
  ),
  p(
    "agb-04-02",
    "Freuly garantiert keine bestimmte Anzahl von Anfragen, Sichtbarkeit, Umsatz oder Geschäftserfolg. Freuly schuldet keinen bestimmten Platz in Suchergebnissen und keine kaufbare Spitzenposition in organischen Suchergebnissen.",
    "Freuly не гарантирует определённое количество запросов, видимость, доход или коммерческий успех. Freuly не обязуется обеспечивать определённое место в результатах поиска и не продаёт верхнюю позицию в органических результатах поиска.",
    "Freuly не гарантує певну кількість запитів, видимість, дохід або комерційний успіх. Freuly не зобов’язана забезпечувати певне місце в результатах пошуку і не продає верхню позицію в органічних результатах пошуку."
  ),

  h2("§ 5 Pflichten des Spezialisten", "§ 5 Обязанности специалиста", "§ 5 Обов’язки спеціаліста"),
  p(
    "agb-05-01",
    "Der Spezialist ist verpflichtet, wahrheitsgemäße Profilangaben zu machen, die Spezialisten-Regeln einzuhalten, erforderliche Nachweise bereitzuhalten und die Gesetzmäßigkeit seiner Leistungen selbst zu gewährleisten.",
    "Специалист обязан предоставлять достоверные данные профиля, соблюдать правила для специалистов, иметь необходимые подтверждения и самостоятельно обеспечивать законность своих услуг.",
    "Спеціаліст зобов’язаний надавати достовірні дані профілю, дотримуватися правил для спеціалістів, мати необхідні підтвердження та самостійно забезпечувати законність своїх послуг."
  ),
  p(
    "agb-05-02",
    "Der Spezialist ist für die rechtmäßige Verarbeitung von Endkundendaten verantwortlich, die er über Freuly erhält. Der Spezialist darf die Plattform nicht missbräuchlich nutzen, insbesondere nicht durch irreführende Angaben, Spam oder Manipulation von Anfragen.",
    "Специалист несёт ответственность за законную обработку данных конечных клиентов, полученных через Freuly. Специалист не должен злоупотреблять платформой, в частности через вводящие в заблуждение сведения, спам или манипуляции запросами.",
    "Спеціаліст несе відповідальність за законну обробку даних кінцевих клієнтів, отриманих через Freuly. Спеціаліст не повинен зловживати платформою, зокрема через оманливі відомості, спам або маніпуляції запитами."
  ),

  h2("§ 6 Inhalte und Nutzungsrechte", "§ 6 Контент и права использования", "§ 6 Контент і права використання"),
  p(
    "agb-06-01",
    "Der Spezialist räumt Freuly ein einfaches, weltweites, übertragbares Nutzungsrecht an den von ihm bereitgestellten Profilinhalten ein, soweit dies für Betrieb, Darstellung und Vermittlung der Plattform erforderlich ist.",
    "Специалист предоставляет Freuly простое, всемирное, передаваемое право использования предоставленного им контента профиля в объёме, необходимом для работы, отображения и передачи запросов на платформе.",
    "Спеціаліст надає Freuly просте, всесвітнє, передаване право використання наданого ним контенту профілю в обсязі, необхідному для роботи, відображення та передачі запитів на платформі."
  ),
  p(
    "agb-06-02",
    "Der Spezialist bleibt Inhaber seiner Inhalte. Freuly darf Inhalte entfernen oder einschränken, wenn sie gegen AGB, Spezialisten-Regeln oder geltendes Recht verstoßen.",
    "Специалист остаётся владельцем своего контента. Freuly может удалять или ограничивать контент, если он нарушает AGB, правила для специалистов или действующее законодательство.",
    "Спеціаліст залишається власником свого контенту. Freuly може видаляти або обмежувати контент, якщо він порушує AGB, правила для спеціалістів або чинне законодавство."
  ),

  h2("§ 7 Datenschutz", "§ 7 Защита данных", "§ 7 Захист даних"),
  p(
    "agb-07-01",
    "Die Verarbeitung personenbezogener Daten richtet sich nach der Datenschutzerklärung von Freuly. Der Spezialist ist für die rechtmäßige Verarbeitung von Endkundendaten verantwortlich, die er über Freuly erhält.",
    "Обработка персональных данных регулируется политикой конфиденциальности Freuly. Специалист несёт ответственность за законную обработку данных конечных клиентов, полученных через Freuly.",
    "Обробка персональних даних регулюється політикою конфіденційності Freuly. Спеціаліст несе відповідальність за законну обробку даних кінцевих клієнтів, отриманих через Freuly."
  ),

  h2("§ 8 Verfügbarkeit", "§ 8 Доступность", "§ 8 Доступність"),
  p(
    "agb-08-01",
    "Freuly bemüht sich um eine stabile Verfügbarkeit, schuldet jedoch keine ununterbrochene Erreichbarkeit. Wartung, Störungen Dritter oder höhere Gewalt können die Nutzung vorübergehend beeinträchtigen.",
    "Freuly стремится обеспечить стабильную доступность, но не гарантирует непрерывную работу. Обслуживание, сбои третьих сторон или форс-мажор могут временно ограничить использование.",
    "Freuly прагне забезпечити стабільну доступність, але не гарантує безперервну роботу. Обслуговування, збої третіх сторін або форс-мажор можуть тимчасово обмежити використання."
  ),

  h2("§ 9 Abonnement-Lebenszyklus und Kulanzzeiträume", "§ 9 Жизненный цикл подписки и льготные периоды", "§ 9 Життєвий цикл підписки та пільгові періоди"),
  p(
    "agb-09-01",
    "Nach der ersten Veröffentlichung eines Profils ohne laufende bezahlte Tarifdeckung gewährt Freuly einen Kulanzzeitraum von 7 Kalendertagen. Dies ist kein kostenloses Testabonnement, sondern eine begrenzte Übergangsfrist, in der das Profil öffentlich sichtbar bleiben kann, sofern keine anderen Gründe für eine Einschränkung vorliegen.",
    "После первой публикации профиля без действующего оплаченного тарифа Freuly предоставляет льготный период 7 календарных дней. Это не бесплатная пробная подписка, а ограниченный переходный срок, в течение которого профиль может оставаться публично видимым, если нет иных оснований для ограничения.",
    "Після першої публікації профілю без діючого оплаченого тарифу Freuly надає пільговий період 7 календарних днів. Це не безкоштовна пробна підписка, а обмежений перехідний строк, протягом якого профіль може залишатися публічно видимим, якщо немає інших підстав для обмеження."
  ),
  p(
    "agb-09-02",
    "Während eines aktiven, bezahlten Abonnementzeitraums ist der Tarif gemäß dem gewählten Plan aktiv. Nach natürlichem Ablauf eines bezahlten Zeitraums ohne rechtzeitige manuelle Verlängerung kann Freuly einen weiteren Kulanzzeitraum von 7 Kalendertagen einräumen.",
    "В течение активного оплаченного периода подписки тариф действует согласно выбранному плану. После естественного окончания оплаченного периода без своевременного ручного продления Freuly может предоставить дополнительный льготный период 7 календарных дней.",
    "Протягом активного оплаченого періоду підписки тариф діє згідно з обраним планом. Після природного завершення оплаченого періоду без своєчасного ручного продовження Freuly може надати додатковий пільговий період 7 календарних днів."
  ),
  p(
    "agb-09-03",
    "Bei Rückerstattung oder Stornierung einer Abo-Zahlung kann Freuly einen Kulanzzeitraum von 7 Kalendertagen ab dem wirksamen Zeitpunkt der Rückerstattung oder Stornierung gewähren. Der Spezialist wird im Dashboard über Kulanzzeiträume und deren Enddatum informiert.",
    "При возмещении или отмене платежа по подписке Freuly может предоставить льготный период 7 календарных дней с момента вступления возмещения или отмены в силу. Специалист информируется в личном кабинете о льготных периодах и дате их окончания.",
    "За відшкодування або скасування платежу за підписку Freuly може надати пільговий період 7 календарних днів з моменту набрання відшкодування або скасування чинності. Спеціаліст інформується в особистому кабінеті про пільгові періоди та дату їх завершення."
  ),
  p(
    "agb-09-04",
    "Nach Ablauf eines Kulanzzeitraums ohne erfolgreiche Zahlung für einen laufenden Tarif kann Freuly die öffentliche Sichtbarkeit des Profils sperren oder einschränken. Das Dashboard kann weiterhin zugänglich bleiben, soweit technisch und rechtlich zulässig.",
    "После окончания льготного периода без успешной оплаты текущего тарифа Freuly может заблокировать или ограничить публичную видимость профиля. Личный кабинет может оставаться доступным, если это технически и юридически допустимо.",
    "Після завершення пільгового періоду без успішної оплати поточного тарифу Freuly може заблокувати або обмежити публічну видимість профілю. Особистий кабінет може залишатися доступним, якщо це технічно та юридично допустимо."
  ),

  h2("§ 10 Support", "§ 10 Поддержка", "§ 10 Підтримка"),
  p(
    "agb-10-01",
    "Supportanfragen können per E-Mail an freuly.de@gmail.com gerichtet werden. Freuly bemüht sich um zeitnahe Bearbeitung in angemessener Frist, garantiert jedoch keine bestimmten Reaktionszeiten.",
    "Запросы в поддержку можно направлять по e-mail на freuly.de@gmail.com. Freuly стремится обрабатывать их своевременно в разумный срок, но не гарантирует конкретные сроки ответа.",
    "Запити в підтримку можна надсилати на e-mail freuly.de@gmail.com. Freuly прагне обробляти їх своєчасно у розумний строк, але не гарантує конкретні терміни відповіді."
  ),

  h2("§ 11 Tarife und Preise", "§ 11 Тарифы и цены", "§ 11 Тарифи та ціни"),
  p(
    "agb-11-01",
    "Freuly Professional kostet 29 € pro Monatszeitraum, Freuly Growth 59 € pro Monatszeitraum, jeweils brutto sofern Umsatzsteuer anfällt. Die Preise werden im Checkout ausgewiesen.",
    "Freuly Professional стоит 29 € за месячный период, Freuly Growth — 59 € за месячный период, каждый брутто при наличии НДС. Цены указываются при оформлении заказа.",
    "Freuly Professional коштує 29 € за місячний період, Freuly Growth — 59 € за місячний період, кожен брутто за наявності ПДВ. Ціни вказуються під час оформлення замовлення."
  ),
  p(
    "agb-11-02",
    "Der Leistungsumfang der Tarife ergibt sich aus der Tarifbeschreibung im Checkout und auf der Website. Freuly kann Tarifinhalte anpassen; wesentliche Änderungen für gewerbliche Nutzer richten sich nach § 25.",
    "Объём услуг тарифов определяется описанием тарифа при оформлении заказа и на сайте. Freuly может корректировать содержание тарифов; существенные изменения для коммерческих пользователей регулируются § 25.",
    "Обсяг послуг тарифів визначається описом тарифу під час оформлення замовлення та на сайті. Freuly може коригувати зміст тарифів; істотні зміни для комерційних користувачів регулюються § 25."
  ),

  h2("§ 12 Verlängerung und Zahlung", "§ 12 Продление и оплата", "§ 12 Продовження та оплата"),
  p(
    "agb-12-01",
    "Abonnements werden ausschließlich durch manuelle Verlängerung fortgeführt. Es erfolgt keine automatische wiederkehrende Abbuchung. Eine Fortführung setzt eine ausdrückliche erneute Zahlung durch den Spezialisten im Checkout voraus.",
    "Подписки продлеваются исключительно путём ручного продления. Автоматическое повторное списание не производится. Продолжение требует явной повторной оплаты специалистом при оформлении заказа.",
    "Підписки продовжуються виключно шляхом ручного продовження. Автоматичне повторне списання не здійснюється. Продовження вимагає явної повторної оплати спеціалістом під час оформлення замовлення."
  ),
  p(
    "agb-12-02",
    "Zahlungen erfolgen über den im Checkout angegebenen Zahlungsdienstleister. Der Spezialist ist dafür verantwortlich, vor Ablauf des laufenden Zeitraums oder des Kulanzzeitraums rechtzeitig manuell zu verlängern, wenn er die öffentliche Sichtbarkeit und Tarifleistungen fortsetzen möchte.",
    "Платежи осуществляются через платёжного провайдера, указанного при оформлении заказа. Специалист сам отвечает за своевременное ручное продление до окончания текущего периода или льготного периода, если он хочет сохранить публичную видимость и услуги тарифа.",
    "Платежі здійснюються через платіжного провайдера, зазначеного під час оформлення замовлення. Спеціаліст сам відповідає за своєчасне ручне продовження до завершення поточного періоду або пільгового періоду, якщо він хоче зберегти публічну видимість і послуги тарифу."
  ),

  h2("§ 13 Kündigung durch den Spezialisten", "§ 13 Расторжение специалистом", "§ 13 Розірвання спеціалістом"),
  p(
    "agb-13-01",
    "Der Spezialist kann das Abonnement jederzeit zum Ende des laufenden bezahlten Monatszeitraums kündigen. Bereits gezahlte Zeiträume werden nicht anteilig erstattet, sofern gesetzlich nichts Abweichendes gilt.",
    "Специалист может отменить подписку в любой момент к концу текущего оплаченного месячного периода. Уже оплаченные периоды не возмещаются пропорционально, если законом не предусмотрено иное.",
    "Спеціаліст може скасувати підписку в будь-який момент до кінця поточного оплаченого місячного періоду. Уже сплачені періоди не відшкодовуються пропорційно, якщо законом не передбачено інше."
  ),

  h2("§ 14 Promoted Request", "§ 14 Promoted Request", "§ 14 Promoted Request"),
  p(
    "agb-14-01",
    "Promoted Request ist ein optionaler Zusatzdienst gegen Einmalzahlung von 10 € (brutto, sofern Umsatzsteuer anfällt). Er ermöglicht die bevorzugte Sichtbarkeit einer konkreten Serviceanfrage für einen begrenzten Zeitraum gemäß den jeweils gültigen Produktregeln.",
    "Promoted Request — дополнительная опциональная услуга за разовый платёж 10 € (брутто, если применяется НДС). Она обеспечивает приоритетную видимость конкретного запроса на услугу на ограниченный период согласно действующим правилам продукта.",
    "Promoted Request — додаткова опціональна послуга за разовий платіж 10 € (брутто, якщо застосовується ПДВ). Вона забезпечує пріоритетну видимість конкретного запиту на послугу на обмежений період згідно з чинними правилами продукту."
  ),
  p(
    "agb-14-02",
    "Promoted Request betrifft ausschließlich die beworbene Serviceanfrage und begründet keinen Anspruch auf dauerhafte oder organische Spitzenplatzierung in allgemeinen Suchergebnissen.",
    "Promoted Request касается исключительно рекламируемого запроса на услугу и не создаёт права на постоянное или органическое первое место в общих результатах поиска.",
    "Promoted Request стосується виключно рекламованого запиту на послугу і не створює права на постійне або органічне перше місце в загальних результатах пошуку."
  ),

  h2("§ 15 Promoted-Gutschrift", "§ 15 Зачёт Promoted", "§ 15 Зарахування Promoted"),
  p(
    "agb-15-01",
    "Wenn der Spezialist nach einer erfolgreichen Promoted-Request-Zahlung innerhalb von 7 Kalendertagen erstmals ein Abonnement Freuly Professional oder Freuly Growth abschließt, kann der Betrag von 10 € als Gutschrift auf die erste Abo-Zahlung angerechnet werden, sofern die technischen Voraussetzungen erfüllt sind und die Gutschrift zum Zeitpunkt des Checkouts verfügbar ist.",
    "Если специалист после успешной оплаты Promoted Request в течение 7 календарных дней впервые оформит подписку Freuly Professional или Freuly Growth, сумма 10 € может быть зачтена в первый платёж по подписке при выполнении технических условий и наличии зачёта на момент оформления заказа.",
    "Якщо спеціаліст після успішної оплати Promoted Request протягом 7 календарних днів вперше оформить підписку Freuly Professional або Freuly Growth, суму 10 € може бути зараховано до першого платежу за підпискою за умови виконання технічних вимог і наявності зарахування на момент оформлення замовлення."
  ),
  p(
    "agb-15-02",
    "Die Gutschrift ist einmalig, nicht übertragbar und an die konkrete Promoted-Request-Zahlung gebunden. Nach Ablauf von 7 Kalendertagen ab der Promoted-Request-Zahlung entfällt der Anspruch auf die Gutschrift.",
    "Зачёт является одноразовым, непередаваемым и привязан к конкретной оплате Promoted Request. По истечении 7 календарных дней с момента оплаты Promoted Request право на зачёт утрачивается.",
    "Зарахування є одноразовим, непередаваним і прив’язане до конкретної оплати Promoted Request. Після спливу 7 календарних днів з моменту оплати Promoted Request право на зарахування втрачається."
  ),

  h2("§ 16 Geistiges Eigentum von Freuly", "§ 16 Интеллектуальная собственность Freuly", "§ 16 Інтелектуальна власність Freuly"),
  p(
    "agb-16-01",
    "Marken, Logos, Software, Design und sonstige Schutzrechte von Freuly bleiben im Eigentum von Freuly. Eine darüber hinausgehende Nutzung bedarf der vorherigen Zustimmung.",
    "Торговые марки, логотипы, программное обеспечение, дизайн и иные права Freuly остаются собственностью Freuly. Иное использование требует предварительного согласия.",
    "Торгові марки, логотипи, програмне забезпечення, дизайн та інші права Freuly залишаються власністю Freuly. Інше використання потребує попередньої згоди."
  ),

  h2("§ 17 Ranking-Parameter", "§ 17 Параметры ранжирования", "§ 17 Параметри ранжування"),
  p(
    "agb-17-01",
    "Die Sortierung von Spezialisten in Suchergebnissen wird primär nach Entfernung vorgenommen. Bei gleicher oder vergleichbarer Entfernung kann ein internes profilspezifisches Prioritätsmerkmal die Reihenfolge beeinflussen.",
    "Сортировка специалистов в результатах поиска выполняется прежде всего по расстоянию. При одинаковом или сопоставимом расстоянии внутренний профильно-специфический признак приоритета может влиять на порядок.",
    "Сортування спеціалістів у результатах пошуку виконується насамперед за відстанню. За однакової або порівнянної відстані внутрішня профільно-специфічна ознака пріоритету може впливати на порядок."
  ),
  p(
    "agb-17-02",
    "Sofern Bewertungen berücksichtigt werden, können höhere Bewertungen bei sonst gleichen Bedingungen zu einer höheren Position führen. Eine organische Spitzenposition in allgemeinen Suchergebnissen ist nicht käuflich.",
    "Если учитываются оценки, более высокие оценки при прочих равных условиях могут привести к более высокой позиции. Органическое первое место в общих результатах поиска нельзя купить.",
    "Якщо враховуються оцінки, вищі оцінки за інших рівних умов можуть призвести до вищої позиції. Органічне перше місце в загальних результатах пошуку не можна придбати."
  ),
  p(
    "agb-17-03",
    "Freuly garantiert keine bestimmte Ranking-Position und stellt keine aggregierte Dashboard-Ansicht über die individuelle Ranking-Position bereit. Details sind in der Ranking-Offenlegung beschrieben.",
    "Freuly не гарантирует определённую позицию в рейтинге и не предоставляет агрегированный вид панели управления по индивидуальной позиции. Подробности описаны в раскрытии информации о ранжировании.",
    "Freuly не гарантує певну позицію в рейтингу і не надає агрегований вигляд панелі керування щодо індивідуальної позиції. Деталі описані в розкритті інформації про ранжування."
  ),

  h2("§ 18 Verhältnis zu Endkunden", "§ 18 Отношения с конечными клиентами", "§ 18 Відносини з кінцевими клієнтами"),
  p(
    "agb-18-01",
    "Freuly ist nicht Partei von Verträgen zwischen Spezialist und Endkunde. Streitigkeiten hierüber sind zwischen diesen Parteien zu klären.",
    "Freuly не является стороной договоров между специалистом и конечным клиентом. Споры по ним разрешаются между этими сторонами.",
    "Freuly не є стороною договорів між спеціалістом і кінцевим клієнтом. Спори з цього приводу вирішуються між цими сторонами."
  ),

  h2("§ 19 Einschränkung und Sperrung", "§ 19 Ограничение и блокировка", "§ 19 Обмеження та блокування"),
  p(
    "agb-19-01",
    "Freuly kann Profile einschränken oder sperren, wenn der Spezialist gegen AGB, Spezialisten-Regeln oder geltendes Recht verstößt, Missbrauch betreibt oder Sicherheitsrisiken bestehen. In Fällen, in denen eine sofortige Maßnahme gesetzlich zulässig ist, kann Freuly ohne vorherige Ankündigung einschränken oder sperren.",
    "Freuly может ограничить или заблокировать профили, если специалист нарушает AGB, правила для специалистов или действующее законодательство, злоупотребляет платформой или существуют риски безопасности. В случаях, когда немедленная мера допустима по закону, Freuly может ограничить или заблокировать без предварительного уведомления.",
    "Freuly може обмежити або заблокувати профілі, якщо спеціаліст порушує AGB, правила для спеціалістів або чинне законодавство, зловживає платформою або існують ризики безпеки. У випадках, коли негайна міра допустима за законом, Freuly може обмежити або заблокувати без попереднього повідомлення."
  ),
  p(
    "agb-19-02",
    "Freuly teilt dem Spezialisten die Gründe für eine Einschränkung oder Sperrung soweit gesetzlich erforderlich, vor oder spätestens zum Zeitpunkt des Wirksamwerdens der Einschränkung oder Sperrung auf einem dauerhaften Datenträger mit. Fragen hierzu können an freuly.de@gmail.com gerichtet werden; Freuly bemüht sich um Bearbeitung in angemessener Frist.",
    "Freuly сообщает специалисту причины ограничения или блокировки, насколько это требуется законом, до или не позднее момента вступления ограничения или блокировки в силу на постоянном носителе данных. Вопросы можно направлять на freuly.de@gmail.com; Freuly стремится обработать их в разумный срок.",
    "Freuly повідомляє спеціалісту причини обмеження або блокування, наскільки це вимагається законом, до або не пізніше моменту набрання обмеження або блокування чинності на постійному носії даних. Питання можна надсилати на freuly.de@gmail.com; Freuly прагне обробити їх у розумний строк."
  ),

  h2("§ 20 Kündigung durch Freuly", "§ 20 Расторжение Freuly", "§ 20 Розірвання Freuly"),
  p(
    "agb-20-01",
    "Freuly kann den Vertrag mit gewerblichen Nutzern aus wichtigem Grund fristlos kündigen, soweit dies gesetzlich zulässig ist. In anderen Fällen, in denen die Verordnung (EU) 2019/1150 eine Kündigungsfrist vorsieht, beträgt die Frist 30 Kalendertage.",
    "Freuly может расторгнуть договор с коммерческими пользователями по важной причине без срока уведомления, если это допустимо по закону. В иных случаях, когда Регламент (ЕС) 2019/1150 предусматривает срок уведомления, срок составляет 30 календарных дней.",
    "Freuly може розірвати договір із комерційними користувачами з важливої причини без строку попередження, якщо це допустимо за законом. В інших випадках, коли Регламент (ЄС) 2019/1150 передбачає строк попередження, строк становить 30 календарних днів."
  ),
  p(
    "agb-20-02",
    "Die Kündigung erfolgt unter Angabe der Gründe, soweit gesetzlich erforderlich. Eine sofortige Beendigung ist nur zulässig, soweit dies gesetzlich erlaubt ist.",
    "Расторжение осуществляется с указанием причин, насколько это требуется законом. Немедленное прекращение допустимо только в случаях, когда это разрешено законом.",
    "Розірвання здійснюється з зазначенням причин, наскільки це вимагається законом. Негайне припинення допустиме лише у випадках, коли це дозволено законом."
  ),

  h2("§ 21 Beschwerden und Kontakt", "§ 21 Жалобы и контакт", "§ 21 Скарги та контакт"),
  p(
    "agb-21-01",
    "Gewerbliche Nutzer können Anliegen, Hinweise und Beschwerden zu Freuly per E-Mail an freuly.de@gmail.com einreichen. Freuly prüft eingegangene Mitteilungen und bemüht sich um eine sachliche Bearbeitung in angemessener Frist.",
    "Коммерческие пользователи могут направлять вопросы, замечания и жалобы на Freuly по e-mail на freuly.de@gmail.com. Freuly рассматривает поступившие сообщения и стремится к объективной обработке в разумный срок.",
    "Комерційні користувачі можуть надсилати питання, зауваження та скарги на Freuly на e-mail freuly.de@gmail.com. Freuly розглядає отримані повідомлення та прагне до об’єктивної обробки у розумний строк."
  ),
  p(
    "agb-21-02",
    "Freuly dokumentiert Beschwerden nach internen Prozessen. Ein gesondertes externes Beschwerdeportal wird derzeit nicht bereitgestellt.",
    "Freuly документирует жалобы по внутренним процессам. Отдельный внешний портал для жалоб в настоящее время не предоставляется.",
    "Freuly документує скарги за внутрішніми процесами. Окремий зовнішній портал для скарг наразі не надається."
  ),

  h2("§ 22 Datenzugang und P2B-Transparenz", "§ 22 Доступ к данным и прозрачность P2B", "§ 22 Доступ до даних і прозорість P2B"),
  p(
    "agb-22-01",
    "Spezialisten können im Dashboard auf ihre Profildaten, empfangene Leads, angezeigte Abrechnungsinformationen und den Status ihres Abonnements zugreifen. Freuly stellt keine aggregierte Dashboard-Ansicht über die individuelle Ranking-Position bereit.",
    "Специалисты могут в личном кабинете получать доступ к данным профиля, полученным лидам, отображаемой платёжной информации и статусу подписки. Freuly не предоставляет агрегированный вид панели управления по индивидуальной позиции в рейтинге.",
    "Спеціалісти можуть в особистому кабінеті отримувати доступ до даних профілю, отриманих лідів, відображуваної платіжної інформації та статусу підписки. Freuly не надає агрегований вигляд панелі керування щодо індивідуальної позиції в рейтингу."
  ),
  p(
    "agb-22-02",
    "Freuly greift auf Profildaten, Leads, Abrechnungsdaten und technische Nutzungsdaten zu, soweit dies für Betrieb, Abrechnung, Sicherheit, Support und Erfüllung gesetzlicher Pflichten erforderlich ist. Eine Weitergabe an Dritte erfolgt nur, soweit dies für Zahlungsabwicklung, Hosting, E-Mail-Versand, Geocoding, Übersetzungsdienste, Analyse, Partner-Attribution oder gesetzliche Pflichten erforderlich ist.",
    "Freuly получает доступ к данным профиля, лидам, платёжным данным и техническим данным использования в объёме, необходимом для работы, выставления счетов, безопасности, поддержки и выполнения законных обязательств. Передача третьим лицам осуществляется только в объёме, необходимом для обработки платежей, хостинга, отправки e-mail, геокодирования, услуг перевода, аналитики, партнёрской атрибуции или законных обязательств.",
    "Freuly отримує доступ до даних профілю, лідів, платіжних даних і технічних даних використання в обсязі, необхідному для роботи, виставлення рахунків, безпеки, підтримки та виконання законних зобов’язань. Передача третім особам здійснюється лише в обсязі, необхідному для обробки платежів, хостингу, надсилання e-mail, геокодування, послуг перекладу, аналітики, партнерської атрибуції або законних зобов’язань."
  ),
  p(
    "agb-22-03",
    "Freuly stellt derzeit keine automatisierte Datenexport-Funktion bereit. Nach Vertragsbeendigung kann Freuly verbleibende Plattformkopien nach Ablauf gesetzlicher Aufbewahrungsfristen löschen oder anonymisieren. Leads, die bereits an den Spezialisten übermittelt wurden, verbleiben beim Spezialisten.",
    "Freuly в настоящее время не предоставляет автоматизированную функцию экспорта данных. После прекращения договора Freuly может удалить или анонимизировать оставшиеся копии на платформе по истечении законных сроков хранения. Лиды, уже переданные специалисту, остаются у специалиста.",
    "Freuly наразі не надає автоматизованої функції експорту даних. Після припинення договору Freuly може видалити або анонімізувати залишкові копії на платформі після спливу законних строків зберігання. Ліди, уже передані спеціалісту, залишаються у спеціаліста."
  ),

  h2("§ 23 Haftung", "§ 23 Ответственность", "§ 23 Відповідальність"),
  p(
    "agb-23-01",
    "Freuly haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Bei leichter Fahrlässigkeit haftet Freuly nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Zwingende gesetzliche Haftung bleibt unberührt.",
    "Freuly несёт неограниченную ответственность за умысел и грубую неосторожность, а также за вред жизни, здоровью и телесной неприкосновенности. При лёгкой неосторожности Freuly отвечает только при нарушении существенных договорных обязательств и ограничивает ответственность предсказуемым типичным ущербом. Императивная законная ответственность остаётся незатронутой.",
    "Freuly несе необмежену відповідальність за умисел і грубу необережність, а також за шкоду життю, здоров’ю та тілесній недоторканності. За легкої необережності Freuly відповідає лише за порушення істотних договірних зобов’язань і обмежує відповідальність передбачуваною типовою шкодою. Імперативна законна відповідальність залишається незмінною."
  ),

  h2("§ 24 Rechnungen", "§ 24 Счета", "§ 24 Рахунки"),
  p(
    "agb-24-01",
    "Rechnungen und Zahlungsbelege werden über den Zahlungsdienstleister und im Dashboard bereitgestellt, soweit verfügbar. Der Spezialist ist für die ordnungsgemäße steuerliche Behandlung seiner Geschäftsvorgänge selbst verantwortlich.",
    "Счета и платёжные документы предоставляются через платёжного провайдера и в личном кабинете, если доступны. Специалист сам отвечает за надлежащую налоговую обработку своих операций.",
    "Рахунки та платіжні документи надаються через платіжного провайдера та в особистому кабінеті, якщо доступні. Спеціаліст сам відповідає за належну податкову обробку своїх операцій."
  ),

  h2("§ 25 Änderungen der AGB", "§ 25 Изменения AGB", "§ 25 Зміни AGB"),
  p(
    "agb-25-01",
    "Freuly kann diese AGB mit Wirkung für die Zukunft ändern. Gewerbliche Nutzer im Sinne der Verordnung (EU) 2019/1150 werden mindestens 15 Kalendertage vor Inkrafttreten der Änderung informiert.",
    "Freuly может изменять настоящие AGB с действием на будущее. Коммерческие пользователи в смысле Регламента (ЕС) 2019/1150 информируются не менее чем за 15 календарных дней до вступления изменений в силу.",
    "Freuly може змінювати ці AGB з дією на майбутнє. Комерційні користувачі в розумінні Регламенту (ЄС) 2019/1150 інформуються не менш ніж за 15 календарних днів до набрання змінами чинності."
  ),
  p(
    "agb-25-02",
    "Gewerbliche Nutzer können vor Ablauf der 15 Kalendertage aus wichtigem Grund kündigen, wenn die Änderung ihre Rechte wesentlich beeinträchtigt und die Verordnung (EU) 2019/1150 dies vorsieht. Schweigen oder bloße Fortnutzung gilt nicht als Zustimmung zu wesentlichen Änderungen.",
    "Коммерческие пользователи могут до истечения 15 календарных дней расторгнуть договор по важной причине, если изменение существенно затрагивает их права и это предусмотрено Регламентом (ЕС) 2019/1150. Молчание или простое продолжение использования не считается согласием на существенные изменения.",
    "Комерційні користувачі можуть до спливу 15 календарних днів розірвати договір з важливої причини, якщо зміна істотно зачіпає їхні права і це передбачено Регламентом (ЄС) 2019/1150. Мовчання або просте продовження використання не вважається згодою на істотні зміни."
  ),

  h2("§ 26 Anwendbares Recht und Schlussbestimmungen", "§ 26 Применимое право и заключительные положения", "§ 26 Застосовне право та заключні положення"),
  p(
    "agb-26-01",
    "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Es wird kein ausschließlicher Gerichtsstand vereinbart; es gelten die gesetzlichen Gerichtsstandsregelungen.",
    "Применяется право Федеративной Республики Германия с исключением Конвенции ООН о договорах международной купли-продажи товаров. Исключительная подсудность не согласовывается; действуют законные правила подсудности.",
    "Застосовується право Федеративної Республіки Німеччина з виключенням Конвенції ООН про договори міжнародної купівлі-продажу товарів. Виключна підсудність не погоджується; діють законні правила підсудності."
  ),
  p(
    "agb-26-02",
    "Sollten einzelne Bestimmungen unwirksam sein, bleibt der übrige Vertrag wirksam. An die Stelle der unwirksamen Bestimmung tritt die gesetzlich zulässige Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.",
    "Если отдельные положения недействительны, остальной договор остаётся действительным. На место недействительного положения вступает законно допустимое правило, наиболее близкое к экономической цели.",
    "Якщо окремі положення недійсні, решта договору залишається чинною. На місце недійсного положення вступає законно допустиме правило, найближче до економічної мети."
  ),

  h2("§ 27 Salvatorische Klausel und Kommunikation", "§ 27 Оговорка о делимости и коммуникация", "§ 27 Застереження про подільність і комунікація"),
  p(
    "agb-27-01",
    "Freuly kann Mitteilungen zu diesen AGB per E-Mail an die im Konto hinterlegte Adresse senden. Der Spezialist ist verpflichtet, diese Adresse aktuell zu halten.",
    "Freuly может направлять уведомления по настоящим AGB по e-mail на адрес, указанную в аккаунте. Специалист обязан поддерживать эту адресу в актуальном состоянии.",
    "Freuly може надсилати повідомлення щодо цих AGB на e-mail, зазначений в обліковому записі. Спеціаліст зобов’язаний підтримувати цю адресу в актуальному стані."
  ),

  h2("§ 28 Stand der AGB", "§ 28 Статус AGB", "§ 28 Статус AGB"),
  p(
    "agb-28-01",
    "Diese Fassung tritt im August 2026 in Kraft und ersetzt frühere Fassungen der Spezialisten-AGB, soweit vorhanden.",
    "Настоящая редакция вступает в силу в августе 2026 г. и заменяет предыдущие редакции AGB для специалистов, если таковые имелись.",
    "Ця редакція набирає чинності в серпні 2026 р. і замінює попередні редакції AGB для спеціалістів, якщо такі були."
  ),
];
