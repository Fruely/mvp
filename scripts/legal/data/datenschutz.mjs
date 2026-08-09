import { OPERATOR } from "../lib/render.mjs";
import { p, h2, h3, dsBlock } from "./_helpers.mjs";

/** @type {import("../lib/render.mjs").default} */
export const DATENSCHUTZ_BLOCKS = [
  {
    type: "title",
    de: "# Datenschutzerklärung Freuly",
    ru: "# Политика конфиденциальности Freuly",
    ua: "# Політика конфіденційності Freuly",
  },
  p(
    "ds-meta-01",
    "Stand: August 2026. Verantwortlicher: " + OPERATOR.de,
    "Дата: август 2026 г. Ответственный: " + OPERATOR.ru,
    "Дата: серпень 2026 р. Відповідальний: " + OPERATOR.ua
  ),
  p(
    "ds-meta-02",
    "Maßgebliche Sprachfassung ist Deutsch. Übersetzungen dienen der Orientierung.",
    "Юридически определяющей является немецкая версия. Переводы предоставлены для удобства.",
    "Юридично визначальною є німецька версія. Переклади надано для зручності."
  ),

  h2("1. Überblick", "1. Обзор", "1. Огляд"),
  p(
    "ds-01-01",
    "Diese Datenschutzerklärung informiert über die Verarbeitung personenbezogener Daten auf der Plattform Freuly für Spezialisten, Endnutzer und Partner.",
    "Настоящая политика конфиденциальности информирует об обработке персональных данных на платформе Freuly для специалистов, конечных пользователей и партнёров.",
    "Ця політика конфіденційності інформує про обробку персональних даних на платформі Freuly для спеціалістів, кінцевих користувачів і партнерів."
  ),
  p(
    "ds-01-02",
    "Freuly verarbeitet personenbezogene Daten nur, soweit dies für Betrieb, Vertragserfüllung, Sicherheit, gesetzliche Pflichten oder — bei optionalen Funktionen — auf Grundlage Ihrer Einwilligung erforderlich ist.",
    "Freuly обрабатывает персональные данные только в объёме, необходимом для работы, исполнения договора, безопасности, законных обязанностей или — для опциональных функций — на основании вашего согласия.",
    "Freuly обробляє персональні дані лише в обсязі, необхідному для роботи, виконання договору, безпеки, законних обов’язків або — для опціональних функцій — на підставі вашої згоди."
  ),

  h2("2. Verantwortlicher", "2. Ответственный", "2. Відповідальний"),
  p("ds-02-01", OPERATOR.de, OPERATOR.ru, OPERATOR.ua),
  p(
    "ds-02-02",
    "Kontakt für Datenschutzanfragen: freuly.de@gmail.com",
    "Контакт для запросов по защите данных: freuly.de@gmail.com",
    "Контакт для запитів із захисту даних: freuly.de@gmail.com"
  ),

  h2("3. Verarbeitungsblöcke A–S", "3. Блоки обработки A–S", "3. Блоки обробки A–S"),

  ...dsBlock(
    "a",
    "Block A — Hosting, Sicherheit und technische Logs",
    "Блок A — Хостинг, безопасность и технические логи",
    "Блок A — Хостинг, безпека та технічні логи",
    {
      purpose: {
        de: "Zweck: Bereitstellung, Betrieb, Sicherheit und Fehleranalyse der Website und Backend-Infrastruktur.",
        ru: "Цель: предоставление, работа, безопасность и анализ ошибок сайта и backend-инфраструктуры.",
        ua: "Мета: надання, робота, безпека та аналіз помилок сайту та backend-інфраструктури.",
      },
      data: {
        de: "Datenkategorien: IP-Adresse, Zeitstempel, aufgerufene URLs, HTTP-Status, Browser- und Geräteinformationen, Referrer, technische Fehler- und Sicherheitslogs.",
        ru: "Категории данных: IP-адрес, метки времени, посещённые URL, HTTP-статус, сведения о браузере и устройстве, referrer, технические логи ошибок и безопасности.",
        ua: "Категорії даних: IP-адреса, мітки часу, відвідані URL, HTTP-статус, відомості про браузер і пристрій, referrer, технічні логи помилок і безпеки.",
      },
      recipient: {
        de: "Empfänger: Vercel (Hosting/Edge), Supabase (Datenbank/Auth), Upstash (Caching/Rate-Limiting-Infrastruktur).",
        ru: "Получатели: Vercel (хостинг/edge), Supabase (база данных/auth), Upstash (кэширование/инфраструктура rate-limiting).",
        ua: "Одержувачі: Vercel (хостинг/edge), Supabase (база даних/auth), Upstash (кешування/інфраструктура rate-limiting).",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem und stabilem Betrieb).",
        ru: "Правовое основание: ст. 6 п. 1 lit. f GDPR (законный интерес в безопасной и стабильной работе).",
        ua: "Правова підстава: ст. 6 п. 1 lit. f GDPR (законний інтерес у безпечній і стабільній роботі).",
      },
      retention: {
        de: "Speicherdauer: in der Regel bis zu 90 Tage; bei Sicherheitsvorfällen länger, soweit erforderlich.",
        ru: "Срок хранения: обычно до 90 дней; при инцидентах безопасности дольше, если необходимо.",
        ua: "Строк зберігання: зазвичай до 90 днів; при інцидентах безпеки довше, якщо потрібно.",
      },
    }
  ),

  ...dsBlock(
    "b",
    "Block B — Konto und Authentifizierung",
    "Блок B — Учётная запись и аутентификация",
    "Блок B — Обліковий запис і автентифікація",
    {
      purpose: {
        de: "Zweck: Registrierung, Anmeldung, Sitzungsverwaltung und Kontosicherheit.",
        ru: "Цель: регистрация, вход, управление сессиями и безопасность аккаунта.",
        ua: "Мета: реєстрація, вхід, керування сесіями та безпека облікового запису.",
      },
      data: {
        de: "Datenkategorien: E-Mail-Adresse, Passwort-Hash, Name, Telefonnummer, Kontostatus, Sitzungs-Token.",
        ru: "Категории данных: e-mail, хеш пароля, имя, номер телефона, статус аккаунта, токены сессии.",
        ua: "Категорії даних: e-mail, хеш пароля, ім’я, номер телефону, статус облікового запису, токени сесії.",
      },
      recipient: {
        de: "Empfänger: Supabase (Auth und Datenbank).",
        ru: "Получатели: Supabase (auth и база данных).",
        ua: "Одержувачі: Supabase (auth і база даних).",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag/ vorvertragliche Maßnahmen).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор/преддоговорные меры).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір/переддоговірні заходи).",
      },
      retention: {
        de: "Speicherdauer: bis zur Kontolöschung zuzüglich gesetzlicher Aufbewahrungsfristen.",
        ru: "Срок хранения: до удаления аккаунта плюс законные сроки хранения.",
        ua: "Строк зберігання: до видалення облікового запису плюс законні строки зберігання.",
      },
    }
  ),

  ...dsBlock(
    "c",
    "Block C — Spezialistenprofil",
    "Блок C — Профиль специалиста",
    "Блок C — Профіль спеціаліста",
    {
      purpose: {
        de: "Zweck: Erstellung, Veröffentlichung und Verwaltung des Spezialistenprofils.",
        ru: "Цель: создание, публикация и управление профилем специалиста.",
        ua: "Мета: створення, публікація та керування профілем спеціаліста.",
      },
      data: {
        de: "Datenkategorien: Profiltexte, Fotos, Preise, Kategorie, Standort, Sprachen, Zertifikate, Verfügbarkeit, Tarifstatus.",
        ru: "Категории данных: тексты профиля, фото, цены, категория, местоположение, языки, сертификаты, доступность, статус тарифа.",
        ua: "Категорії даних: тексти профілю, фото, ціни, категорія, місцезнаходження, мови, сертифікати, доступність, статус тарифу.",
      },
      recipient: {
        de: "Empfänger: Supabase, CDN/Storage-Anbieter im Rahmen des Hostings.",
        ru: "Получатели: Supabase, CDN/хранилище в рамках хостинга.",
        ua: "Одержувачі: Supabase, CDN/сховище в межах хостингу.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. f DSGVO (Missbrauchsprävention und Plattformsicherheit).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор) и lit. f GDPR (предотвращение злоупотреблений и безопасность платформы).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір) і lit. f GDPR (запобігання зловживанням і безпека платформи).",
      },
      retention: {
        de: "Speicherdauer: bis zur Profil- oder Kontolöschung; gesetzliche Aufbewahrung bleibt unberührt.",
        ru: "Срок хранения: до удаления профиля или аккаунта; законное хранение сохраняется.",
        ua: "Строк зберігання: до видалення профілю або облікового запису; законне зберігання зберігається.",
      },
    }
  ),

  ...dsBlock(
    "d",
    "Block D — Uploads und Medienspeicher",
    "Блок D — Загрузки и хранение медиа",
    "Блок D — Завантаження та зберігання медіа",
    {
      purpose: {
        de: "Zweck: Speicherung und Auslieferung von Profilbildern, Galeriebildern und hochgeladenen Dokumenten.",
        ru: "Цель: хранение и доставка фото профиля, изображений галереи и загруженных документов.",
        ua: "Мета: зберігання та доставка фото профілю, зображень галереї та завантажених документів.",
      },
      data: {
        de: "Datenkategorien: Bilddateien, Dateimetadaten, ggf. hochgeladene Nachweise.",
        ru: "Категории данных: файлы изображений, метаданные файлов, при необходимости загруженные подтверждения.",
        ua: "Категорії даних: файли зображень, метадані файлів, за потреби завантажені підтвердження.",
      },
      recipient: {
        de: "Empfänger: Supabase Storage und verbundene CDN/Hosting-Dienste.",
        ru: "Получатели: Supabase Storage и связанные CDN/хостинг-сервисы.",
        ua: "Одержувачі: Supabase Storage і пов’язані CDN/хостинг-сервіси.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір).",
      },
      retention: {
        de: "Speicherdauer: bis zur Löschung durch den Spezialisten oder bis zur Kontobeendigung.",
        ru: "Срок хранения: до удаления специалистом или до прекращения аккаунта.",
        ua: "Строк зберігання: до видалення спеціалістом або до припинення облікового запису.",
      },
    }
  ),

  ...dsBlock(
    "e",
    "Block E — Geocoding (OpenStreetMap / Nominatim)",
    "Блок E — Геокодирование (OpenStreetMap / Nominatim)",
    "Блок E — Геокодування (OpenStreetMap / Nominatim)",
    {
      purpose: {
        de: "Zweck: Umwandlung von Adressen und Standortangaben in Koordinaten für Suche und Entfernungsberechnung.",
        ru: "Цель: преобразование адресов и местоположений в координаты для поиска и расчёта расстояния.",
        ua: "Мета: перетворення адрес і місцезнаходжень на координати для пошуку та розрахунку відстані.",
      },
      data: {
        de: "Datenkategorien: eingegebene Adresse, Ort, Postleitzahl, Koordinaten, Suchradius.",
        ru: "Категории данных: введённый адрес, город, почтовый индекс, координаты, радиус поиска.",
        ua: "Категорії даних: введена адреса, місто, поштовий індекс, координати, радіус пошуку.",
      },
      recipient: {
        de: "Empfänger: OpenStreetMap-Nominatim-Dienst; serverseitige Verarbeitung über Freuly-Infrastruktur.",
        ru: "Получатели: сервис OpenStreetMap Nominatim; серверная обработка через инфраструктуру Freuly.",
        ua: "Одержувачі: сервіс OpenStreetMap Nominatim; серверна обробка через інфраструктуру Freuly.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. f DSGVO (technisch notwendige Standortverarbeitung).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор) и lit. f GDPR (технически необходимая обработка местоположения).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір) і lit. f GDPR (технічно необхідна обробка місцезнаходження).",
      },
      retention: {
        de: "Speicherdauer: Koordinaten im Profil bis zur Löschung; Anfragen an Nominatim gemäß deren Richtlinien.",
        ru: "Срок хранения: координаты в профиле до удаления; запросы к Nominatim согласно их правилам.",
        ua: "Строк зберігання: координати в профілі до видалення; запити до Nominatim згідно з їхніми правилами.",
      },
    }
  ),

  ...dsBlock(
    "f",
    "Block F — Direkte Client-Leads",
    "Блок F — Прямые обращения клиентов",
    "Блок F — Прямі звернення клієнтів",
    {
      purpose: {
        de: "Zweck: Vermittlung direkter Kontaktanfragen von Endnutzern an ausgewählte Spezialisten.",
        ru: "Цель: передача прямых контактных запросов от конечных пользователей выбранным специалистам.",
        ua: "Мета: передача прямих контактних запитів від кінцевих користувачів обраним спеціалістам.",
      },
      data: {
        de: "Datenkategorien: Name, E-Mail, Telefonnummer, Nachrichteninhalt, Zeitstempel, zugeordneter Spezialist.",
        ru: "Категории данных: имя, e-mail, телефон, содержание сообщения, метка времени, назначенный специалист.",
        ua: "Категорії даних: ім’я, e-mail, телефон, зміст повідомлення, мітка часу, призначений спеціаліст.",
      },
      recipient: {
        de: "Empfänger: ausgewählter Spezialist, Supabase.",
        ru: "Получатели: выбранный специалист, Supabase.",
        ua: "Одержувачі: обраний спеціаліст, Supabase.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Berechtigtes Interesse: Betrieb einer Kontaktvermittlungsplattform; Abwägung zugunsten der Vermittlung bei angemessenen Schutzmaßnahmen.",
        ru: "Правовое основание: ст. 6 п. 1 lit. f GDPR. Законный интерес: работа платформы контактной передачи; баланс в пользу передачи при надлежащих мерах защиты.",
        ua: "Правова підстава: ст. 6 п. 1 lit. f GDPR. Законний інтерес: робота платформи контактної передачі; баланс на користь передачі за належних заходів захисту.",
      },
      retention: {
        de: "Speicherdauer: bis zur Löschung durch Spezialist/Freuly oder Ablauf gesetzlicher Fristen.",
        ru: "Срок хранения: до удаления специалистом/Freuly или истечения законных сроков.",
        ua: "Строк зберігання: до видалення спеціалістом/Freuly або спливу законних строків.",
      },
    }
  ),

  ...dsBlock(
    "g",
    "Block G — Service Requests",
    "Блок G — Запросы на услуги",
    "Блок G — Запити на послуги",
    {
      purpose: {
        de: "Zweck: Bearbeitung strukturierter Serviceanfragen und Zuordnung zu geeigneten Spezialisten.",
        ru: "Цель: обработка структурированных запросов на услуги и назначение подходящим специалистам.",
        ua: "Мета: обробка структурованих запитів на послуги та призначення відповідним спеціалістам.",
      },
      data: {
        de: "Datenkategorien: Anfrageinhalt, Kontaktdaten, Standort, Kategorie, Status, Zuordnungen.",
        ru: "Категории данных: содержание запроса, контактные данные, местоположение, категория, статус, назначения.",
        ua: "Категорії даних: зміст запиту, контактні дані, місцезнаходження, категорія, статус, призначення.",
      },
      recipient: {
        de: "Empfänger: betroffene Spezialisten, Supabase.",
        ru: "Получатели: затронутые специалисты, Supabase.",
        ua: "Одержувачі: залучені спеціалісти, Supabase.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) und lit. f DSGVO (Sicherheit und Missbrauchsprävention).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (преддоговорные меры) и lit. f GDPR (безопасность и предотвращение злоупотреблений).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (переддоговірні заходи) і lit. f GDPR (безпека та запобігання зловживанням).",
      },
      retention: {
        de: "Speicherdauer: bis Zweckerreichung, Löschung oder gesetzliche Frist.",
        ru: "Срок хранения: до достижения цели, удаления или законного срока.",
        ua: "Строк зберігання: до досягнення мети, видалення або законного строку.",
      },
    }
  ),

  ...dsBlock(
    "h",
    "Block H — Promoted Request",
    "Блок H — Promoted Request",
    "Блок H — Promoted Request",
    {
      purpose: {
        de: "Zweck: Abwicklung des optionalen Promoted-Request-Zusatzdienstes und Zugriffssteuerung.",
        ru: "Цель: обработка опциональной дополнительной услуги Promoted Request и контроль доступа.",
        ua: "Мета: обробка опціональної додаткової послуги Promoted Request і контроль доступу.",
      },
      data: {
        de: "Datenkategorien: Serviceanfrage-ID, Zahlungsstatus, Aktivierungszeitraum, Tarifzuordnung.",
        ru: "Категории данных: ID запроса на услугу, статус оплаты, период активации, назначение тарифа.",
        ua: "Категорії даних: ID запиту на послугу, статус оплати, період активації, призначення тарифу.",
      },
      recipient: {
        de: "Empfänger: Supabase, Stripe (Zahlungsabwicklung).",
        ru: "Получатели: Supabase, Stripe (обработка платежей).",
        ua: "Одержувачі: Supabase, Stripe (обробка платежів).",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір).",
      },
      retention: {
        de: "Speicherdauer: bis Ende des Produktzeitraums und Ablauf handelsrechtlicher Fristen.",
        ru: "Срок хранения: до окончания продуктового периода и истечения коммерческих сроков.",
        ua: "Строк зберігання: до завершення продуктового періоду та спливу комерційних строків.",
      },
    }
  ),

  ...dsBlock(
    "i",
    "Block I — Stripe-Abrechnung",
    "Блок I — Выставление счетов Stripe",
    "Блок I — Виставлення рахунків Stripe",
    {
      purpose: {
        de: "Zweck: Zahlungsabwicklung, Rechnungsstellung und Verwaltung von Abonnements und Einmalzahlungen.",
        ru: "Цель: обработка платежей, выставление счетов и управление подписками и разовыми платежами.",
        ua: "Мета: обробка платежів, виставлення рахунків і керування підписками та разовими платежами.",
      },
      data: {
        de: "Datenkategorien: Rechnungsdaten, Zahlungsstatus, Tarif, Stripe-Kunden- und Zahlungsreferenzen, Transaktionsmetadaten.",
        ru: "Категории данных: платёжные данные, статус оплаты, тариф, ссылки клиента и платежа Stripe, метаданные транзакций.",
        ua: "Категорії даних: платіжні дані, статус оплати, тариф, посилання клієнта та платежу Stripe, метадані транзакцій.",
      },
      recipient: {
        de: "Empfänger: Stripe, Supabase.",
        ru: "Получатели: Stripe, Supabase.",
        ua: "Одержувачі: Stripe, Supabase.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. c DSGVO (steuer- und handelsrechtliche Pflichten).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор) и lit. c GDPR (налоговые и коммерческие обязанности).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір) і lit. c GDPR (податкові та комерційні обов’язки).",
      },
      retention: {
        de: "Speicherdauer: handels- und steuerrechtliche Fristen, danach Löschung oder Anonymisierung.",
        ru: "Срок хранения: коммерческие и налоговые сроки, затем удаление или анонимизация.",
        ua: "Строк зберігання: комерційні та податкові строки, далі видалення або анонімізація.",
      },
    }
  ),

  ...dsBlock(
    "j",
    "Block J — Partnerkonto",
    "Блок J — Партнёрский аккаунт",
    "Блок J — Партнерський обліковий запис",
    {
      purpose: {
        de: "Zweck: Registrierung, Verwaltung und Vertragsnachweis für Partner des Freuly-Partnerprogramms.",
        ru: "Цель: регистрация, управление и подтверждение договора для партнёров партнёрской программы Freuly.",
        ua: "Мета: реєстрація, керування та підтвердження договору для партнерів партнерської програми Freuly.",
      },
      data: {
        de: "Datenkategorien: Partnerkontodaten, Vertragsannahme, Bankverbindung für SEPA, Auszahlungspräferenzen, PDF-Nachweise.",
        ru: "Категории данных: данные партнёрского аккаунта, принятие договора, банковские реквизиты для SEPA, предпочтения выплат, PDF-подтверждения.",
        ua: "Категорії даних: дані партнерського облікового запису, прийняття договору, банківські реквізити для SEPA, уподобання виплат, PDF-підтвердження.",
      },
      recipient: {
        de: "Empfänger: Supabase, E-Mail-Dienst (Resend).",
        ru: "Получатели: Supabase, e-mail-сервис (Resend).",
        ua: "Одержувачі: Supabase, e-mail-сервіс (Resend).",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. c DSGVO (Nachweis- und Aufbewahrungspflichten).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор) и lit. c GDPR (обязанности по подтверждению и хранению).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір) і lit. c GDPR (обов’язки з підтвердження та зберігання).",
      },
      retention: {
        de: "Speicherdauer: Vertrags- und steuerrechtliche Fristen.",
        ru: "Срок хранения: договорные и налоговые сроки.",
        ua: "Строк зберігання: договірні та податкові строки.",
      },
    }
  ),

  ...dsBlock(
    "k",
    "Block K — Referral-Klicks",
    "Блок K — Клики по реферальным ссылкам",
    "Блок K — Кліки за реферальними посиланнями",
    {
      purpose: {
        de: "Zweck: Protokollierung von Klicks auf Partner-Referral-Links zur Missbrauchserkennung und technischen Attribution.",
        ru: "Цель: протоколирование кликов по партнёрским referral-ссылкам для выявления злоупотреблений и технической атрибуции.",
        ua: "Мета: протоколювання кліків за партнерськими referral-посиланнями для виявлення зловживань і технічної атрибуції.",
      },
      data: {
        de: "Datenkategorien: Zeitstempel, Link-Referenz, anonymisierte oder pseudonyme Besuchsdaten, IP-Adresse (kurzfristig).",
        ru: "Категории данных: метка времени, ссылка, анонимизированные или псевдонимные данные визита, IP-адрес (краткосрочно).",
        ua: "Категорії даних: мітка часу, посилання, анонімізовані або псевдонімні дані візиту, IP-адреса (короткостроково).",
      },
      recipient: {
        de: "Empfänger: Supabase, Freuly-Server.",
        ru: "Получатели: Supabase, серверы Freuly.",
        ua: "Одержувачі: Supabase, сервери Freuly.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Integrität des Partnerprogramms).",
        ru: "Правовое основание: ст. 6 п. 1 lit. f GDPR (законный интерес в целостности партнёрской программы).",
        ua: "Правова підстава: ст. 6 п. 1 lit. f GDPR (законний інтерес у цілісності партнерської програми).",
      },
      retention: {
        de: "Speicherdauer: in der Regel bis zu 90 Tage, länger bei Missbrauchsverdacht.",
        ru: "Срок хранения: обычно до 90 дней, дольше при подозрении на злоупотребление.",
        ua: "Строк зберігання: зазвичай до 90 днів, довше при підозрі на зловживання.",
      },
    }
  ),

  ...dsBlock(
    "l",
    "Block L — Referral-Cookie freuly_partner_ref",
    "Блок L — Referral-cookie freuly_partner_ref",
    "Блок L — Referral-cookie freuly_partner_ref",
    {
      purpose: {
        de: "Zweck: First-Touch-Attribution für das Partnerprogramm über den Referral-Link.",
        ru: "Цель: first-touch-атрибуция для партнёрской программы через referral-ссылку.",
        ua: "Мета: first-touch-атрибуція для партнерської програми через referral-посилання.",
      },
      data: {
        de: "Datenkategorien: signierte Cookie-Nutzlast mit Partner- und Link-Referenz sowie Zeitstempel.",
        ru: "Категории данных: подписанная cookie-нагрузка с партнёрской и link-ссылкой и меткой времени.",
        ua: "Категорії даних: підписане cookie-навантаження з партнерською та link-посиланням і міткою часу.",
      },
      recipient: {
        de: "Empfänger: Freuly-Server; keine Weitergabe an Partner vor fester Attribution.",
        ru: "Получатели: серверы Freuly; передача партнёру до фиксации атрибуции не производится.",
        ua: "Одержувачі: сервери Freuly; передача партнеру до фіксації атрибуції не здійснюється.",
      },
      basis: {
        de: "Rechtsgrundlage: § 25 TDDDG und Art. 6 Abs. 1 lit. a DSGVO (Einwilligung in Referral-Attribution).",
        ru: "Правовое основание: § 25 TDDDG и ст. 6 п. 1 lit. a GDPR (согласие на referral-атрибуцию).",
        ua: "Правова підстава: § 25 TDDDG і ст. 6 п. 1 lit. a GDPR (згода на referral-атрибуцію).",
      },
      retention: {
        de: "Speicherdauer: 90 Tage ab dem ersten gültigen Referral-Touch.",
        ru: "Срок хранения: 90 дней с первого валидного referral-touch.",
        ua: "Строк зберігання: 90 днів від першого валідного referral-touch.",
      },
    }
  ),

  ...dsBlock(
    "m",
    "Block M — Partner-Attribution",
    "Блок M — Партнёрская атрибуция",
    "Блок M — Партнерська атрибуція",
    {
      purpose: {
        de: "Zweck: Zuordnung von Registrierungen und qualifizierten Conversions zu Partnern.",
        ru: "Цель: привязка регистраций и квалифицированных конверсий к партнёрам.",
        ua: "Мета: прив’язка реєстрацій і кваліфікованих конверсій до партнерів.",
      },
      data: {
        de: "Datenkategorien: Partner-ID, Link-ID, Registrierungszeitpunkt, Conversion-Status, Validierungsstatus.",
        ru: "Категории данных: ID партнёра, ID ссылки, время регистрации, статус конверсии, статус валидации.",
        ua: "Категорії даних: ID партнера, ID посилання, час реєстрації, статус конверсії, статус валідації.",
      },
      recipient: {
        de: "Empfänger: Supabase; Partner sehen nur eigene aggregierte Programmdaten im Partner-Dashboard.",
        ru: "Получатели: Supabase; партнёры видят только собственные агрегированные данные программы в партнёрском кабинете.",
        ua: "Одержувачі: Supabase; партнери бачать лише власні агреговані дані програми в партнерському кабінеті.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Partnervertrag) und lit. f DSGVO (Integrität des Programms).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (партнёрский договор) и lit. f GDPR (целостность программы).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (партнерський договір) і lit. f GDPR (цілісність програми).",
      },
      retention: {
        de: "Speicherdauer: Vertrags- und steuerrechtliche Fristen des Partnerprogramms.",
        ru: "Срок хранения: договорные и налоговые сроки партнёрской программы.",
        ua: "Строк зберігання: договірні та податкові строки партнерської програми.",
      },
    }
  ),

  ...dsBlock(
    "n",
    "Block N — Provisionen und Auszahlungen",
    "Блок N — Комиссии и выплаты",
    "Блок N — Комісії та виплати",
    {
      purpose: {
        de: "Zweck: Berechnung, Validierung und Auszahlung von Partnervergütungen per manueller SEPA-Überweisung oder Abo-Guthaben.",
        ru: "Цель: расчёт, валидация и выплата партнёрских вознаграждений через ручной SEPA-перевод или зачёт на подписку.",
        ua: "Мета: розрахунок, валідація та виплата партнерських винагород через ручний SEPA-переказ або зарахування на підписку.",
      },
      data: {
        de: "Datenkategorien: Provisionsbetrag, Validierungszeitraum, Auszahlungsstatus, Bankverbindung, Buchungsreferenzen.",
        ru: "Категории данных: сумма комиссии, период валидации, статус выплаты, банковские реквизиты, ссылки на проводки.",
        ua: "Категорії даних: сума комісії, період валідації, статус виплати, банківські реквізити, посилання на проводки.",
      },
      recipient: {
        de: "Empfänger: Supabase, autorisierte Freuly-Admins, Bank des Partners bei SEPA-Überweisung.",
        ru: "Получатели: Supabase, авторизованные админы Freuly, банк партнёра при SEPA-переводе.",
        ua: "Одержувачі: Supabase, авторизовані адміни Freuly, банк партнера при SEPA-переказі.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. c DSGVO (steuer- und buchhalterische Pflichten).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор) и lit. c GDPR (налоговые и бухгалтерские обязанности).",
        ua: "Правова підстава: ст. 6 п. 1 lit. b GDPR (договір) і lit. c GDPR (податкові та бухгалтерські обов’язки).",
      },
      retention: {
        de: "Speicherdauer: handels- und steuerrechtliche Fristen.",
        ru: "Срок хранения: коммерческие и налоговые сроки.",
        ua: "Строк зберігання: комерційні та податкові строки.",
      },
    }
  ),

  ...dsBlock(
    "o",
    "Block O — E-Mail (Resend)",
    "Блок O — E-mail (Resend)",
    "Блок O — E-mail (Resend)",
    {
      purpose: {
        de: "Zweck: Versand von Support-, Benachrichtigungs-, Vertrags- und System-E-Mails.",
        ru: "Цель: отправка e-mail поддержки, уведомлений, договоров и системных сообщений.",
        ua: "Мета: надсилання e-mail підтримки, сповіщень, договорів і системних повідомлень.",
      },
      data: {
        de: "Datenkategorien: E-Mail-Adresse, Betreff, Inhalt, Versandstatus, Zeitstempel.",
        ru: "Категории данных: e-mail-адрес, тема, содержание, статус отправки, метка времени.",
        ua: "Категорії даних: e-mail-адреса, тема, зміст, статус надсилання, мітка часу.",
      },
      recipient: {
        de: "Empfänger: Resend (E-Mail-Dienstleister).",
        ru: "Получатели: Resend (e-mail-провайдер).",
        ua: "Одержувачі: Resend (e-mail-провайдер).",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. f DSGVO (Support und Sicherheitsbenachrichtigungen).",
        ru: "Правовое основание: ст. 6 п. 1 lit. b GDPR (договор) и lit. f GDPR (поддержка и уведомления безопасности).",
        ua: "Правова підстава: st. 6 п. 1 lit. b GDPR (договір) і lit. f GDPR (підтримка та сповіщення безпеки).",
      },
      retention: {
        de: "Speicherdauer: bis Zweckerreichung; Protokolle beim Anbieter gemäß dessen Richtlinien.",
        ru: "Срок хранения: до достижения цели; протоколы у провайдера согласно его правилам.",
        ua: "Строк зберігання: до досягнення мети; протоколи у провайдера згідно з його правилами.",
      },
    }
  ),

  ...dsBlock(
    "p",
    "Block P — Telegram",
    "Блок P — Telegram",
    "Блок P — Telegram",
    {
      purpose: {
        de: "Zweck: optionale Kommunikation in Telegram-Gruppen oder -Kanälen im Zusammenhang mit Freuly.",
        ru: "Цель: опциональная коммуникация в группах или каналах Telegram в связи с Freuly.",
        ua: "Мета: опціональна комунікація в групах або каналах Telegram у зв’язку з Freuly.",
      },
      data: {
        de: "Datenkategorien: Nutzername, Nachrichteninhalt, Gruppen-/Kanalzugehörigkeit, soweit freiwillig genutzt.",
        ru: "Категории данных: имя пользователя, содержание сообщений, принадлежность к группе/каналу, если используется добровольно.",
        ua: "Категорії даних: ім’я користувача, зміст повідомлень, належність до групи/каналу, якщо використовується добровільно.",
      },
      recipient: {
        de: "Empfänger: Telegram (Telegram FZ-LLC / verbundene Unternehmen).",
        ru: "Получатели: Telegram (Telegram FZ-LLC / связанные компании).",
        ua: "Одержувачі: Telegram (Telegram FZ-LLC / пов’язані компанії).",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), soweit erforderlich, und lit. b DSGVO (Vertrag/Support).",
        ru: "Правовое основание: ст. 6 п. 1 lit. a GDPR (согласие), если требуется, и lit. b GDPR (договор/поддержка).",
        ua: "Правова підстава: st. 6 п. 1 lit. a GDPR (згода), якщо потрібно, і lit. b GDPR (договір/підтримка).",
      },
      retention: {
        de: "Speicherdauer: gemäß Telegram-Richtlinien; Freuly speichert nur, soweit für Support erforderlich.",
        ru: "Срок хранения: согласно правилам Telegram; Freuly хранит только в объёме, необходимом для поддержки.",
        ua: "Строк зберігання: згідно з правилами Telegram; Freuly зберігає лише в обсязі, необхідному для підтримки.",
      },
    }
  ),

  ...dsBlock(
    "q",
    "Block Q — DeepL",
    "Блок Q — DeepL",
    "Блок Q — DeepL",
    {
      purpose: {
        de: "Zweck: maschinelle Übersetzung von Inhalten für Mehrsprachigkeit der Plattform.",
        ru: "Цель: машинный перевод контента для многоязычности платформы.",
        ua: "Мета: машинний переклад контенту для багатомовності платформи.",
      },
      data: {
        de: "Datenkategorien: zu übersetzende Texte, Sprachcodes; keine vollständigen Profile, sofern vermeidbar.",
        ru: "Категории данных: переводимые тексты, коды языков; полные профили не передаются, если это можно избежать.",
        ua: "Категорії даних: тексти для перекладу, коди мов; повні профілі не передаються, якщо це можна уникнути.",
      },
      recipient: {
        de: "Empfänger: DeepL SE.",
        ru: "Получатели: DeepL SE.",
        ua: "Одержувачі: DeepL SE.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an mehrsprachiger Plattformdarstellung).",
        ru: "Правовое основание: ст. 6 п. 1 lit. f GDPR (законный интерес в многоязычном отображении платформы).",
        ua: "Правова підстава: st. 6 п. 1 lit. f GDPR (законний інтерес у багатомовному відображенні платформи).",
      },
      retention: {
        de: "Speicherdauer: minimal erforderlich; DeepL gemäß Anbieter-Richtlinien.",
        ru: "Срок хранения: минимально необходимый; DeepL согласно правилам провайдера.",
        ua: "Строк зберігання: мінімально необхідний; DeepL згідно з правилами провайдера.",
      },
    }
  ),

  ...dsBlock(
    "r",
    "Block R — Upstash Rate-Limiting",
    "Блок R — Upstash Rate-Limiting",
    "Блок R — Upstash Rate-Limiting",
    {
      purpose: {
        de: "Zweck: Missbrauchsprävention, Rate-Limiting und Schutz vor automatisierten Angriffen.",
        ru: "Цель: предотвращение злоупотреблений, rate-limiting и защита от автоматизированных атак.",
        ua: "Мета: запобігання зловживанням, rate-limiting і захист від автоматизованих атак.",
      },
      data: {
        de: "Datenkategorien: IP-Adresse, Request-Zähler, Zeitfenster, Endpoint-Metadaten.",
        ru: "Категории данных: IP-адрес, счётчик запросов, временное окно, метаданные endpoint.",
        ua: "Категорії даних: IP-адреса, лічильник запитів, часове вікно, метадані endpoint.",
      },
      recipient: {
        de: "Empfänger: Upstash.",
        ru: "Получатели: Upstash.",
        ua: "Одержувачі: Upstash.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an IT-Sicherheit).",
        ru: "Правовое основание: st. 6 п. 1 lit. f GDPR (законный интерес в IT-безопасности).",
        ua: "Правова підстава: st. 6 п. 1 lit. f GDPR (законний інтерес у IT-безпеці).",
      },
      retention: {
        de: "Speicherdauer: kurzfristig, typischerweise Minuten bis wenige Tage je nach Rate-Limit-Konfiguration.",
        ru: "Срок хранения: краткосрочно, обычно от минут до нескольких дней в зависимости от конфигурации rate-limit.",
        ua: "Строк зберігання: короткостроково, зазвичай від хвилин до кількох днів залежно від конфігурації rate-limit.",
      },
    }
  ),

  ...dsBlock(
    "s",
    "Block S — Admin-Verarbeitung",
    "Блок S — Админ-обработка",
    "Блок S — Адмін-обробка",
    {
      purpose: {
        de: "Zweck: Moderation, Betrugsprävention, Support, Partner-Auszahlungsprüfung und Plattformadministration.",
        ru: "Цель: модерация, предотвращение мошенничества, поддержка, проверка партнёрских выплат и администрирование платформы.",
        ua: "Мета: модерація, запобігання шахрайству, підтримка, перевірка партнерських виплат і адміністрування платформи.",
      },
      data: {
        de: "Datenkategorien: Profil-, Nutzungs-, Abrechnungs- und Partnerdaten im Einzelfall, soweit für den Vorgang erforderlich.",
        ru: "Категории данных: данные профиля, использования, расчётов и партнёра в отдельных случаях, если необходимо для процедуры.",
        ua: "Категорії даних: дані профілю, використання, розрахунків і партнера в окремих випадках, якщо потрібно для процедури.",
      },
      recipient: {
        de: "Empfänger: autorisierte Freuly-Administratoren; keine Weitergabe an Dritte außerhalb gesetzlicher Pflichten.",
        ru: "Получатели: авторизованные администраторы Freuly; передача третьим лицам вне законных обязанностей не производится.",
        ua: "Одержувачі: авторизовані адміністратори Freuly; передача третім особам поза законними обов’язками не здійснюється.",
      },
      basis: {
        de: "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Plattformbetrieb).",
        ru: "Правовое основание: st. 6 п. 1 lit. f GDPR (законный интерес в безопасной работе платформы).",
        ua: "Правова підстава: st. 6 п. 1 lit. f GDPR (законний інтерес у безпечній роботі платформи).",
      },
      retention: {
        de: "Speicherdauer: bis zur Klärung des Vorgangs; länger nur bei gesetzlicher Pflicht oder dokumentiertem Missbrauchsfall.",
        ru: "Срок хранения: до завершения процедуры; дольше только при законной обязанности или документированном случае злоупотребления.",
        ua: "Строк зберігання: до завершення процедури; довше лише за законного обов’язку або задокументованого випадку зловживання.",
      },
    }
  ),

  h2("4. Cookies und Einwilligung", "4. Cookie и согласие", "4. Cookie та згода"),
  p(
    "ds-04-01",
    "Freuly verwendet drei Einwilligungskategorien: Notwendig, Analyse und Referral-Attribution. Notwendige Cookies werden stets gesetzt. Optionale Kategorien werden nur nach Einwilligung aktiviert.",
    "Freuly использует три категории согласия: Необходимые, Аналитика и Referral-атрибуция. Необходимые cookie всегда устанавливаются. Дополнительные категории активируются только после согласия.",
    "Freuly використовує три категорії згоди: Необхідні, Аналітика та Referral-атрибуція. Необхідні cookie завжди встановлюються. Додаткові категорії активуються лише після згоди."
  ),
  p(
    "ds-04-02",
    "Die Einwilligungsauswahl kann in den Cookie-Einstellungen geändert oder widerrufen werden. Details zu freuly_partner_ref finden sich in Block L.",
    "Выбор согласия можно изменить или отозвать в настройках cookie. Подробности о freuly_partner_ref — в блоке L.",
    "Вибір згоди можна змінити або відкликати в налаштуваннях cookie. Деталі про freuly_partner_ref — у блоці L."
  ),

  h2("5. Google Analytics 4", "5. Google Analytics 4", "5. Google Analytics 4"),
  p(
    "ds-05-purpose",
    "Zweck: Nutzungsanalyse der Website, soweit eingewilligt.",
    "Цель: анализ использования сайта при наличии согласия.",
    "Мета: аналіз використання сайту за наявності згоди."
  ),
  p(
    "ds-05-data",
    "Datenkategorien: pseudonyme Nutzungsdaten, gekürzte IP-Adresse, Seitenaufrufe, Ereignisse.",
    "Категории данных: псевдонимные данные использования, сокращённый IP, просмотры страниц, события.",
    "Категорії даних: псевдонімні дані використання, скорочена IP, перегляди сторінок, події."
  ),
  p(
    "ds-05-recipient",
    "Empfänger: Google Ireland Limited; Verarbeitung kann in Drittländern erfolgen.",
    "Получатели: Google Ireland Limited; обработка может осуществляться в третьих странах.",
    "Одержувачі: Google Ireland Limited; обробка може здійснюватися в третіх країнах."
  ),
  p(
    "ds-05-basis",
    "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung in Analyse).",
    "Правовое основание: ст. 6 п. 1 lit. a GDPR (согласие на аналитику).",
    "Правова підстава: st. 6 п. 1 lit. a GDPR (згода на аналітику)."
  ),
  p(
    "ds-05-retention",
    "Speicherdauer: gemäß Google-Konfiguration, typischerweise bis zu 14 Monate.",
    "Срок хранения: согласно конфигурации Google, обычно до 14 месяцев.",
    "Строк зберігання: згідно з конфігурацією Google, зазвичай до 14 місяців."
  ),

  h2("6. Empfänger und Auftragsverarbeiter", "6. Получатели и обработчики", "6. Одержувачі та обробники"),
  p(
    "ds-06-01",
    "Freuly setzt Dienstleister als Auftragsverarbeiter ein, soweit erforderlich, insbesondere Vercel, Supabase, Upstash, Stripe, Resend, Google (Analytics), DeepL und OpenStreetMap/Nominatim. Verträge zur Auftragsverarbeitung werden abgeschlossen, soweit gesetzlich erforderlich.",
    "Freuly привлекает поставщиков услуг как обработчиков, если необходимо, в частности Vercel, Supabase, Upstash, Stripe, Resend, Google (Analytics), DeepL и OpenStreetMap/Nominatim. Договоры об обработке заключаются, если это требуется законом.",
    "Freuly залучає постачальників послуг як обробників, якщо потрібно, зокрема Vercel, Supabase, Upstash, Stripe, Resend, Google (Analytics), DeepL і OpenStreetMap/Nominatim. Договори про обробку укладаються, якщо це вимагається законом."
  ),

  h2("7. Drittlandübermittlung", "7. Передача в третьи страны", "7. Передача в треті країни"),
  p(
    "ds-07-01",
    "Einige Dienstleister können Daten in Drittländern, insbesondere den USA, verarbeiten. Freuly prüft verfügbare Schutzmechanismen wie Standardvertragsklauseln und ergänzende technische Maßnahmen. Freuly behauptet nicht pauschal, dass für alle Anbieter ein Angemessenheitsbeschluss oder das EU-US Data Privacy Framework gilt.",
    "Некоторые поставщики услуг могут обрабатывать данные в третьих странах, в частности в США. Freuly проверяет доступные механизмы защиты, такие как стандартные договорные clauses и дополнительные технические меры. Freuly не утверждает в общем виде, что для всех провайдеров действует решение об adequacy или EU-US Data Privacy Framework.",
    "Деякі постачальники послуг можуть обробляти дані в третіх країнах, зокрема в США. Freuly перевіряє доступні механізми захисту, такі як стандартні договірні clauses і додаткові технічні заходи. Freuly не стверджує загалом, що для всіх провайдерів діє рішення про adequacy або EU-US Data Privacy Framework."
  ),
  p(
    "ds-07-02",
    "Ein absolutes Risiko einer behördlichen Zugriffsnahme in Drittländern kann technisch und rechtlich nicht ausgeschlossen werden. Betroffene können zusätzliche Informationen per E-Mail an freuly.de@gmail.com anfordern.",
    "Абсолютный риск доступа государственных органов в третьих странах технически и юридически не может быть исключён. Субъекты данных могут запросить дополнительную информацию по e-mail на freuly.de@gmail.com.",
    "Абсолютний ризик доступу державних органів у третіх країнах технічно та юридично не може бути виключений. Суб’єкти даних можуть запитати додаткову інформацію на e-mail freuly.de@gmail.com."
  ),

  h2("8. Speicherdauer — Grundsätze", "8. Сроки хранения — принципы", "8. Строки зберігання — принципи"),
  p(
    "ds-08-01",
    "Personenbezogene Daten werden nur so lange gespeichert, wie es für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Danach werden Daten gelöscht oder anonymisiert, soweit möglich.",
    "Персональные данные хранятся только столько, сколько необходимо для соответствующих целей или действуют законные обязанности хранения. После этого данные удаляются или анонимизируются, если возможно.",
    "Персональні дані зберігаються лише стільки, скільки потрібно для відповідних цілей або діють законні обов’язки зберігання. Після цього дані видаляються або анонімізуються, якщо можливо."
  ),

  h2("9. Betroffenenrechte", "9. Права субъектов данных", "9. Права суб’єктів даних"),
  h3("Auskunft", "Доступ", "Доступ"),
  p(
    "ds-right-01",
    "Sie haben das Recht, Auskunft über die zu Ihrer Person gespeicherten Daten zu erhalten (Art. 15 DSGVO).",
    "Вы имеете право получить информацию о хранящихся данных о вашей персоне (ст. 15 GDPR).",
    "Ви маєте право отримати інформацію про збережені дані про вашу особу (ст. 15 GDPR)."
  ),
  h3("Berichtigung", "Исправление", "Виправлення"),
  p(
    "ds-right-02",
    "Sie haben das Recht auf Berichtigung unrichtiger Daten (Art. 16 DSGVO).",
    "Вы имеете право на исправление неверных данных (ст. 16 GDPR).",
    "Ви маєте право на виправлення невірних даних (ст. 16 GDPR)."
  ),
  h3("Löschung", "Удаление", "Видалення"),
  p(
    "ds-right-03",
    "Sie haben das Recht auf Löschung, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen (Art. 17 DSGVO).",
    "Вы имеете право на удаление, если не действуют законные обязанности хранения (ст. 17 GDPR).",
    "Ви маєте право на видалення, якщо не діють законні обов’язки зберігання (ст. 17 GDPR)."
  ),
  h3("Einschränkung", "Ограничение", "Обмеження"),
  p(
    "ds-right-04",
    "Sie haben das Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO).",
    "Вы имеете право на ограничение обработки (ст. 18 GDPR).",
    "Ви маєте право на обмеження обробки (ст. 18 GDPR)."
  ),
  h3("Datenübertragbarkeit", "Переносимость", "Переносимість"),
  p(
    "ds-right-05",
    "Sie haben das Recht auf Datenübertragbarkeit für automatisiert verarbeitete Daten auf Vertragsbasis (Art. 20 DSGVO). Freuly stellt derzeit keine separate Self-Service-Exportfunktion bereit; Anfragen können per E-Mail gestellt werden.",
    "Вы имеете право на переносимость данных для автоматизированно обрабатываемых данных на договорной основе (ст. 20 GDPR). Freuly в настоящее время не предоставляет отдельную self-service функцию экспорта; запросы можно направлять по e-mail.",
    "Ви маєте право на переносимість даних для автоматизовано оброблених даних на договірній основі (ст. 20 GDPR). Freuly наразі не надає окремої self-service функції експорту; запити можна надсилати на e-mail."
  ),
  h3("Widerspruch", "Возражение", "Заперечення"),
  p(
    "ds-right-06",
    "Sie haben das Recht, der Verarbeitung auf Grundlage berechtigter Interessen zu widersprechen (Art. 21 DSGVO).",
    "Вы имеете право возражать против обработки на основании законных интересов (ст. 21 GDPR).",
    "Ви маєте право заперечувати проти обробки на підставі законних інтересів (ст. 21 GDPR)."
  ),
  h3("Widerruf der Einwilligung", "Отзыв согласия", "Відкликання згоди"),
  p(
    "ds-right-07",
    "Erteilte Einwilligungen können jederzeit mit Wirkung für die Zukunft widerrufen werden (Art. 7 Abs. 3 DSGVO).",
    "Данные согласия могут быть отозваны в любой момент с действием на будущее (ст. 7 п. 3 GDPR).",
    "Надані згоди можуть бути відкликані в будь-який момент з дією на майбутнє (ст. 7 п. 3 GDPR)."
  ),
  h3("Beschwerde bei Aufsichtsbehörde", "Жалоба в надзорный орган", "Скарга до наглядового органу"),
  p(
    "ds-right-08",
    "Sie haben das Recht, Beschwerde bei einer Aufsichtsbehörde einzureichen, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts (Art. 77 DSGVO). Zuständig kann u.a. die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen sein.",
    "Вы имеете право подать жалобу в надзорный орган, в частности в государстве вашего обычного пребывания (ст. 77 GDPR). Компетентным может быть, среди прочих, уполномоченный по защите данных Северного Рейна-Вестфалии.",
    "Ви маєте право подати скаргу до наглядового органу, зокрема в державі вашого звичайного перебування (ст. 77 GDPR). Компетентним може бути, серед інших, уповноважений із захисту даних Північного Рейну-Вестфалії."
  ),

  h2("10. Datensicherheit", "10. Безопасность данных", "10. Безпека даних"),
  p(
    "ds-10-01",
    "Freuly trifft angemessene technische und organisatorische Maßnahmen, insbesondere Zugriffsbeschränkungen, Verschlüsselung wo verfügbar, Protokollierung und regelmäßige Sicherheitsüberprüfungen.",
    "Freuly принимает надлежащие технические и организационные меры, в частности ограничения доступа, шифрование где доступно, протоколирование и регулярные проверки безопасности.",
    "Freuly вживає належних технічних і організаційних заходів, зокрема обмеження доступу, шифрування де доступно, протоколювання та регулярні перевірки безпеки."
  ),

  h2("11. Änderungen dieser Datenschutzerklärung", "11. Изменения политики конфиденциальности", "11. Зміни політики конфіденційності"),
  p(
    "ds-11-01",
    "Freuly kann diese Datenschutzerklärung anpassen, wenn sich Rechtslage, Technik oder Verarbeitungszwecke ändern. Die aktuelle Fassung ist auf der Website veröffentlicht.",
    "Freuly может корректировать настоящую политику конфиденциальности при изменении правовой ситуации, технологий или целей обработки. Актуальная редакция публикуется на сайте.",
    "Freuly може коригувати цю політику конфіденційності при зміні правової ситуації, технологій або цілей обробки. Актуальна редакція публікується на сайті."
  ),

  h2("12. Kontakt", "12. Контакт", "12. Контакт"),
  p(
    "ds-12-01",
    "Anfragen zu dieser Datenschutzerklärung richten Sie bitte an freuly.de@gmail.com.",
    "Запросы по настоящей политике конфиденциальности направляйте на freuly.de@gmail.com.",
    "Запити щодо цієї політики конфіденційності надсилайте на freuly.de@gmail.com."
  ),
];
