import type { LegalContentLang, LegalDocument } from "./types";


const de: LegalDocument = {
  metaTitle: `Datenschutzerklärung | Freuly`,
  metaDescription: `Datenschutzerklärung – Informationen zum Umgang mit personenbezogenen Daten auf freuly.de`,
  title: `Datenschutzerklärung`,
  stand: `Stand: Mai 2026`,
  sections: [
    {
      title: `1. Datenschutz auf einen Blick`,
      blocks: [
      { type: "p", text: `Der Schutz Ihrer persönlichen Daten ist uns wichtig. In dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten wir auf der Plattform Freuly verarbeiten und zu welchen Zwecken dies geschieht.` },
      { type: "p", text: `Freuly ist eine Plattform, auf der Spezialisten eigene Profile veröffentlichen können und Nutzer Kontaktanfragen an Spezialisten senden können.` },
      ],
    },
    {
      title: `2. Verantwortlicher`,
      blocks: [
      { type: "p", text: `Verantwortlich für die Datenverarbeitung auf dieser Website (Verantwortlicher):` },
      { type: "p", text: `Natalia Sheshenia
Hofolpe Str. 46
57399 Kirchhundem
Deutschland` },
      {
        type: "labeledLinks",
        lines: [
          { label: `E-Mail:`, href: "mailto:freuly.de@gmail.com", value: `freuly.de@gmail.com` },
        ],
      },
      ],
    },
    {
      title: `3. Erhebung und Verarbeitung personenbezogener Daten`,
      blocks: [
      { type: "p", text: `Wir verarbeiten personenbezogene Daten, wenn Sie:` },
      {
        type: "ul",
        items: [
        `unsere Website besuchen,`,
        `ein Spezialistenprofil erstellen,`,
        `Inhalte für ein Spezialistenprofil veröffentlichen,`,
        `Kontaktanfragen senden,`,
        `mit uns per E-Mail, über soziale Netzwerke oder über Telegram kommunizieren,`,
        `am Partnerprogramm teilnehmen und die Partnerprogramm-Bedingungen elektronisch annehmen.`,
        ],
      },
      { type: "p", text: `Zu den verarbeiteten Daten können insbesondere gehören:` },
      {
        type: "ul",
        items: [
        `Vorname und Nachname,`,
        `E-Mail-Adresse,`,
        `Telefonnummer,`,
        `Profilfoto,`,
        `Portfolio-Bilder,`,
        `Zertifikate und Ausbildungsnachweise,`,
        `Postleitzahl und Stadt,`,
        `angebotene Dienstleistungen,`,
        `Preise,`,
        `Kategorien und Tätigkeitsbeschreibungen,`,
        `Nachrichten und Anfrageinhalte,`,
        `technische Nutzungsdaten.`,
        ],
      },
      ],
    },
    {
      title: `3.1 Partnerprogramm und Vertragsbestätigungen`,
      blocks: [
        {
          type: "p",
          text: `Wenn Sie am Freuly-Partnerprogramm teilnehmen und die Partnerprogramm-Bedingungen elektronisch annehmen, speichern wir den Annahmezeitpunkt, die Version der Bedingungen, einen kryptografischen Hash des maßgeblichen Vertragstextes sowie eine Bestätigung in Form eines PDF-Dokuments in einem nicht öffentlichen Speicherbereich. Die PDF-Bestätigung kann an Ihre Konto-E-Mail-Adresse gesendet werden, sofern ein E-Mail-Dienst konfiguriert ist.`,
        },
      ],
    },
    {
      title: `4. Registrierung von Spezialisten`,
      blocks: [
      { type: "p", text: `Spezialisten können auf Freuly ein Profil erstellen und Inhalte veröffentlichen. Die von Spezialisten bereitgestellten Informationen können öffentlich auf der Plattform angezeigt werden.` },
      { type: "p", text: `Dazu können insbesondere Name, Profilbeschreibung, Kategorie, angebotene Dienstleistungen, Preise, Stadt oder Region, Sprachen, Fotos, Portfolio-Inhalte, Zertifikate und weitere berufliche Angaben gehören.` },
      { type: "p", text: `Die Veröffentlichung erfolgt freiwillig durch den jeweiligen Spezialisten. Spezialisten sind selbst dafür verantwortlich, dass die von ihnen bereitgestellten Inhalte, Texte, Bilder, Nachweise und Angaben richtig sind und keine Rechte Dritter verletzen.` },
      ],
    },
    {
      title: `5. Kontaktanfragen und Weitergabe von Daten`,
      blocks: [
      { type: "p", text: `Wenn Nutzer über die Plattform eine Anfrage an einen Spezialisten senden, können die angegebenen Kontaktdaten und Inhalte der Anfrage an den ausgewählten Spezialisten weitergegeben werden, damit dieser die Anfrage bearbeiten und Kontakt aufnehmen kann.` },
      { type: "p", text: `Freuly dient als Plattform zur Darstellung von Spezialistenprofilen und zur Weiterleitung von Anfragen. Freuly garantiert keine Aufträge, Verträge, Zahlungen, Bewertungen oder eine bestimmte Qualität der angebotenen Leistungen.` },
      ],
    },
    {
      title: `6. Hosting und technische Dienstleister`,
      blocks: [
      { type: "p", text: `Für den Betrieb der Plattform nutzen wir externe technische Dienstleister. Diese Dienstleister können personenbezogene Daten im Rahmen ihrer technischen Leistungen verarbeiten (Auftragsverarbeitung, soweit anwendbar).` },
      { type: "p", text: `Hosting und technische Infrastruktur:` },
      {
        type: "ul",
        items: [
        `Vercel Inc.`,
        `Supabase Inc.`,
        ],
      },
      { type: "p", text: `Supabase kann insbesondere für Authentifizierung, Datenbank, Speicherung von Profilinformationen, Dateien und Bildern sowie technische Plattformfunktionen eingesetzt werden.` },
      { type: "p", text: `Vercel kann insbesondere für Hosting, Auslieferung der Website, technische Protokolle und Sicherheitsfunktionen eingesetzt werden.` },
      ],
    },
    {
      title: `7. Technische Nutzungsdaten`,
      blocks: [
      { type: "p", text: `Beim Besuch der Website können automatisch technische Daten verarbeitet werden. Dazu können insbesondere gehören:` },
      {
        type: "ul",
        items: [
        `IP-Adresse,`,
        `Datum und Uhrzeit der Anfrage,`,
        `aufgerufene Seiten und Dateien,`,
        `Browsertyp und Browserversion,`,
        `verwendetes Betriebssystem,`,
        `Referrer-URL,`,
        `Geräte- und Verbindungsinformationen,`,
        `Server- und Sicherheitsprotokolle.`,
        ],
      },
      { type: "p", text: `Diese Daten dienen dem technischen Betrieb, der Sicherheit, der Fehleranalyse und der Missbrauchsprävention.` },
      ],
    },
    {
      title: `8. Cookies und ähnliche Technologien`,
      blocks: [
      { type: "p", text: `Unsere Website verwendet Cookies und ähnliche Technologien. Über das Cookie-Banner können Sie Ihre Einwilligung erteilen, anpassen oder widerrufen. Technisch notwendige Verarbeitungen sind stets aktiv; optionale Kategorien werden nur nach Ihrer Einwilligung eingesetzt, soweit dies gesetzlich erforderlich ist.` },
      { type: "p", text: `Die Cookie-Einstellungen unterscheiden derzeit folgende Kategorien:` },
      {
        type: "ul",
        items: [
        `Notwendig (necessary): erforderlich für den grundlegenden Betrieb der Website, Sicherheit und die Speicherung Ihrer Cookie-Auswahl. Diese Kategorie ist stets aktiv.`,
        `Analyse / Analytics (Google Analytics 4): hilft uns zu verstehen, wie die Website genutzt wird. Wird nur nach Einwilligung geladen bzw. freigeschaltet.`,
        `Marketing: steuert über Google Consent Mode Signale wie ad_storage, ad_user_data und ad_personalization. Wird nur nach Einwilligung freigeschaltet.`,
        `Externe Medien (externalMedia): Option im Consent-Banner für das Laden externer Medieninhalte. Derzeit werden nach Freigabe dieser Kategorie noch keine externen Medien-Dienste automatisch gestartet; die Einstellung wird für eine spätere Nutzung gespeichert.`,
        ],
      },
      { type: "p", text: `Sie können Ihre Auswahl jederzeit über den Link „Cookie-Einstellungen“ erneut öffnen und ändern.` },
      ],
    },
    {
      title: `9. Google Analytics`,
      blocks: [
      { type: "p", text: `Diese Website kann Google Analytics, einen Webanalysedienst von Google Ireland Limited, einsetzen, um die Nutzung der Website zu analysieren und die Plattform zu verbessern.` },
      { type: "p", text: `Google Analytics wird nur nach Ihrer vorherigen Einwilligung in die Kategorie Analyse / Analytics eingesetzt. Ohne eine erforderliche Einwilligung werden keine Google-Analytics-Cookies gesetzt und keine entsprechenden Analyse-Tags für die Messung freigeschaltet.` },
      { type: "p", text: `Dabei können insbesondere folgende Informationen verarbeitet werden:` },
      {
        type: "ul",
        items: [
        `IP-Adresse,`,
        `Browserinformationen,`,
        `Gerätetyp,`,
        `besuchte Seiten,`,
        `Nutzungsdauer,`,
        `Interaktionen mit der Website.`,
        ],
      },
      { type: "p", text: `Die Nutzung von Google Analytics erfolgt auf Grundlage Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO (Datenschutz-Grundverordnung). Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden.` },
      { type: "link", href: "https://policies.google.com/privacy", label: "https://policies.google.com/privacy", external: true },
      ],
    },
    {
      title: `10. Social-Media-Präsenzen`,
      blocks: [
      { type: "p", text: `Wir können Onlinepräsenzen in sozialen Netzwerken und Plattformen betreiben, insbesondere auf:` },
      {
        type: "ul",
        items: [
        `Instagram,`,
        `Threads,`,
        `Facebook,`,
        `TikTok,`,
        `YouTube,`,
        `Telegram.`,
        ],
      },
      { type: "p", text: `Beim Besuch unserer Social-Media-Seiten gelten zusätzlich die Datenschutzbestimmungen der jeweiligen Plattformbetreiber.` },
      ],
    },
    {
      title: `11. Kommunikation über Telegram`,
      blocks: [
      { type: "p", text: `Wir können Telegram-Gruppen, Telegram-Kanäle oder Telegram-Kommunikation zur Information über unsere Plattform sowie zur Kommunikation mit Nutzern und Spezialisten nutzen.` },
      { type: "p", text: `Bitte beachten Sie, dass bei der Nutzung von Telegram Daten durch Telegram verarbeitet werden können. Auf diese Datenverarbeitung durch Telegram haben wir keinen vollständigen Einfluss.` },
      ],
    },
    {
      title: `12. Einsatz von KI-Technologien`,
      blocks: [
      { type: "p", text: `Freuly kann Technologien der künstlichen Intelligenz zur Verbesserung der Plattformfunktionen, der Nutzererfahrung, der Qualitätssicherung oder zur Unterstützung interner Arbeitsprozesse einsetzen.` },
      { type: "p", text: `Eine ausschließlich automatisierte Entscheidungsfindung mit rechtlicher oder vergleichbar erheblicher Wirkung findet derzeit nicht statt.` },
      ],
    },
    {
      title: `13. Rechtsgrundlagen der Verarbeitung`,
      blocks: [
      { type: "p", text: `Die Verarbeitung personenbezogener Daten erfolgt je nach Zweck insbesondere auf Grundlage von:` },
      {
        type: "ul",
        items: [
        `Art. 6 Abs. 1 lit. a DSGVO, wenn eine Einwilligung erteilt wurde,`,
        `Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Durchführung vorvertraglicher oder vertraglicher Maßnahmen erforderlich ist,`,
        `Art. 6 Abs. 1 lit. c DSGVO, soweit gesetzliche Pflichten bestehen,`,
        `Art. 6 Abs. 1 lit. f DSGVO auf Grundlage berechtigter Interessen (berechtigtes Interesse) am sicheren, funktionsfähigen und wirtschaftlichen Betrieb der Plattform.`,
        ],
      },
      ],
    },
    {
      title: `14. Speicherdauer`,
      blocks: [
      { type: "p", text: `Wir speichern personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.` },
      { type: "p", text: `Wenn ein Nutzerkonto oder Spezialistenprofil gelöscht wird, werden die zugehörigen Daten gelöscht oder eingeschränkt, soweit keine gesetzlichen Pflichten oder berechtigten Gründe für eine weitere Speicherung bestehen.` },
      ],
    },
    {
      title: `15. Rechte der betroffenen Personen`,
      blocks: [
      { type: "p", text: `Sie haben im Rahmen der gesetzlichen Voraussetzungen jederzeit das Recht auf:` },
      {
        type: "ul",
        items: [
        `Auskunft über Ihre gespeicherten Daten,`,
        `Berichtigung unrichtiger Daten,`,
        `Löschung Ihrer Daten,`,
        `Einschränkung der Verarbeitung,`,
        `Datenübertragbarkeit,`,
        `Widerspruch gegen die Verarbeitung,`,
        `Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft.`,
        ],
      },
      { type: "p", text: `Hierzu können Sie uns jederzeit kontaktieren.` },
      ],
    },
    {
      title: `16. Beschwerderecht bei einer Aufsichtsbehörde`,
      blocks: [
      { type: "p", text: `Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen Datenschutzrecht verstößt.` },
      ],
    },
    {
      title: `17. Datensicherheit`,
      blocks: [
      { type: "p", text: `Wir treffen technische und organisatorische Sicherheitsmaßnahmen, um Ihre Daten vor Verlust, Manipulation oder unbefugtem Zugriff zu schützen.` },
      ],
    },
    {
      title: `18. Änderungen dieser Datenschutzerklärung`,
      blocks: [
      { type: "p", text: `Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte rechtliche Anforderungen oder technische Entwicklungen anzupassen.` },
      ],
    },
  ],
};

