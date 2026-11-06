import type { Lang } from "@/lib/i18n";
import { FOR_SPECIALISTS_COPY, type ForSpecialistsCopy } from "./copy";
import { ONE_OFF_REQUEST_ACCESS_LINE, SPECIALIST_FREE_ENTRY_LINE } from "@/lib/commercial/freeEntryPositioning";

/**
 * Current commercial positioning for the free-entry model.
 *
 * Base copy is kept for stable long-form sections. This layer overrides every
 * section that previously implied a paid profile/publication requirement.
 */
const OVERRIDES: Record<Lang, Partial<ForSpecialistsCopy>> = {
  ru: {
    meta: {
      title: "Бесплатный профиль и клиентские заявки — Freuly для специалистов",
      description:
        "Создайте и опубликуйте профиль специалиста на Freuly бесплатно. Получайте подходящие запросы клиентов и открывайте конкретные заявки отдельно или подключите Professional.",
    },
    hero: {
      eyebrow: "Freuly для специалистов в Германии",
      headline: "Создайте профиль бесплатно. Платите только за доступ к клиентскому спросу",
      sub:
        "Бесплатный профиль нужен, чтобы клиенты могли найти и выбрать вас, а Freuly — понимать, какие запросы вам подходят. Когда появляется интересная заявка, вы сами решаете: открыть её разово от 20 € или использовать Professional за 29 €/мес.",
      cta: "Создать профиль бесплатно",
      secondaryCta: "Как это работает",
      note: SPECIALIST_FREE_ENTRY_LINE.ru,
    },
    proof: [
      {
        value: "0 €",
        title: "за профиль",
        body: "Профиль — бесплатно. Доступ к заявкам — отдельно за заявку или по тарифу от 29 €/мес.",
      },
      {
        value: "5 минут",
        title: "до старта профиля",
        body: "Профиль бесплатный, готов за 5 минут: заполните основные данные и опубликуйте его для клиентов.",
      },
      {
        value: "0%",
        title: "комиссии с заказа",
        body: "После контакта вы сами договариваетесь с клиентом о цене и условиях работы.",
      },
    ],
    steps: {
      title: "Как специалист работает с Freuly",
      items: [
        {
          number: "01",
          title: "Создайте профиль бесплатно",
          body:
            "Профиль делает вас видимым в поиске Freuly и даёт системе данные для подбора релевантных запросов: услуги, цены, языки, город или онлайн-формат.",
        },
        {
          number: "02",
          title: "Смотрите подходящие запросы",
          body:
            "Если клиент выбрал вас или Freuly нашёл совпадение, вы получаете безопасное превью заявки без контактов клиента. На этом этапе платить не нужно.",
        },
        {
          number: "03",
          title: "Выберите способ открыть контакт",
          body:
            "Разовый доступ к конкретной заявке — от 20 € и доступен зарегистрированному специалисту. Professional за 29 €/мес. даёт доступ к предложенным вам подходящим заявкам в оплаченный период без отдельной оплаты за каждую. Количество заявок зависит от реального спроса и совпадения с профилем.",
        },
      ],
    },
    seo: {
      title: "Не платите за сам факт присутствия — подключайтесь к реальному спросу",
      intro:
        "Публичный профиль помогает клиенту понять, подходите ли вы ему. Платная часть Freuly начинается тогда, когда вам нужен доступ к конкретному клиентскому запросу или постоянный доступ к каналу заявок по тарифу.",
    },
    offer: {
      title: "Что получает специалист",
      intro:
        "Бесплатная точка входа плюс выбор модели работы с заявками: без обязательной подписки или с тарифом для регулярного доступа.",
      bullets: [
        "Публичный профиль специалиста: услуги, цены, языки, город, фото, описание и доступные подтверждающие материалы.",
        "Поиск по категории, языку, формату и локации помогает клиентам находить подходящие профили.",
        "Уведомления о подходящих обращениях и безопасное превью до открытия контакта.",
        ONE_OFF_REQUEST_ACCESS_LINE.ru,
        "Professional/Growth — альтернатива разовым покупкам: доступ к заявкам в рамках тарифа плюс дополнительные возможности представления профиля.",
        "0% комиссии с договора между вами и клиентом.",
      ],
      caption: "Профиль — бесплатно. Клиентский контакт — по вашему выбору: заявка или тариф.",
    },
    faq: {
      title: "Частые вопросы",
      items: [
        {
          q: "Зачем мне бесплатный профиль, если контакты заявок платные?",
          a: "Профиль нужен не только для размещения. Клиенты могут найти и выбрать вас напрямую, а Freuly использует услуги, языки, формат работы и географию профиля, чтобы предлагать вам релевантные заявки. Так вы можете сначала увидеть спрос на свои услуги и только потом решать, нужен ли платный доступ к конкретному контакту.",
        },
        {
          q: "Нужно ли платить, чтобы опубликовать профиль?",
          a: "Нет. Регистрация, заполнение и публикация базового профиля не требуют Professional или Growth.",
        },
        {
          q: "Можно ли купить одну заявку без регистрации?",
          a: "Нет. Доступ к заявкам предоставляется зарегистрированным специалистам. Профиль нужен, чтобы Freuly понимал вашу специализацию и мог предложить вам подходящий запрос, а клиентские контакты не продавались случайным пользователям.",
        },
        {
          q: "За что тогда платит специалист?",
          a: `Платная часть — доступ к контактам подходящих клиентских заявок. ${ONE_OFF_REQUEST_ACCESS_LINE.ru} Professional/Growth дают доступ к заявкам в рамках тарифа.`,
        },
        {
          q: "Обязательно ли покупать тариф 29 €?",
          a: "Нет. Если заявки нужны эпизодически, можно открывать конкретные подходящие обращения разово от 20 €. Professional — вариант для регулярной работы: в оплаченный период вы не платите отдельно за каждую подходящую заявку, предложенную вам Freuly.",
        },
        {
          q: "Сколько заявок входит в Professional?",
          a: "Фиксированного лимита вида «5 или 10 заявок в месяц» нет. В рамках оплаченного периода Professional открывает контакты подходящих заявок, которые Freuly предлагает именно вам, без отдельной оплаты за каждую. При этом Freuly не гарантирует определённое количество заявок: оно зависит от спроса, вашей категории, языка, географии и других параметров совпадения.",
        },
        {
          q: "Вы гарантируете клиентов?",
          a: "Нет. Freuly привлекает и распределяет клиентский спрос, но решение клиента зависит от услуги, цены, профиля, доступности, скорости ответа и других факторов.",
        },
        {
          q: "Почему это выгоднее, чем самому запускать рекламу?",
          a: "Самостоятельная реклама и тесты могут требовать сотен евро ещё до первой заявки. На Freuly профиль публикуется бесплатно; отдельную заявку можно открыть от 20 €, Professional стоит 29 €/мес., Growth — 59 €/мес.",
        },
        {
          q: "Если у меня уже есть Instagram, Telegram или сарафан, зачем мне Freuly?",
          a: "Соцсети работают на вашу аудиторию, а Freuly закрывает другой сценарий: человек уже ищет услугу по категории, языку и локации. Это дополнительный канал, а не замена вашим собственным каналам.",
        },
      ],
    },
    finalCta: {
      headline: "Создайте профиль бесплатно и подключайтесь к клиентскому спросу",
      body:
        "Сначала покажите клиентам, кто вы и чем можете помочь. Платить за тариф заранее не обязательно.",
      button: "Создать бесплатный профиль",
    },
  },
  ua: {
    meta: {
      title: "Безкоштовний профіль і клієнтські запити — Freuly для спеціалістів",
      description:
        "Створіть і опублікуйте профіль спеціаліста на Freuly безкоштовно. Отримуйте відповідні запити клієнтів і відкривайте окремі запити або підключіть Professional.",
    },
    hero: {
      eyebrow: "Freuly для спеціалістів у Німеччині",
      headline: "Створіть профіль безкоштовно. Платіть лише за доступ до клієнтського попиту",
      sub:
        "Безкоштовний профіль потрібен, щоб клієнти могли знайти й обрати вас, а Freuly — розуміти, які запити вам підходять. Коли з’являється цікавий запит, ви самі вирішуєте: відкрити його разово від 20 € або використовувати Professional за 29 €/міс.",
      cta: "Створити профіль безкоштовно",
      secondaryCta: "Як це працює",
      note: SPECIALIST_FREE_ENTRY_LINE.ua,
    },
    proof: [
      {
        value: "0 €",
        title: "за профіль",
        body: "Профіль — безкоштовно. Доступ до запитів — окремо за запит або за тарифом від 29 €/міс.",
      },
      {
        value: "5 хвилин",
        title: "до старту профілю",
        body: "Профіль безкоштовний і готовий за 5 хвилин: заповніть основні дані та опублікуйте його для клієнтів.",
      },
      {
        value: "0%",
        title: "комісії із замовлення",
        body: "Після контакту ви самі узгоджуєте з клієнтом ціну та умови роботи.",
      },
    ],
    steps: {
      title: "Як спеціаліст працює з Freuly",
      items: [
        {
          number: "01",
          title: "Створіть профіль безкоштовно",
          body:
            "Профіль робить вас видимими в пошуку Freuly і дає системі дані для підбору релевантних запитів: послуги, ціни, мови, місто або онлайн-формат.",
        },
        {
          number: "02",
          title: "Переглядайте відповідні запити",
          body:
            "Якщо клієнт обрав вас або Freuly знайшов збіг, ви отримуєте безпечне прев’ю запиту без контактів клієнта. На цьому етапі платити не потрібно.",
        },
        {
          number: "03",
          title: "Оберіть спосіб відкрити контакт",
          body:
            "Разовий доступ до конкретного запиту — від 20 € і доступний зареєстрованому спеціалісту. Professional за 29 €/міс. дає доступ до запропонованих вам відповідних запитів в оплачений період без окремої оплати за кожен. Кількість запитів залежить від реального попиту та збігу з профілем.",
        },
      ],
    },
    seo: {
      title: "Не платіть за сам факт присутності — підключайтеся до реального попиту",
      intro:
        "Публічний профіль допомагає клієнту зрозуміти, чи підходите ви. Платна частина Freuly починається тоді, коли вам потрібен доступ до конкретного клієнтського запиту або постійний доступ до каналу запитів за тарифом.",
    },
    offer: {
      title: "Що отримує спеціаліст",
      intro:
        "Безкоштовна точка входу плюс вибір моделі роботи із запитами: без обов’язкової підписки або з тарифом для регулярного доступу.",
      bullets: [
        "Публічний профіль спеціаліста: послуги, ціни, мови, місто, фото, опис і доступні підтверджувальні матеріали.",
        "Пошук за категорією, мовою, форматом і локацією допомагає клієнтам знаходити відповідні профілі.",
        "Сповіщення про відповідні звернення та безпечне прев’ю до відкриття контакту.",
        ONE_OFF_REQUEST_ACCESS_LINE.ua,
        "Professional/Growth — альтернатива разовим покупкам: доступ до запитів у межах тарифу плюс додаткові можливості представлення профілю.",
        "0% комісії з договору між вами та клієнтом.",
      ],
      caption: "Профіль — безкоштовно. Контакт клієнта — на ваш вибір: запит або тариф.",
    },
    faq: {
      title: "Поширені запитання",
      items: [
        {
          q: "Навіщо мені безкоштовний профіль, якщо контакти запитів платні?",
          a: "Профіль потрібен не лише для розміщення. Клієнти можуть знайти й обрати вас напряму, а Freuly використовує послуги, мови, формат роботи та географію профілю, щоб пропонувати вам релевантні запити. Так ви можете спочатку побачити попит на свої послуги і лише потім вирішувати, чи потрібен платний доступ до конкретного контакту.",
        },
        {
          q: "Чи потрібно платити, щоб опублікувати профіль?",
          a: "Ні. Реєстрація, заповнення та публікація базового профілю не потребують Professional або Growth.",
        },
        {
          q: "Чи можна купити один запит без реєстрації?",
          a: "Ні. Доступ до запитів надається зареєстрованим спеціалістам. Профіль потрібен, щоб Freuly розумів вашу спеціалізацію та міг запропонувати відповідний запит, а контакти клієнтів не продавалися випадковим користувачам.",
        },
        {
          q: "За що тоді платить спеціаліст?",
          a: `Платна частина — доступ до контактів відповідних клієнтських запитів. ${ONE_OFF_REQUEST_ACCESS_LINE.ua} Professional/Growth дають доступ до запитів у межах тарифу.`,
        },
        {
          q: "Чи обов’язково купувати тариф 29 €?",
          a: "Ні. Якщо запити потрібні епізодично, можна відкривати конкретні відповідні звернення разово від 20 €. Professional — варіант для регулярної роботи: в оплачений період ви не платите окремо за кожен відповідний запит, запропонований вам Freuly.",
        },
        {
          q: "Скільки запитів входить у Professional?",
          a: "Фіксованого ліміту на кшталт «5 або 10 запитів на місяць» немає. У межах оплаченого періоду Professional відкриває контакти відповідних запитів, які Freuly пропонує саме вам, без окремої оплати за кожен. Водночас Freuly не гарантує певної кількості запитів: вона залежить від попиту, категорії, мови, географії та інших параметрів збігу.",
        },
        {
          q: "Ви гарантуєте клієнтів?",
          a: "Ні. Freuly залучає та розподіляє клієнтський попит, але рішення клієнта залежить від послуги, ціни, профілю, доступності, швидкості відповіді та інших факторів.",
        },
        {
          q: "Чому це може бути вигідніше, ніж самостійно запускати рекламу?",
          a: "Самостійна реклама й тести можуть потребувати сотень євро ще до першого запиту. На Freuly профіль публікується безкоштовно; окремий запит можна відкрити від 20 €, Professional коштує 29 €/міс., Growth — 59 €/міс.",
        },
        {
          q: "Якщо в мене вже є Instagram, Telegram або рекомендації, навіщо Freuly?",
          a: "Соцмережі працюють на вашу аудиторію, а Freuly закриває інший сценарій: людина вже шукає послугу за категорією, мовою та локацією. Це додатковий канал, а не заміна вашим власним каналам.",
        },
      ],
    },
    finalCta: {
      headline: "Створіть профіль безкоштовно та підключайтеся до клієнтського попиту",
      body:
        "Спочатку покажіть клієнтам, хто ви і чим можете допомогти. Платити за тариф заздалегідь не обов’язково.",
      button: "Створити безкоштовний профіль",
    },
  },
  de: {
    meta: {
      title: "Kostenloses Profil und Kundenanfragen — Freuly für Spezialisten",
      description:
        "Erstellen und veröffentlichen Sie Ihr Spezialistenprofil auf Freuly kostenlos. Erhalten Sie passende Kundenanfragen und schalten Sie einzelne Anfragen frei oder nutzen Sie Professional.",
    },
    hero: {
      eyebrow: "Freuly für Spezialisten in Deutschland",
      headline: "Profil kostenlos veröffentlichen. Für Zugang zu Kundennachfrage zahlen",
      sub:
        "Das kostenlose Profil sorgt dafür, dass Kunden Sie finden und auswählen können und Freuly passende Anfragen zuordnen kann. Bei einer interessanten Anfrage entscheiden Sie selbst: einmalig ab 20 € freischalten oder Professional für 29 €/Monat nutzen.",
      cta: "Kostenloses Profil erstellen",
      secondaryCta: "So funktioniert es",
      note: SPECIALIST_FREE_ENTRY_LINE.de,
    },
    proof: [
      {
        value: "0 €",
        title: "für das Profil",
        body: "Profil kostenlos. Anfragezugang einzeln pro Anfrage oder per Tarif ab 29 €/Monat.",
      },
      {
        value: "5 Minuten",
        title: "bis zum Profilstart",
        body: "Das Profil ist kostenlos und in etwa 5 Minuten startklar: Basisdaten ausfüllen und für Kunden veröffentlichen.",
      },
      {
        value: "0%",
        title: "Provision auf den Auftrag",
        body: "Nach dem Kontakt vereinbaren Sie Preis und Leistungsbedingungen direkt mit dem Kunden.",
      },
    ],
    steps: {
      title: "So arbeiten Spezialisten mit Freuly",
      items: [
        {
          number: "01",
          title: "Profil kostenlos erstellen",
          body:
            "Das Profil macht Sie in der Freuly-Suche sichtbar und liefert die Angaben für passendes Matching: Leistungen, Preise, Sprachen, Ort oder Online-Format.",
        },
        {
          number: "02",
          title: "Passende Anfragen ansehen",
          body:
            "Wenn ein Kunde Sie auswählt oder Freuly eine Übereinstimmung findet, sehen Sie eine datensparsame Vorschau ohne Kundenkontakt. Bis hierhin ist keine Zahlung nötig.",
        },
        {
          number: "03",
          title: "Zugangsmodell wählen",
          body:
            "Einzelzugang zu einer konkreten Anfrage gibt es ab 20 € für registrierte Spezialisten. Professional für 29 €/Monat gibt im bezahlten Zeitraum Zugang zu den Ihnen angebotenen passenden Anfragen ohne separate Zahlung pro Anfrage. Die Anzahl hängt von realer Nachfrage und Matching ab.",
        },
      ],
    },
    seo: {
      title: "Nicht für bloße Präsenz zahlen — sondern Zugang zu echter Nachfrage wählen",
      intro:
        "Das öffentliche Profil hilft Kunden bei der Auswahl. Kostenpflichtig wird Freuly, wenn Sie Zugang zu einer konkreten Kundenanfrage oder laufenden Anfragezugang über einen Tarif möchten.",
    },
    offer: {
      title: "Was Spezialisten erhalten",
      intro:
        "Kostenloser Einstieg und freie Wahl: einzelne Anfragen ohne Pflicht-Abo oder ein Tarif für regelmäßigen Zugang.",
      bullets: [
        "Öffentliches Spezialistenprofil mit Leistungen, Preisen, Sprachen, Ort, Fotos, Beschreibung und verfügbaren Nachweisen.",
        "Suche nach Kategorie, Sprache, Arbeitsformat und Ort.",
        "Benachrichtigungen zu passenden Anfragen und datensparsame Vorschau vor Kontaktfreigabe.",
        ONE_OFF_REQUEST_ACCESS_LINE.de,
        "Professional/Growth als Alternative zu Einzelkäufen: Anfragezugang im Tarif plus zusätzliche Präsentationsfunktionen.",
        "0% Provision auf den Vertrag zwischen Ihnen und dem Kunden.",
      ],
      caption: "Profil kostenlos. Kundenkontakt nach Wahl: einzelne Anfrage oder Tarif.",
    },
    faq: {
      title: "Häufige Fragen",
      items: [
        {
          q: "Warum brauche ich ein kostenloses Profil, wenn Anfragekontakte kostenpflichtig sind?",
          a: "Das Profil ist nicht nur ein Eintrag. Kunden können Sie direkt finden und auswählen, und Freuly nutzt Leistungen, Sprachen, Arbeitsformat und Region für das Matching relevanter Anfragen. So können Sie zunächst Nachfrage sehen und erst dann über kostenpflichtigen Kontaktzugang entscheiden.",
        },
        {
          q: "Muss ich für die Profilveröffentlichung zahlen?",
          a: "Nein. Registrierung, Profilbefüllung und Veröffentlichung des Basisprofils erfordern weder Professional noch Growth.",
        },
        {
          q: "Kann ich eine einzelne Anfrage ohne Registrierung kaufen?",
          a: "Nein. Anfragezugang ist für registrierte Spezialisten vorgesehen. Das Profil ermöglicht Freuly, Ihre Spezialisierung zu prüfen und passende Anfragen zuzuordnen; Kundendaten werden nicht an beliebige Nutzer verkauft.",
        },
        {
          q: "Wofür zahlt ein Spezialist dann?",
          a: `Kostenpflichtig ist der Zugang zu Kontaktdaten passender Kundenanfragen. ${ONE_OFF_REQUEST_ACCESS_LINE.de} Professional/Growth geben Anfragezugang im Tarif.`,
        },
        {
          q: "Ist Professional für 29 € verpflichtend?",
          a: "Nein. Wenn Sie nur gelegentlich eine Anfrage öffnen möchten, können passende Kontakte einzeln ab 20 € freigeschaltet werden. Professional ist für regelmäßige Nutzung gedacht: Im bezahlten Zeitraum zahlen Sie nicht separat für jede passende Anfrage, die Freuly Ihnen anbietet.",
        },
        {
          q: "Wie viele Anfragen sind in Professional enthalten?",
          a: "Es gibt kein festes Kontingent wie 5 oder 10 Anfragen pro Monat. Professional öffnet im bezahlten Zeitraum die Kontakte passender Anfragen, die Freuly Ihnen anbietet, ohne Einzelzahlung pro Anfrage. Freuly garantiert jedoch keine bestimmte Anzahl; sie hängt von Nachfrage, Kategorie, Sprache, Region und weiteren Matching-Faktoren ab.",
        },
        {
          q: "Garantiert Freuly Kunden?",
          a: "Nein. Freuly gewinnt und verteilt Kundennachfrage; die Entscheidung des Kunden hängt zusätzlich von Leistung, Preis, Profil, Verfügbarkeit und Reaktionsgeschwindigkeit ab.",
        },
        {
          q: "Warum kann das günstiger sein als eigene Werbung?",
          a: "Eigene Kampagnen und Tests können schon vor der ersten Anfrage mehrere hundert Euro kosten. Bei Freuly ist die Profilveröffentlichung kostenlos; einzelne Anfragen gibt es ab 20 €, Professional kostet 29 €/Monat und Growth 59 €/Monat.",
        },
        {
          q: "Warum Freuly, wenn ich schon Instagram, Telegram oder Empfehlungen habe?",
          a: "Eigene Kanäle erreichen vor allem Ihr bestehendes Publikum. Freuly ergänzt den Moment, in dem jemand bereits nach einer Leistung, Sprache und Region sucht. Es ist ein zusätzlicher Kanal, kein Ersatz.",
        },
      ],
    },
    finalCta: {
      headline: "Kostenloses Profil erstellen und Zugang zu Kundennachfrage aufbauen",
      body:
        "Zeigen Sie Kunden zuerst, wer Sie sind und wobei Sie helfen. Ein Tarif muss nicht vorab gekauft werden.",
      button: "Kostenloses Profil erstellen",
    },
  },
};

function mergeCopy(base: ForSpecialistsCopy, patch: Partial<ForSpecialistsCopy>): ForSpecialistsCopy {
  return { ...base, ...patch };
}

export const CURRENT_FOR_SPECIALISTS_COPY: Record<Lang, ForSpecialistsCopy> = {
  ru: mergeCopy(FOR_SPECIALISTS_COPY.ru, OVERRIDES.ru),
  ua: mergeCopy(FOR_SPECIALISTS_COPY.ua, OVERRIDES.ua),
  de: mergeCopy(FOR_SPECIALISTS_COPY.de, OVERRIDES.de),
};
