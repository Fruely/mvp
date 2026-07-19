import type { LegalContentLang, LegalDocument } from "./types";

const TRANSLATION_NOTICE = {
  ua: "Цей переклад надано для зручності. У разі розбіжностей визначальною є німецька версія.",
  ru: "Этот перевод предоставлен для удобства. В случае расхождений определяющей является немецкая версия.",
  en: "This translation is provided for convenience. In the event of discrepancies, the German version shall prevail.",
} as const;

const de: LegalDocument = {
  metaTitle: "Impressum | Freuly",
  metaDescription: "Impressum – Anbieterkennzeichnung für freuly.de",
  title: "Impressum",
  subtitle: "Angaben gemäß § 5 DDG",
  stand: "Stand: Mai 2026",
  sections: [
    {
      title: "Anbieter",
      blocks: [
        {
          type: "p",
          text: "Freuly\nhttps://freuly.de\nPlattform zur Darstellung von Spezialistenprofilen und zur Weiterleitung von Kontaktanfragen zwischen Nutzern und Spezialisten.",
        },
      ],
    },
    {
      title: "Verantwortlich für den Inhalt",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Kontakt",
      blocks: [
        {
          type: "labeledLinks",
          lines: [
            {
              label: "E-Mail:",
              href: "mailto:freuly.de@gmail.com",
              value: "freuly.de@gmail.com",
            },
            {
              label: "Telefon:",
              href: "tel:+4916092686432",
              value: "0160 92686432",
            },
          ],
        },
      ],
    },
    {
      title:
        "Verantwortlich für journalistisch-redaktionelle Inhalte nach § 18 Abs. 2 MStV",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Haftung für Inhalte",
      blocks: [
        {
          type: "p",
          text: "Die eigenen Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir jedoch keine Gewähr übernehmen.",
        },
        {
          type: "p",
          text: "Freuly stellt eine Plattform bereit, auf der Spezialisten eigene Profile, Leistungen, Preise, Fotos, Portfolio-Inhalte und weitere Angaben veröffentlichen können. Für Inhalte, Angaben, Bilder, Leistungsbeschreibungen und Angebote, die von Spezialisten selbst eingestellt werden, ist der jeweilige Spezialist verantwortlich.",
        },
        {
          type: "p",
          text: "Freuly vermittelt keine Dienstleistungsverträge, garantiert keine Aufträge, Zahlungen, Bewertungen oder eine bestimmte Qualität der angebotenen Leistungen. Verträge oder Absprachen kommen ausschließlich zwischen anfragenden Nutzern und dem jeweiligen Spezialisten zustande.",
        },
      ],
    },
    {
      title: "Haftung für Links",
      blocks: [
        {
          type: "p",
          text: "Unsere Website kann Links zu externen Websites Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben. Deshalb übernehmen wir für diese fremden Inhalte keine Gewähr. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.",
        },
      ],
    },
    {
      title: "Urheberrecht",
      blocks: [
        {
          type: "p",
          text: "Die auf dieser Website veröffentlichten eigenen Inhalte, Texte, Bilder und Werke unterliegen dem deutschen Urheberrecht. Inhalte, die von Spezialisten hochgeladen oder veröffentlicht werden, liegen in der Verantwortung der jeweiligen Spezialisten. Jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedarf der vorherigen Zustimmung des jeweiligen Rechteinhabers.",
        },
      ],
    },
  ],
};