const ua: LegalDocument = {
  metaTitle: `Політика конфіденційності | Freuly`,
  metaDescription: `Політика конфіденційності (Datenschutzerklärung) — обробка персональних даних на freuly.de`,
  title: `Політика конфіденційності (Datenschutzerklärung)`,
  stand: `Станом на: травень 2026`,
  translationNotice: `Цей переклад надано для зручності. У разі розбіжностей визначальною є німецька версія.`,
  sections: [
    {
      title: `1. Захист даних коротко`,
      blocks: [
      { type: "p", text: `Захист ваших персональних даних для нас важливий. У цій політиці конфіденційності (Datenschutzerklärung) ми повідомляємо, які персональні дані ми обробляємо на платформі Freuly і з якою метою.` },
      { type: "p", text: `Freuly — платформа, на якій спеціалісти можуть публікувати власні профілі, а користувачі — надсилати контактні запити спеціалістам.` },
      ],
    },
    {
      title: `2. Відповідальний (Verantwortlicher)`,
      blocks: [
      { type: "p", text: `Відповідальний за обробку даних на цьому вебсайті (Verantwortlicher):` },
      { type: "p", text: `Natalia Sheshenia
Hofolpe Str. 46
57399 Kirchhundem
Deutschland` },
      {
        type: "labeledLinks",
        lines: [
          { label: `E-Mail:`, href: "mailto:freuly.de@gmail.com", value: `freuly.de@gmail.com` },
        ],
      },
      ],
    },
    {
      title: `3. Збір і обробка персональних даних`,
      blocks: [
      { type: "p", text: `Ми обробляємо персональні дані, якщо ви:` },
      {
        type: "ul",
        items: [
        `відвідуєте наш вебсайт,`,
        `створюєте профіль спеціаліста,`,
        `публікуєте зміст для профілю спеціаліста,`,
        `надсилаєте контактні запити,`,
        `спілкуєтеся з нами електронною поштою, через соціальні мережі або через Telegram.`,
        ],
      },
      { type: "p", text: `До оброблюваних даних зокрема можуть належати:` },
      {
        type: "ul",
        items: [
        `ім’я та прізвище,`,
        `адреса електронної пошти,`,
        `номер телефону,`,
        `фото профілю,`,
        `зображення портфоліо,`,
        `сертифікати та підтвердження освіти,`,
        `поштовий індекс і місто,`,
        `запропоновані послуги,`,
        `ціни,`,
        `категорії та описи діяльності,`,
        `повідомлення та зміст запитів,`,
        `технічні дані використання.`,
        ],
      },
      ],
    },
    {
      title: `4. Реєстрація спеціалістів`,
      blocks: [
      { type: "p", text: `Спеціалісти можуть створювати на Freuly профіль і публікувати зміст. Інформація, надана спеціалістами, може відображатися публічно на платформі.` },
      { type: "p", text: `До неї зокрема можуть належати ім’я, опис профілю, категорія, запропоновані послуги, ціни, місто або регіон, мови, фото, портфоліо, сертифікати та інші професійні відомості.` },
      { type: "p", text: `Публікація здійснюється добровільно відповідним спеціалістом. Спеціалісти самі відповідають за те, щоб надані ними зміст, тексти, зображення, підтвердження та відомості були правильними і не порушували права третіх осіб.` },
      ],
    },
    {
      title: `5. Контактні запити та передача даних`,
      blocks: [
      { type: "p", text: `Якщо користувачі надсилають через платформу запит спеціалісту, зазначені контактні дані та зміст запиту можуть бути передані обраному спеціалісту, щоб він міг опрацювати запит і зв’язатися.` },
      { type: "p", text: `Freuly слугує платформою для представлення профілів спеціалістів і пересилання запитів. Freuly не гарантує замовлення, договори, платежі, оцінки чи певну якість запропонованих послуг.` },
      ],
    },
    {
      title: `6. Хостинг і технічні постачальники послуг`,
      blocks: [
      { type: "p", text: `Для роботи платформи ми використовуємо зовнішніх технічних постачальників. Ці постачальники можуть обробляти персональні дані в межах своїх технічних послуг (Auftragsverarbeitung, якщо застосовно).` },
      { type: "p", text: `Хостинг і технічна інфраструктура:` },
      {
        type: "ul",
        items: [
        `Vercel Inc.`,
        `Supabase Inc.`,
        ],
      },
      { type: "p", text: `Supabase може використовуватися зокрема для автентифікації, бази даних, зберігання інформації профілів, файлів і зображень, а також технічних функцій платформи.` },
      { type: "p", text: `Vercel може використовуватися зокрема для хостингу, доставки вебсайту, технічних протоколів і функцій безпеки.` },
      ],
    },
    {
      title: `7. Технічні дані використання`,
      blocks: [
      { type: "p", text: `Під час відвідування вебсайту можуть автоматично оброблятися технічні дані. До них зокрема можуть належати:` },
      {
        type: "ul",
        items: [
        `IP-адреса,`,
        `дата і час запиту,`,
        `відвідані сторінки та файли,`,
        `тип і версія браузера,`,
        `операційна система,`,
        `Referrer-URL,`,
        `інформація про пристрій і з’єднання,`,
        `серверні та безпекові протоколи.`,
        ],
      },
      { type: "p", text: `Ці дані слугують технічній роботі, безпеці, аналізу помилок і запобіганню зловживанням.` },
      ],
    },
    {
      title: `8. Cookies та подібні технології`,
      blocks: [
      { type: "p", text: `Наш вебсайт використовує cookies та подібні технології. Через cookie-банер ви можете надати, змінити або відкликати згоду. Технічно необхідна обробка завжди активна; необов’язкові категорії застосовуються лише після вашої згоди, якщо це вимагається законом.` },
      { type: "p", text: `У налаштуваннях cookies наразі розрізняються такі категорії:` },
      {
        type: "ul",
        items: [
        `Необхідні (necessary): потрібні для базової роботи вебсайту, безпеки та збереження вашого вибору cookies. Ця категорія завжди активна.`,
        `Аналітика / Analytics (Google Analytics 4): допомагає зрозуміти, як використовується вебсайт. Завантажується або вмикається лише після згоди.`,
        `Маркетинг: через Google Consent Mode керує сигналами на кшталт ad_storage, ad_user_data та ad_personalization. Вмикається лише після згоди.`,
        `Зовнішні медіа (externalMedia): опція в consent-банері для завантаження зовнішнього медіаконтенту. Наразі після надання згоди на цю категорію жодні зовнішні медіасервіси ще не запускаються автоматично; налаштування зберігається для подальшого використання.`,
        ],
      },
      { type: "p", text: `Ви можете будь-коли знову відкрити та змінити свій вибір через посилання «Налаштування cookies».` },
      ],
    },
    {
      title: `9. Google Analytics`,
      blocks: [
      { type: "p", text: `Цей вебсайт може використовувати Google Analytics, сервіс вебаналітики Google Ireland Limited, щоб аналізувати використання сайту та покращувати платформу.` },
      { type: "p", text: `Google Analytics застосовується лише після вашої попередньої згоди на категорію «Аналітика / Analytics». Без необхідної згоди cookies Google Analytics не встановлюються, а відповідні аналітичні теги для вимірювання не активуються.` },
      { type: "p", text: `При цьому зокрема можуть оброблятися такі відомості:` },
      {
        type: "ul",
        items: [
        `IP-адреса,`,
        `інформація про браузер,`,
        `тип пристрою,`,
        `відвідані сторінки,`,
        `тривалість використання,`,
        `взаємодії з вебсайтом.`,
        ],
      },
      { type: "p", text: `Використання Google Analytics здійснюється на підставі вашої згоди згідно з Art. 6 Abs. 1 lit. a DSGVO (Datenschutz-Grundverordnung). Надану згоду можна будь-коли відкликати з дією на майбутнє.` },
      { type: "link", href: "https://policies.google.com/privacy", label: "https://policies.google.com/privacy", external: true },
      ],
    },
    {
      title: `10. Присутність у соціальних мережах`,
      blocks: [
      { type: "p", text: `Ми можемо вести онлайн-присутність у соціальних мережах і на платформах, зокрема:` },
      {
        type: "ul",
        items: [
        `Instagram,`,
        `Threads,`,
        `Facebook,`,
        `TikTok,`,
        `YouTube,`,
        `Telegram.`,
        ],
      },
      { type: "p", text: `Під час відвідування наших сторінок у соціальних мережах додатково діють політики конфіденційності відповідних операторів платформ.` },
      ],
    },
    {
      title: `11. Комунікація через Telegram`,
      blocks: [
      { type: "p", text: `Ми можемо використовувати групи Telegram, канали Telegram або спілкування в Telegram для інформування про платформу та комунікації з користувачами й спеціалістами.` },
      { type: "p", text: `Зверніть увагу: під час використання Telegram дані може обробляти Telegram. На цю обробку даних Telegram ми не маємо повного впливу.` },
      ],
    },
    {
      title: `12. Використання технологій ШІ`,
      blocks: [
      { type: "p", text: `Freuly може застосовувати технології штучного інтелекту для покращення функцій платформи, досвіду користувачів, забезпечення якості або підтримки внутрішніх робочих процесів.` },
      { type: "p", text: `Виключно автоматизоване прийняття рішень із правовими або порівнянно суттєвими наслідками наразі не здійснюється.` },
      ],
    },
    {
      title: `13. Правові підстави обробки`,
      blocks: [
      { type: "p", text: `Обробка персональних даних здійснюється залежно від мети зокрема на підставі:` },
      {
        type: "ul",
        items: [
        `Art. 6 Abs. 1 lit. a DSGVO, якщо надано згоду,`,
        `Art. 6 Abs. 1 lit. b DSGVO, якщо обробка необхідна для договірних або переддоговірних заходів,`,
        `Art. 6 Abs. 1 lit. c DSGVO, якщо існують законні обов’язки,`,
        `Art. 6 Abs. 1 lit. f DSGVO на підставі законних інтересів (berechtigtes Interesse) у безпечній, функціональній і економічно обґрунтованій роботі платформи.`,
        ],
      },
      ],
    },
    {
      title: `14. Строк зберігання`,
      blocks: [
      { type: "p", text: `Ми зберігаємо персональні дані лише стільки, скільки це потрібно для відповідних цілей або скільки вимагають законні строки зберігання.` },
      { type: "p", text: `Якщо обліковий запис користувача або профіль спеціаліста видаляється, пов’язані дані видаляються або обмежуються, якщо немає законних обов’язків чи обґрунтованих підстав для подальшого зберігання.` },
      ],
    },
    {
      title: `15. Права суб’єктів даних`,
      blocks: [
      { type: "p", text: `У межах законних умов ви будь-коли маєте право на:` },
      {
        type: "ul",
        items: [
        `доступ до збережених про вас даних,`,
        `виправлення неточних даних,`,
        `видалення ваших даних,`,
        `обмеження обробки,`,
        `перенесення даних,`,
        `заперечення проти обробки,`,
        `відкликання наданих згод з дією на майбутнє.`,
        ],
      },
      { type: "p", text: `Для цього ви можете будь-коли звернутися до нас.` },
      ],
    },
    {
      title: `16. Право на скаргу до наглядового органу`,
      blocks: [
      { type: "p", text: `Ви маєте право подати скаргу до органу з захисту даних, якщо вважаєте, що обробка ваших персональних даних порушує право захисту даних.` },
      ],
    },
    {
      title: `17. Безпека даних`,
      blocks: [
      { type: "p", text: `Ми вживаємо технічних і організаційних заходів безпеки, щоб захистити ваші дані від втрати, маніпуляцій або несанкціонованого доступу.` },
      ],
    },
    {
      title: `18. Зміни цієї політики конфіденційності`,
      blocks: [
      { type: "p", text: `Ми залишаємо за собою право адаптувати цю політику конфіденційності (Datenschutzerklärung), щоб привести її у відповідність до змінених правових вимог або технічного розвитку.` },
      ],
    },
  ],
};

