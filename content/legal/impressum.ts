import type { LegalContentLang, LegalDocument } from "./types";

const TRANSLATION_NOTICE = {
  ua: "Цей переклад надано виключно для зручності розуміння. У разі розбіжностей або відмінностей у тлумаченні визначальною є німецька версія.",
  ru: "Этот перевод предоставлен исключительно для удобства понимания. При расхождениях или различиях в толковании определяющей является немецкая версия.",
  en: "This translation is provided for convenience only. In the event of discrepancies or differences in interpretation, the German version shall prevail.",
} as const;

const de: LegalDocument = {
  metaTitle: "Impressum | Freuly",
  metaDescription: "Impressum – Anbieterkennzeichnung für freuly.de",
  title: "Impressum",
  subtitle: "Angaben gemäß § 5 DDG",
  stand: "Stand: August 2026",
  sections: [
    {
      title: "Diensteanbieter",
      blocks: [
        {
          type: "p",
          text: "Natalia Sheshenia\nhandelnd unter der Geschäftsbezeichnung „Sheshenia – Freuly“\nHofolper Straße 46\n57399 Kirchhundem\nDeutschland",
        },
      ],
    },
    {
      title: "Kontakt",
      blocks: [
        {
          type: "labeledLinks",
          lines: [
            { label: "E-Mail:", href: "mailto:freuly.de@gmail.com", value: "freuly.de@gmail.com" },
            { label: "Telefon:", href: "tel:+4916092686432", value: "+49 160 92686432" },
          ],
        },
      ],
    },
    {
      title: "Umsatzsteuer-Identifikationsnummer",
      blocks: [
        { type: "p", text: "Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:\nDE464033560" },
      ],
    },
    {
      title: "Wirtschafts-Identifikationsnummer",
      blocks: [{ type: "p", text: "DE464033560-00001" }],
    },
    {
      title: "Hinweis zur Kleinunternehmerregelung",
      blocks: [
        { type: "p", text: "Für eigene Leistungen des Diensteanbieters wird gemäß § 19 UStG keine Umsatzsteuer ausgewiesen." },
        { type: "p", text: "Die auf Freuly von selbständigen Spezialisten angegebenen Preise sowie deren steuerliche Behandlung liegen in der Verantwortung des jeweiligen Anbieters." },
      ],
    },
    {
      title: "Verantwortlich für journalistisch-redaktionelle Inhalte",
      blocks: [
        { type: "p", text: "Verantwortlich gemäß § 18 Abs. 2 MStV:" },
        { type: "p", text: "Natalia Sheshenia\nAnschrift wie oben." },
      ],
    },
    {
      title: "Verbraucherstreitbeilegung",
      blocks: [
        { type: "p", text: "Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." },
      ],
    },
    {
      title: "Inhalte von Spezialisten",
      blocks: [
        { type: "p", text: "Freuly ist eine Plattform zur Vermittlung und Präsentation selbständiger Spezialisten und Dienstleister." },
        { type: "p", text: "Soweit Inhalte, Angaben zu Leistungen, Preisen, Qualifikationen oder sonstige Informationen von registrierten Spezialisten selbst bereitgestellt werden, liegt die Verantwortung für die Richtigkeit, Vollständigkeit und Rechtmäßigkeit dieser Angaben grundsätzlich beim jeweiligen Anbieter." },
        { type: "p", text: "Eigene Inhalte von Freuly bleiben hiervon unberührt." },
      ],
    },
    {
      title: "Externe Links",
      blocks: [
        { type: "p", text: "Freuly kann Links zu externen Websites Dritter enthalten. Auf deren Inhalte und zukünftige Gestaltung hat Freuly keinen unmittelbaren Einfluss." },
        { type: "p", text: "Werden konkrete Rechtsverletzungen bekannt, werden entsprechende Links nach Prüfung entfernt." },
      ],
    },
  ],
};