const ua: LegalDocument = {
  metaTitle: "Імпресум | Freuly",
  metaDescription: "Імпресум (Impressum) — відомості про оператора freuly.de",
  title: "Імпресум (Impressum)",
  subtitle: "Відомості згідно з § 5 DDG",
  stand: "Станом на: травень 2026",
  translationNotice: TRANSLATION_NOTICE.ua,
  sections: [
    {
      title: "Оператор (Anbieter)",
      blocks: [
        {
          type: "p",
          text: "Freuly\nhttps://freuly.de\nПлатформа для представлення профілів спеціалістів і пересилання контактних запитів між користувачами та спеціалістами.",
        },
      ],
    },
    {
      title: "Відповідальний за зміст (Verantwortlicher)",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Контакт",
      blocks: [
        {
          type: "labeledLinks",
          lines: [
            {
              label: "E-Mail:",
              href: "mailto:freuly.de@gmail.com",
              value: "freuly.de@gmail.com",
            },
            {
              label: "Телефон:",
              href: "tel:+4916092686432",
              value: "0160 92686432",
            },
          ],
        },
      ],
    },
    {
      title:
        "Відповідальний за журналістсько-редакційний зміст згідно з § 18 Abs. 2 MStV",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Відповідальність за зміст (Haftung für Inhalte)",
      blocks: [
        {
          type: "p",
          text: "Власний зміст цього вебсайту створено з найбільшою ретельністю. Однак ми не можемо гарантувати правильність, повноту та актуальність інформації.",
        },
        {
          type: "p",
          text: "Freuly надає платформу, на якій спеціалісти можуть публікувати власні профілі, послуги, ціни, фото, портфоліо та інші відомості. За зміст, дані, зображення, описи послуг і пропозиції, які розміщує сам спеціаліст, відповідає відповідний спеціаліст.",
        },
        {
          type: "p",
          text: "Freuly не укладає договори про надання послуг від імені сторін, не гарантує замовлення, платежі, оцінки чи певну якість запропонованих послуг. Договори або домовленості виникають виключно між користувачем, який надсилає запит, і відповідним спеціалістом.",
        },
      ],
    },
    {
      title: "Відповідальність за посилання (Haftung für Links)",
      blocks: [
        {
          type: "p",
          text: "Наш вебсайт може містити посилання на зовнішні сайти третіх осіб, на зміст яких ми не впливаємо. Тому ми не несемо відповідальності за цей сторонній зміст. За зміст пов’язаних сторінок завжди відповідає відповідний постачальник або оператор.",
        },
      ],
    },
    {
      title: "Авторське право (Urheberrecht)",
      blocks: [
        {
          type: "p",
          text: "Власний зміст, тексти, зображення та твори, опубліковані на цьому вебсайті, охороняються німецьким авторським правом. Зміст, який завантажують або публікують спеціалісти, перебуває у відповідальності відповідних спеціалістів. Будь-яке використання поза межами авторського права потребує попередньої згоди відповідного правовласника.",
        },
      ],
    },
  ],
};

const ru: LegalDocument = {
  metaTitle: "Импрессум | Freuly",
  metaDescription: "Импрессум (Impressum) — сведения об операторе freuly.de",
  title: "Импрессум (Impressum)",
  subtitle: "Сведения согласно § 5 DDG",
  stand: "По состоянию на: май 2026",
  translationNotice: TRANSLATION_NOTICE.ru,
  sections: [
    {
      title: "Оператор (Anbieter)",
      blocks: [
        {
          type: "p",
          text: "Freuly\nhttps://freuly.de\nПлатформа для представления профилей специалистов и пересылки контактных запросов между пользователями и специалистами.",
        },
      ],
    },
    {
      title: "Ответственный за содержание (Verantwortlicher)",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Контакт",
      blocks: [
        {
          type: "labeledLinks",
          lines: [
            {
              label: "E-Mail:",
              href: "mailto:freuly.de@gmail.com",
              value: "freuly.de@gmail.com",
            },
            {
              label: "Телефон:",
              href: "tel:+4916092686432",
              value: "0160 92686432",
            },
          ],
        },
      ],
    },
    {
      title:
        "Ответственный за журналистско-редакционное содержание согласно § 18 Abs. 2 MStV",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Ответственность за содержание (Haftung für Inhalte)",
      blocks: [
        {
          type: "p",
          text: "Собственное содержание этого веб-сайта подготовлено с наибольшей тщательностью. Однако мы не можем гарантировать правильность, полноту и актуальность информации.",
        },
        {
          type: "p",
          text: "Freuly предоставляет платформу, на которой специалисты могут публиковать собственные профили, услуги, цены, фото, портфолио и иные сведения. За содержание, данные, изображения, описания услуг и предложения, размещённые самим специалистом, отвечает соответствующий специалист.",
        },
        {
          type: "p",
          text: "Freuly не заключает договоры об оказании услуг от имени сторон, не гарантирует заказы, платежи, оценки или определённое качество предлагаемых услуг. Договоры или договорённости возникают исключительно между пользователем, направляющим запрос, и соответствующим специалистом.",
        },
      ],
    },
    {
      title: "Ответственность за ссылки (Haftung für Links)",
      blocks: [
        {
          type: "p",
          text: "Наш веб-сайт может содержать ссылки на внешние сайты третьих лиц, на содержание которых мы не влияем. Поэтому мы не несём ответственности за это стороннее содержание. За содержание связанных страниц всегда отвечает соответствующий поставщик или оператор.",
        },
      ],
    },
    {
      title: "Авторское право (Urheberrecht)",
      blocks: [
        {
          type: "p",
          text: "Собственное содержание, тексты, изображения и произведения, опубликованные на этом веб-сайте, охраняются немецким авторским правом. Содержание, которое загружают или публикуют специалисты, находится в ответственности соответствующих специалистов. Любое использование за пределами авторского права требует предварительного согласия соответствующего правообладателя.",
        },
      ],
    },
  ],
};