const ru: LegalDocument = {
  metaTitle: `Политика конфиденциальности | Freuly`,
  metaDescription: `Политика конфиденциальности (Datenschutzerklärung) — обработка персональных данных на freuly.de`,
  title: `Политика конфиденциальности (Datenschutzerklärung)`,
  stand: `По состоянию на: май 2026`,
  translationNotice: `Этот перевод предоставлен для удобства. В случае расхождений определяющей является немецкая версия.`,
  sections: [
    {
      title: `1. Защита данных кратко`,
      blocks: [
      { type: "p", text: `Защита ваших персональных данных для нас важна. В настоящей политике конфиденциальности (Datenschutzerklärung) мы сообщаем, какие персональные данные мы обрабатываем на платформе Freuly и с какими целями.` },
      { type: "p", text: `Freuly — платформа, на которой специалисты могут публиковать собственные профили, а пользователи — направлять специалистам контактные запросы.` },
      ],
    },
    {
      title: `2. Ответственный (Verantwortlicher)`,
      blocks: [
      { type: "p", text: `Ответственный за обработку данных на этом веб-сайте (Verantwortlicher):` },
      { type: "p", text: `Natalia Sheshenia
Hofolpe Str. 46
57399 Kirchhundem
Deutschland` },
      {
        type: "labeledLinks",
        lines: [
          { label: `E-Mail:`, href: "mailto:freuly.de@gmail.com", value: `freuly.de@gmail.com` },
        ],
      },
      ],
    },
    {
      title: `3. Сбор и обработка персональных данных`,
      blocks: [
      { type: "p", text: `Мы обрабатываем персональные данные, если вы:` },
      {
        type: "ul",
        items: [
        `посещаете наш веб-сайт,`,
        `создаёте профиль специалиста,`,
        `публикуете содержание для профиля специалиста,`,
        `направляете контактные запросы,`,
        `связываетесь с нами по электронной почте, через социальные сети или через Telegram.`,
        ],
      },
      { type: "p", text: `К обрабатываемым данным в частности могут относиться:` },
      {
        type: "ul",
        items: [
        `имя и фамилия,`,
        `адрес электронной почты,`,
        `номер телефона,`,
        `фото профиля,`,
        `изображения портфолио,`,
        `сертификаты и подтверждения образования,`,
        `почтовый индекс и город,`,
        `предлагаемые услуги,`,
        `цены,`,
        `категории и описания деятельности,`,
        `сообщения и содержание запросов,`,
        `технические данные использования.`,
        ],
      },
      ],
    },
    {
      title: `4. Регистрация специалистов`,
      blocks: [
      { type: "p", text: `Специалисты могут создавать на Freuly профиль и публиковать содержание. Информация, предоставленная специалистами, может отображаться публично на платформе.` },
      { type: "p", text: `К ней в частности могут относиться имя, описание профиля, категория, предлагаемые услуги, цены, город или регион, языки, фото, портфолио, сертификаты и иные профессиональные сведения.` },
      { type: "p", text: `Публикация осуществляется добровольно соответствующим специалистом. Специалисты сами отвечают за то, чтобы предоставленные ими содержание, тексты, изображения, подтверждения и сведения были корректными и не нарушали права третьих лиц.` },
      ],
    },
    {
      title: `5. Контактные запросы и передача данных`,
      blocks: [
      { type: "p", text: `Если пользователи направляют через платформу запрос специалисту, указанные контактные данные и содержание запроса могут быть переданы выбранному специалисту, чтобы он мог обработать запрос и связаться.` },
      { type: "p", text: `Freuly служит платформой для представления профилей специалистов и пересылки запросов. Freuly не гарантирует заказы, договоры, платежи, оценки или определённое качество предлагаемых услуг.` },
      ],
    },
    {
      title: `6. Хостинг и технические поставщики услуг`,
      blocks: [
      { type: "p", text: `Для работы платформы мы используем внешних технических поставщиков. Эти поставщики могут обрабатывать персональные данные в рамках своих технических услуг (Auftragsverarbeitung, если применимо).` },
      { type: "p", text: `Хостинг и техническая инфраструктура:` },
      {
        type: "ul",
        items: [
        `Vercel Inc.`,
        `Supabase Inc.`,
        ],
      },
      { type: "p", text: `Supabase может использоваться в частности для аутентификации, базы данных, хранения информации профилей, файлов и изображений, а также технических функций платформы.` },
      { type: "p", text: `Vercel может использоваться в частности для хостинга, доставки веб-сайта, технических протоколов и функций безопасности.` },
      ],
    },
    {
      title: `7. Технические данные использования`,
      blocks: [
      { type: "p", text: `При посещении веб-сайта могут автоматически обрабатываться технические данные. К ним в частности могут относиться:` },
      {
        type: "ul",
        items: [
        `IP-адрес,`,
        `дата и время запроса,`,
        `посещённые страницы и файлы,`,
        `тип и версия браузера,`,
        `операционная система,`,
        `Referrer-URL,`,
        `информация об устройстве и соединении,`,
        `серверные и протоколы безопасности.`,
        ],
      },
      { type: "p", text: `Эти данные служат технической работе, безопасности, анализу ошибок и предотвращению злоупотреблений.` },
      ],
    },
    {
      title: `8. Cookies и подобные технологии`,
      blocks: [
      { type: "p", text: `Наш веб-сайт использует cookies и подобные технологии. Через cookie-баннер вы можете дать, изменить или отозвать согласие. Технически необходимая обработка всегда активна; необязательные категории применяются только после вашего согласия, если это требуется законом.` },
      { type: "p", text: `В настройках cookies в настоящее время различаются следующие категории:` },
      {
        type: "ul",
        items: [
        `Необходимые (necessary): нужны для базовой работы веб-сайта, безопасности и сохранения вашего выбора cookies. Эта категория всегда активна.`,
        `Аналитика / Analytics (Google Analytics 4): помогает понять, как используется веб-сайт. Загружается или включается только после согласия.`,
        `Маркетинг: через Google Consent Mode управляет сигналами вроде ad_storage, ad_user_data и ad_personalization. Включается только после согласия.`,
        `Внешние медиа (externalMedia): опция в consent-баннере для загрузки внешнего медиаконтента. В настоящее время после согласия на эту категорию никакие внешние медиасервисы ещё не запускаются автоматически; настройка сохраняется для последующего использования.`,
        ],
      },
      { type: "p", text: `Вы можете в любое время снова открыть и изменить свой выбор по ссылке «Настройки cookies».` },
      ],
    },
    {
      title: `9. Google Analytics`,
      blocks: [
      { type: "p", text: `Этот веб-сайт может использовать Google Analytics, сервис вебаналитики Google Ireland Limited, чтобы анализировать использование сайта и улучшать платформу.` },
      { type: "p", text: `Google Analytics применяется только после вашего предварительного согласия на категорию «Аналитика / Analytics». Без необходимого согласия cookies Google Analytics не устанавливаются, а соответствующие аналитические теги для измерения не активируются.` },
      { type: "p", text: `При этом в частности могут обрабатываться следующие сведения:` },
      {
        type: "ul",
        items: [
        `IP-адрес,`,
        `информация о браузере,`,
        `тип устройства,`,
        `посещённые страницы,`,
        `длительность использования,`,
        `взаимодействия с веб-сайтом.`,
        ],
      },
      { type: "p", text: `Использование Google Analytics осуществляется на основании вашего согласия согласно Art. 6 Abs. 1 lit. a DSGVO (Datenschutz-Grundverordnung). Данное согласие можно в любое время отозвать с действием на будущее.` },
      { type: "link", href: "https://policies.google.com/privacy", label: "https://policies.google.com/privacy", external: true },
      ],
    },
    {
      title: `10. Присутствие в социальных сетях`,
      blocks: [
      { type: "p", text: `Мы можем вести онлайн-присутствие в социальных сетях и на платформах, в частности:` },
      {
        type: "ul",
        items: [
        `Instagram,`,
        `Threads,`,
        `Facebook,`,
        `TikTok,`,
        `YouTube,`,
        `Telegram.`,
        ],
      },
      { type: "p", text: `При посещении наших страниц в социальных сетях дополнительно действуют политики конфиденциальности соответствующих операторов платформ.` },
      ],
    },
    {
      title: `11. Коммуникация через Telegram`,
      blocks: [
      { type: "p", text: `Мы можем использовать группы Telegram, каналы Telegram или общение в Telegram для информирования о платформе и коммуникации с пользователями и специалистами.` },
      { type: "p", text: `Обратите внимание: при использовании Telegram данные может обрабатывать Telegram. На эту обработку данных Telegram мы не имеем полного влияния.` },
      ],
    },
    {
      title: `12. Использование технологий ИИ`,
      blocks: [
      { type: "p", text: `Freuly может применять технологии искусственного интеллекта для улучшения функций платформы, пользовательского опыта, обеспечения качества или поддержки внутренних рабочих процессов.` },
      { type: "p", text: `Исключительно автоматизированное принятие решений с правовыми или сопоставимо существенными последствиями в настоящее время не осуществляется.` },
      ],
    },
    {
      title: `13. Правовые основания обработки`,
      blocks: [
      { type: "p", text: `Обработка персональных данных осуществляется в зависимости от цели в частности на основании:` },
      {
        type: "ul",
        items: [
        `Art. 6 Abs. 1 lit. a DSGVO, если дано согласие,`,
        `Art. 6 Abs. 1 lit. b DSGVO, если обработка необходима для договорных или преддоговорных мер,`,
        `Art. 6 Abs. 1 lit. c DSGVO, если существуют законные обязанности,`,
        `Art. 6 Abs. 1 lit. f DSGVO на основании законных интересов (berechtigtes Interesse) в безопасной, функциональной и экономически обоснованной работе платформы.`,
        ],
      },
      ],
    },
    {
      title: `14. Срок хранения`,
      blocks: [
      { type: "p", text: `Мы храним персональные данные только столько, сколько это необходимо для соответствующих целей или сколько требуют законные сроки хранения.` },
      { type: "p", text: `Если учётная запись пользователя или профиль специалиста удаляется, связанные данные удаляются или ограничиваются, если нет законных обязанностей или обоснованных оснований для дальнейшего хранения.` },
      ],
    },
    {
      title: `15. Права субъектов данных`,
      blocks: [
      { type: "p", text: `В рамках законных условий вы в любое время имеете право на:` },
      {
        type: "ul",
        items: [
        `доступ к сохранённым о вас данным,`,
        `исправление неточных данных,`,
        `удаление ваших данных,`,
        `ограничение обработки,`,
        `переносимость данных,`,
        `возражение против обработки,`,
        `отзыв данных согласий с действием на будущее.`,
        ],
      },
      { type: "p", text: `Для этого вы можете в любое время связаться с нами.` },
      ],
    },
    {
      title: `16. Право на жалобу в надзорный орган`,
      blocks: [
      { type: "p", text: `Вы имеете право подать жалобу в орган по защите данных, если считаете, что обработка ваших персональных данных нарушает право защиты данных.` },
      ],
    },
    {
      title: `17. Безопасность данных`,
      blocks: [
      { type: "p", text: `Мы принимаем технические и организационные меры безопасности, чтобы защитить ваши данные от утраты, манипуляций или несанкционированного доступа.` },
      ],
    },
    {
      title: `18. Изменения настоящей политики конфиденциальности`,
      blocks: [
      { type: "p", text: `Мы оставляем за собой право адаптировать настоящую политику конфиденциальности (Datenschutzerklärung), чтобы привести её в соответствие с изменившимися правовыми требованиями или техническим развитием.` },
      ],
    },
  ],
};