const ru: LegalDocument = {
  metaTitle: "Импрессум | Freuly",
  metaDescription: "Импрессум — сведения об операторе freuly.de",
  title: "Импрессум / Выходные данные",
  subtitle: "Данные поставщика цифровых услуг согласно § 5 DDG",
  stand: "Версия: август 2026",
  translationNotice: TRANSLATION_NOTICE.ru,
  sections: [
    {
      title: "Поставщик услуг",
      blocks: [{ type: "p", text: "Наталья Шешеня\nдействующая под коммерческим обозначением «Sheshenia – Freuly»\nHofolper Straße 46\n57399 Kirchhundem\nГермания" }],
    },
    {
      title: "Контакты",
      blocks: [{ type: "labeledLinks", lines: [
        { label: "E-mail:", href: "mailto:freuly.de@gmail.com", value: "freuly.de@gmail.com" },
        { label: "Телефон:", href: "tel:+4916092686432", value: "+49 160 92686432" },
      ] }],
    },
    {
      title: "Идентификационный номер плательщика НДС",
      blocks: [{ type: "p", text: "Umsatzsteuer-Identifikationsnummer согласно § 27a UStG:\nDE464033560" }],
    },
    {
      title: "Хозяйственный идентификационный номер",
      blocks: [{ type: "p", text: "DE464033560-00001" }],
    },
    {
      title: "Регулирование для малых предпринимателей",
      blocks: [
        { type: "p", text: "В отношении собственных услуг поставщика в соответствии с § 19 UStG НДС отдельно не указывается." },
        { type: "p", text: "Цены, которые самостоятельные специалисты размещают на Freuly, а также налоговый режим их услуг находятся в ответственности соответствующего поставщика услуг." },
      ],
    },
    {
      title: "Ответственный за журналистско-редакционное содержание",
      blocks: [
        { type: "p", text: "Ответственный согласно § 18 абз. 2 MStV:" },
        { type: "p", text: "Наталья Шешеня\nАдрес указан выше." },
      ],
    },
    {
      title: "Урегулирование потребительских споров",
      blocks: [{ type: "p", text: "Мы не обязаны и не готовы участвовать в процедурах урегулирования споров перед органом потребительского арбитража (Verbraucherschlichtungsstelle)." }],
    },
    {
      title: "Информация, размещаемая специалистами",
      blocks: [
        { type: "p", text: "Freuly является платформой для представления самостоятельных специалистов и поставщиков услуг, а также установления контакта между ними и пользователями." },
        { type: "p", text: "Если информация о специалисте, его услугах, ценах, квалификации или иные сведения предоставляются самим зарегистрированным специалистом, ответственность за правильность, полноту и законность таких сведений в принципе несёт соответствующий поставщик услуг." },
        { type: "p", text: "Это не затрагивает ответственность Freuly за собственное содержание платформы." },
      ],
    },
    {
      title: "Внешние ссылки",
      blocks: [
        { type: "p", text: "Freuly может содержать ссылки на внешние сайты третьих лиц. Freuly не имеет непосредственного контроля над их содержанием и последующими изменениями." },
        { type: "p", text: "При получении информации о конкретном нарушении законодательства соответствующие ссылки после проверки будут удалены." },
      ],
    },
  ],
};

const ua: LegalDocument = {
  metaTitle: "Імпресум | Freuly",
  metaDescription: "Імпресум — відомості про оператора freuly.de",
  title: "Імпресум / Вихідні дані",
  subtitle: "Відомості про постачальника цифрових послуг згідно з § 5 DDG",
  stand: "Версія: серпень 2026",
  translationNotice: TRANSLATION_NOTICE.ua,
  sections: [
    {
      title: "Постачальник послуг",
      blocks: [{ type: "p", text: "Natalia Sheshenia\nдіє під комерційним найменуванням «Sheshenia – Freuly»\nHofolper Straße 46\n57399 Kirchhundem\nНімеччина" }],
    },
    {
      title: "Контакти",
      blocks: [{ type: "labeledLinks", lines: [
        { label: "E-mail:", href: "mailto:freuly.de@gmail.com", value: "freuly.de@gmail.com" },
        { label: "Телефон:", href: "tel:+4916092686432", value: "+49 160 92686432" },
      ] }],
    },
    {
      title: "Ідентифікаційний номер платника ПДВ",
      blocks: [{ type: "p", text: "Umsatzsteuer-Identifikationsnummer згідно з § 27a UStG:\nDE464033560" }],
    },
    {
      title: "Господарський ідентифікаційний номер",
      blocks: [{ type: "p", text: "DE464033560-00001" }],
    },
    {
      title: "Регулювання для малих підприємців",
      blocks: [
        { type: "p", text: "Щодо власних послуг постачальника відповідно до § 19 UStG ПДВ окремо не зазначається." },
        { type: "p", text: "Ціни, які самостійні спеціалісти зазначають на Freuly, а також податковий режим їхніх послуг перебувають у відповідальності відповідного постачальника послуг." },
      ],
    },
    {
      title: "Відповідальний за журналістсько-редакційний зміст",
      blocks: [
        { type: "p", text: "Відповідальний згідно з § 18 Abs. 2 MStV:" },
        { type: "p", text: "Natalia Sheshenia\nАдреса зазначена вище." },
      ],
    },
    {
      title: "Врегулювання споживчих спорів",
      blocks: [{ type: "p", text: "Ми не зобов’язані та не готові брати участь у процедурах врегулювання спорів перед органом споживчого арбітражу (Verbraucherschlichtungsstelle)." }],
    },
    {
      title: "Інформація, розміщена спеціалістами",
      blocks: [
        { type: "p", text: "Freuly є платформою для представлення самостійних спеціалістів і постачальників послуг, а також встановлення контакту між ними та користувачами." },
        { type: "p", text: "Якщо інформацію про спеціаліста, його послуги, ціни, кваліфікацію або інші відомості надає сам зареєстрований спеціаліст, відповідальність за правильність, повноту та законність таких відомостей принципово несе відповідний постачальник послуг." },
        { type: "p", text: "Це не впливає на відповідальність Freuly за власний зміст платформи." },
      ],
    },
    {
      title: "Зовнішні посилання",
      blocks: [
        { type: "p", text: "Freuly може містити посилання на зовнішні вебсайти третіх осіб. Freuly не має безпосереднього контролю над їхнім змістом та подальшими змінами." },
        { type: "p", text: "У разі отримання інформації про конкретне порушення законодавства відповідні посилання після перевірки будуть видалені." },
      ],
    },
  ],
};

const en: LegalDocument = {
  ...de,
  metaTitle: "Legal notice | Freuly",
  metaDescription: "Legal notice for freuly.de",
  translationNotice: TRANSLATION_NOTICE.en,
};

export const IMPRESSUM_BY_LANG: Record<LegalContentLang, LegalDocument> = { de, ua, ru, en };

export function getImpressumDocument(lang: LegalContentLang): LegalDocument {
  return IMPRESSUM_BY_LANG[lang] ?? de;
}