const en: LegalDocument = {
  metaTitle: "Legal notice (Impressum) | Freuly",
  metaDescription: "Legal notice (Impressum) for freuly.de",
  title: "Legal notice (Impressum)",
  subtitle: "Information pursuant to § 5 DDG",
  stand: "Last updated: May 2026",
  translationNotice: TRANSLATION_NOTICE.en,
  sections: [
    {
      title: "Provider (Anbieter)",
      blocks: [
        {
          type: "p",
          text: "Freuly\nhttps://freuly.de\nPlatform for presenting specialist profiles and forwarding contact requests between users and specialists.",
        },
      ],
    },
    {
      title: "Responsible for content (Verantwortlicher)",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nGermany",
        },
      ],
    },
    {
      title: "Contact",
      blocks: [
        {
          type: "labeledLinks",
          lines: [
            {
              label: "Email:",
              href: "mailto:freuly.de@gmail.com",
              value: "freuly.de@gmail.com",
            },
            {
              label: "Phone:",
              href: "tel:+4916092686432",
              value: "0160 92686432",
            },
          ],
        },
      ],
    },
    {
      title:
        "Responsible for journalistic-editorial content pursuant to § 18 Abs. 2 MStV",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nHofolpe Str. 46\n57399 Kirchhundem\nGermany",
        },
      ],
    },
    {
      title: "Liability for content (Haftung für Inhalte)",
      blocks: [
        {
          type: "p",
          text: "The own content of this website has been prepared with the greatest care. However, we cannot guarantee that the information is correct, complete or up to date.",
        },
        {
          type: "p",
          text: "Freuly provides a platform on which specialists can publish their own profiles, services, prices, photos, portfolio content and other information. For content, details, images, service descriptions and offers posted by specialists themselves, the respective specialist is responsible.",
        },
        {
          type: "p",
          text: "Freuly does not broker service contracts and does not guarantee assignments, payments, ratings or any particular quality of the services offered. Contracts or arrangements arise exclusively between requesting users and the respective specialist.",
        },
      ],
    },
    {
      title: "Liability for links (Haftung für Links)",
      blocks: [
        {
          type: "p",
          text: "Our website may contain links to external third-party websites over whose content we have no influence. Therefore we assume no liability for such external content. The respective provider or operator is always responsible for the content of linked pages.",
        },
      ],
    },
    {
      title: "Copyright (Urheberrecht)",
      blocks: [
        {
          type: "p",
          text: "Own content, texts, images and works published on this website are subject to German copyright law. Content uploaded or published by specialists remains the responsibility of the respective specialists. Any use outside the limits of copyright requires the prior consent of the respective rights holder.",
        },
      ],
    },
  ],
};

export const IMPRESSUM_BY_LANG: Record<LegalContentLang, LegalDocument> = {
  de,
  ua,
  ru,
  en,
};

export function getImpressumDocument(lang: LegalContentLang): LegalDocument {
  return IMPRESSUM_BY_LANG[lang];
}