const en: LegalDocument = {
  metaTitle: `Privacy policy | Freuly`,
  metaDescription: `Privacy policy (Datenschutzerklärung) – information on personal data processing on freuly.de`,
  title: `Privacy policy (Datenschutzerklärung)`,
  stand: `Last updated: May 2026`,
  translationNotice: `This translation is provided for convenience. In the event of discrepancies, the German version shall prevail.`,
  sections: [
    {
      title: `1. Privacy at a glance`,
      blocks: [
      { type: "p", text: `Protecting your personal data is important to us. In this privacy policy (Datenschutzerklärung) we explain which personal data we process on the Freuly platform and for which purposes.` },
      { type: "p", text: `Freuly is a platform on which specialists can publish their own profiles and users can send contact requests to specialists.` },
      ],
    },
    {
      title: `2. Controller (Verantwortlicher)`,
      blocks: [
      { type: "p", text: `Controller responsible for data processing on this website (Verantwortlicher):` },
      { type: "p", text: `Natalia Sheshenia
Hofolpe Str. 46
57399 Kirchhundem
Germany` },
      {
        type: "labeledLinks",
        lines: [
          { label: `Email:`, href: "mailto:freuly.de@gmail.com", value: `freuly.de@gmail.com` },
        ],
      },
      ],
    },
    {
      title: `3. Collection and processing of personal data`,
      blocks: [
      { type: "p", text: `We process personal data when you:` },
      {
        type: "ul",
        items: [
        `visit our website,`,
        `create a specialist profile,`,
        `publish content for a specialist profile,`,
        `send contact requests,`,
        `communicate with us by email, via social networks or via Telegram.`,
        ],
      },
      { type: "p", text: `The data processed may include in particular:` },
      {
        type: "ul",
        items: [
        `first name and last name,`,
        `email address,`,
        `phone number,`,
        `profile photo,`,
        `portfolio images,`,
        `certificates and proof of training,`,
        `postal code and city,`,
        `services offered,`,
        `prices,`,
        `categories and activity descriptions,`,
        `messages and request content,`,
        `technical usage data.`,
        ],
      },
      ],
    },
    {
      title: `4. Registration of specialists`,
      blocks: [
      { type: "p", text: `Specialists can create a profile on Freuly and publish content. Information provided by specialists may be displayed publicly on the platform.` },
      { type: "p", text: `This may include in particular name, profile description, category, services offered, prices, city or region, languages, photos, portfolio content, certificates and other professional details.` },
      { type: "p", text: `Publication is voluntary by the respective specialist. Specialists themselves are responsible for ensuring that the content, texts, images, evidence and details they provide are accurate and do not infringe third-party rights.` },
      ],
    },
    {
      title: `5. Contact requests and disclosure of data`,
      blocks: [
      { type: "p", text: `When users send a request to a specialist via the platform, the contact details provided and the content of the request may be forwarded to the selected specialist so that they can process the request and make contact.` },
      { type: "p", text: `Freuly serves as a platform for presenting specialist profiles and forwarding requests. Freuly does not guarantee assignments, contracts, payments, ratings or any particular quality of the services offered.` },
      ],
    },
    {
      title: `6. Hosting and technical service providers`,
      blocks: [
      { type: "p", text: `To operate the platform we use external technical service providers. These providers may process personal data in the course of their technical services (Auftragsverarbeitung, where applicable).` },
      { type: "p", text: `Hosting and technical infrastructure:` },
      {
        type: "ul",
        items: [
        `Vercel Inc.`,
        `Supabase Inc.`,
        ],
      },
      { type: "p", text: `Supabase may be used in particular for authentication, database, storage of profile information, files and images, and technical platform functions.` },
      { type: "p", text: `Vercel may be used in particular for hosting, website delivery, technical logs and security functions.` },
      ],
    },
    {
      title: `7. Technical usage data`,
      blocks: [
      { type: "p", text: `When you visit the website, technical data may be processed automatically. This may include in particular:` },
      {
        type: "ul",
        items: [
        `IP address,`,
        `date and time of the request,`,
        `pages and files accessed,`,
        `browser type and version,`,
        `operating system used,`,
        `referrer URL,`,
        `device and connection information,`,
        `server and security logs.`,
        ],
      },
      { type: "p", text: `This data serves technical operation, security, error analysis and abuse prevention.` },
      ],
    },
    {
      title: `8. Cookies and similar technologies`,
      blocks: [
      { type: "p", text: `Our website uses cookies and similar technologies. Via the cookie banner you can give, adjust or withdraw your consent. Technically necessary processing is always active; optional categories are used only after your consent where legally required.` },
      { type: "p", text: `Cookie settings currently distinguish the following categories:` },
      {
        type: "ul",
        items: [
        `Necessary: required for basic website operation, security and storing your cookie choices. This category is always active.`,
        `Analytics (Google Analytics 4): helps us understand how the website is used. Loaded or enabled only after consent.`,
        `Marketing: via Google Consent Mode controls signals such as ad_storage, ad_user_data and ad_personalization. Enabled only after consent.`,
        `External media: an option in the consent banner for loading external media content. At present, after consent for this category no external media services are started automatically yet; the setting is stored for later use.`,
        ],
      },
      { type: "p", text: `You can reopen and change your choices at any time via the “Cookie settings” link.` },
      ],
    },
    {
      title: `9. Google Analytics`,
      blocks: [
      { type: "p", text: `This website may use Google Analytics, a web analytics service of Google Ireland Limited, to analyse website usage and improve the platform.` },
      { type: "p", text: `Google Analytics is used only after your prior consent to the Analytics category. Without the required consent, Google Analytics cookies are not set and corresponding analytics tags are not enabled for measurement.` },
      { type: "p", text: `In particular, the following information may be processed:` },
      {
        type: "ul",
        items: [
        `IP address,`,
        `browser information,`,
        `device type,`,
        `pages visited,`,
        `duration of use,`,
        `interactions with the website.`,
        ],
      },
      { type: "p", text: `Google Analytics is used on the basis of your consent pursuant to Art. 6 Abs. 1 lit. a DSGVO (General Data Protection Regulation). Consent given may be withdrawn at any time with effect for the future.` },
      { type: "link", href: "https://policies.google.com/privacy", label: "https://policies.google.com/privacy", external: true },
      ],
    },
    {
      title: `10. Social media presence`,
      blocks: [
      { type: "p", text: `We may maintain online presences on social networks and platforms, in particular:` },
      {
        type: "ul",
        items: [
        `Instagram,`,
        `Threads,`,
        `Facebook,`,
        `TikTok,`,
        `YouTube,`,
        `Telegram.`,
        ],
      },
      { type: "p", text: `When visiting our social media pages, the privacy policies of the respective platform operators also apply.` },
      ],
    },
    {
      title: `11. Communication via Telegram`,
      blocks: [
      { type: "p", text: `We may use Telegram groups, Telegram channels or Telegram communication to provide information about our platform and to communicate with users and specialists.` },
      { type: "p", text: `Please note that when using Telegram, data may be processed by Telegram. We do not have full control over this processing by Telegram.` },
      ],
    },
    {
      title: `12. Use of AI technologies`,
      blocks: [
      { type: "p", text: `Freuly may use artificial intelligence technologies to improve platform functions, user experience, quality assurance or to support internal workflows.` },
      { type: "p", text: `Fully automated decision-making with legal or similarly significant effects does not currently take place.` },
      ],
    },
    {
      title: `13. Legal bases for processing`,
      blocks: [
      { type: "p", text: `Personal data is processed depending on the purpose in particular on the basis of:` },
      {
        type: "ul",
        items: [
        `Art. 6 Abs. 1 lit. a DSGVO where consent has been given,`,
        `Art. 6 Abs. 1 lit. b DSGVO where processing is necessary for pre-contractual or contractual measures,`,
        `Art. 6 Abs. 1 lit. c DSGVO where legal obligations exist,`,
        `Art. 6 Abs. 1 lit. f DSGVO on the basis of legitimate interests (berechtigtes Interesse) in the secure, functional and economically viable operation of the platform.`,
        ],
      },
      ],
    },
    {
      title: `14. Storage period`,
      blocks: [
      { type: "p", text: `We store personal data only as long as necessary for the respective purposes or as required by statutory retention obligations.` },
      { type: "p", text: `If a user account or specialist profile is deleted, related data is deleted or restricted unless legal obligations or legitimate grounds for further storage exist.` },
      ],
    },
    {
      title: `15. Rights of data subjects`,
      blocks: [
      { type: "p", text: `Within the statutory requirements you have the right at any time to:` },
      {
        type: "ul",
        items: [
        `access to your stored data,`,
        `rectification of inaccurate data,`,
        `erasure of your data,`,
        `restriction of processing,`,
        `data portability,`,
        `object to processing,`,
        `withdraw consents given with effect for the future.`,
        ],
      },
      { type: "p", text: `You may contact us at any time for this purpose.` },
      ],
    },
    {
      title: `16. Right to lodge a complaint with a supervisory authority`,
      blocks: [
      { type: "p", text: `You have the right to lodge a complaint with a data protection supervisory authority if you consider that the processing of your personal data infringes data protection law.` },
      ],
    },
    {
      title: `17. Data security`,
      blocks: [
      { type: "p", text: `We take technical and organisational security measures to protect your data against loss, manipulation or unauthorised access.` },
      ],
    },
    {
      title: `18. Changes to this privacy policy`,
      blocks: [
      { type: "p", text: `We reserve the right to adapt this privacy policy (Datenschutzerklärung) to changed legal requirements or technical developments.` },
      ],
    },
  ],
};

export const DATENSCHUTZ_BY_LANG: Record<LegalContentLang, LegalDocument> = {
  de,
  ua,
  ru,
  en,
};

export function getDatenschutzDocument(lang: LegalContentLang): LegalDocument {
  return DATENSCHUTZ_BY_LANG[lang];
}
