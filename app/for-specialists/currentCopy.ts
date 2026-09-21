import type { Lang } from "@/lib/i18n";
import { FOR_SPECIALISTS_COPY, type ForSpecialistsCopy } from "./copy";

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
        "Опубликуйте профиль на Freuly без обязательной подписки. Клиенты смогут найти и выбрать вас. Когда появляется подходящая заявка, откройте её отдельно или подключите Professional с доступом к заявкам в рамках тарифа.",
      cta: "Создать профиль бесплатно",
      secondaryCta: "Как это работает",
      note:
        "Регистрация и публикация профиля бесплатны. Контакты клиента — платная функция: отдельная заявка или тариф Professional/Growth. Freuly не берёт комиссию с вашего заказа.",
    },
    proof: [
      {
        value: "0 €",
        title: "за регистрацию и публикацию",
        body: "Заполните профиль и станьте видимы клиентам без обязательной подписки.",
      },
      {
        value: "2 варианта",
        title: "доступа к заявкам",
        body: "Открывайте конкретные заявки отдельно или подключайте тариф с доступом к заявкам в рамках оплаченного периода.",
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
            "Укажите услуги, цены, языки, город или онлайн-формат, добавьте фото и описание. После публикации профиль доступен клиентам без обязательной подписки.",
        },
        {
          number: "02",
          title: "Клиент находит и выбирает вас",
          body:
            "Человек ищет услугу по языку, категории и локации, изучает профиль и может отправить запрос именно вам. Freuly также может предложить подходящий запрос по совпадению.",
        },
        {
          number: "03",
          title: "Решите, нужен ли вам контакт",
          body:
            "Вы видите безопасное превью запроса. Контакт можно открыть отдельной оплатой либо в рамках Professional/Growth. Договор и оплату вашей услуги вы согласуете с клиентом напрямую.",
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
        "Разовый доступ к конкретной заявке без обязательства покупать месячный тариф.",
        "Professional/Growth — альтернатива разовым покупкам: доступ к заявкам в рамках тарифа плюс дополнительные возможности представления профиля.",
        "0% комиссии с договора между вами и клиентом.",
      ],
      caption: "Профиль — бесплатно. Клиентский контакт — по вашему выбору: заявка или тариф.",
    },
    faq: {
      title: "Частые вопросы",
      items: [
        {
          q: "Нужно ли платить, чтобы опубликовать профиль?",
          a: "Нет. Регистрация, заполнение и публикация базового профиля не требуют Professional или Growth.",
        },
        {
          q: "За что тогда платит специалист?",
          a: "Платная часть — доступ к контактам подходящих клиентских заявок. Конкретную заявку можно открыть отдельно или получать доступ к заявкам в рамках Professional/Growth.",
        },
        {
          q: "Обязательно ли покупать тариф 29 €?",
          a: "Нет. Professional — это вариант для специалиста, которому удобнее доступ к заявкам в рамках тарифа. Без подписки подходящие заявки можно покупать отдельно.",
        },
        {
          q: "Вы гарантируете клиентов?",
          a: "Нет. Freuly привлекает и распределяет клиентский спрос, но решение клиента зависит от услуги, цены, профиля, доступности, скорости ответа и других факторов.",
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
        "Опублікуйте профіль на Freuly без обов’язкової підписки. Клієнти зможуть знайти й обрати вас. Коли з’являється відповідний запит, відкрийте його окремо або підключіть Professional з доступом до запитів у межах тарифу.",
      cta: "Створити профіль безкоштовно",
      secondaryCta: "Як це працює",
      note:
        "Реєстрація та публікація профілю безкоштовні. Контакти клієнта — платна функція: окремий запит або тариф Professional/Growth. Freuly не бере комісію із вашого замовлення.",
    },
    proof: [
      {
        value: "0 €",
        title: "за реєстрацію та публікацію",
        body: "Заповніть профіль і станьте видимими клієнтам без обов’язкової підписки.",
      },
      {
        value: "2 варіанти",
        title: "доступу до запитів",
        body: "Відкривайте конкретні запити окремо або підключайте тариф із доступом до запитів у межах оплаченого періоду.",
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
            "Вкажіть послуги, ціни, мови, місто або онлайн-формат, додайте фото й опис. Після публікації профіль доступний клієнтам без обов’язкової підписки.",
        },
        {
          number: "02",
          title: "Клієнт знаходить і обирає вас",
          body:
            "Людина шукає послугу за мовою, категорією та локацією, переглядає профіль і може надіслати запит саме вам. Freuly також може запропонувати відповідний запит за збігом.",
        },
        {
          number: "03",
          title: "Вирішіть, чи потрібен вам контакт",
          body:
            "Ви бачите безпечне прев’ю запиту. Контакт можна відкрити окремою оплатою або в межах Professional/Growth. Договір та оплату вашої послуги ви узгоджуєте з клієнтом напряму.",
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
        "Разовий доступ до конкретного запиту без обов’язку купувати місячний тариф.",
        "Professional/Growth — альтернатива разовим покупкам: доступ до запитів у межах тарифу плюс додаткові можливості представлення профілю.",
        "0% комісії з договору між вами та клієнтом.",
      ],
      caption: "Профіль — безкоштовно. Контакт клієнта — на ваш вибір: запит або тариф.",
    },
    faq: {
      title: "Поширені запитання",
      items: [
        {
          q: "Чи потрібно платити, щоб опублікувати профіль?",
          a: "Ні. Реєстрація, заповнення та публікація базового профілю не потребують Professional або Growth.",
        },
        {
          q: "За що тоді платить спеціаліст?",
          a: "Платна частина — доступ до контактів відповідних клієнтських запитів. Конкретний запит можна відкрити окремо або отримувати доступ до запитів у межах Professional/Growth.",
        },
        {
          q: "Чи обов’язково купувати тариф 29 €?",
          a: "Ні. Professional — це варіант для спеціаліста, якому зручніший доступ до запитів у межах тарифу. Без підписки відповідні запити можна купувати окремо.",
        },
        {
          q: "Ви гарантуєте клієнтів?",
          a: "Ні. Freuly залучає та розподіляє клієнтський попит, але рішення клієнта залежить від послуги, ціни, профілю, доступності, швидкості відповіді та інших факторів.",
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
        "Veröffentlichen Sie Ihr Profil ohne Pflicht-Abo. Kunden können Sie finden und auswählen. Bei einer passenden Anfrage schalten Sie den Kontakt einzeln frei oder nutzen Professional mit Anfragezugang im Tarif.",
      cta: "Kostenloses Profil erstellen",
      secondaryCta: "So funktioniert es",
      note:
        "Registrierung und Profilveröffentlichung sind kostenlos. Kundenkontakte sind kostenpflichtig: einzelne Anfrage oder Professional/Growth. Freuly erhebt keine Provision auf Ihren Auftrag.",
    },
    proof: [
      {
        value: "0 €",
        title: "für Registrierung und Veröffentlichung",
        body: "Vervollständigen Sie Ihr Profil und werden Sie ohne Pflicht-Abo für Kunden sichtbar.",
      },
      {
        value: "2 Wege",
        title: "zum Anfragezugang",
        body: "Schalten Sie einzelne Anfragen frei oder nutzen Sie einen Tarif mit Anfragezugang im bezahlten Zeitraum.",
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
            "Leistungen, Preise, Sprachen, Ort oder Online-Format, Fotos und Beschreibung eintragen. Nach der Veröffentlichung ist das Profil ohne Pflicht-Abo für Kunden sichtbar.",
        },
        {
          number: "02",
          title: "Kunden finden und wählen Sie",
          body:
            "Kunden suchen nach Sprache, Kategorie und Ort, prüfen Ihr Profil und können eine Anfrage direkt an Sie senden. Freuly kann Ihnen außerdem passende Anfragen zuordnen.",
        },
        {
          number: "03",
          title: "Über Kontaktzugang entscheiden",
          body:
            "Sie sehen eine datenschutzgerechte Vorschau. Den Kontakt schalten Sie einzeln oder über Professional/Growth frei. Vertrag und Bezahlung Ihrer Leistung vereinbaren Sie direkt mit dem Kunden.",
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
        "Einmaliger Zugang zu einer konkreten Anfrage ohne Pflicht zum Monatstarif.",
        "Professional/Growth als Alternative zu Einzelkäufen: Anfragezugang im Tarif plus zusätzliche Präsentationsfunktionen.",
        "0% Provision auf den Vertrag zwischen Ihnen und dem Kunden.",
      ],
      caption: "Profil kostenlos. Kundenkontakt nach Wahl: einzelne Anfrage oder Tarif.",
    },
    faq: {
      title: "Häufige Fragen",
      items: [
        {
          q: "Muss ich für die Profilveröffentlichung zahlen?",
          a: "Nein. Registrierung, Profilbefüllung und Veröffentlichung des Basisprofils erfordern weder Professional noch Growth.",
        },
        {
          q: "Wofür zahlt ein Spezialist dann?",
          a: "Kostenpflichtig ist der Zugang zu Kontaktdaten passender Kundenanfragen. Eine konkrete Anfrage kann einzeln oder im Rahmen von Professional/Growth freigeschaltet werden.",
        },
        {
          q: "Ist Professional für 29 € verpflichtend?",
          a: "Nein. Professional ist eine Option für Anfragezugang im Tarif. Ohne Abo können passende Anfragen einzeln gekauft werden.",
        },
        {
          q: "Garantiert Freuly Kunden?",
          a: "Nein. Freuly gewinnt und verteilt Kundennachfrage; die Entscheidung des Kunden hängt zusätzlich von Leistung, Preis, Profil, Verfügbarkeit und Reaktionsgeschwindigkeit ab.",
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
