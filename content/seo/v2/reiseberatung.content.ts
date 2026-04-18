import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO page: travel consulting / trip planning (standalone hub). */
export const reiseberatungContent: LocalizedSeoCategory = {
  slug: "reiseberatung",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%reiseberatung%,category.ilike.%travel%,category.ilike.%reise%",
  content: {
    de: {
      slug: "reiseberatung",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle: "Reiseberatung in Deutschland – Planung auf Ihrer Sprache | Freuly",
      metaDescription:
        "Individuelle Reiseplanung mit Beraterinnen und Beratern, die Ukrainisch, Russisch oder Deutsch sprechen. Was Sie vorbereiten sollten und wie Freuly beim Kontakt hilft.",
      h1: "Reiseberatung — Klarheit vor dem Kofferpacken",
      breadcrumbsLabel: "Reiseberatung",
      homeLabel: "Startseite",
      intro: [
        "Reiseberatung kann bedeuten: gemeinsam Prioritäten setzen, realistische Routen bauen, Unterkünfte und Verkehrsmittel abstimmen oder bei Dokumenten und Zeitfenstern helfen — je nach Profil der Person.",
        "Auf dieser Seite finden Sie Orientierung, welche Fragen sich vor dem ersten Gespräch lohnen, und darunter eine Auswahl passender Profile aus der Freuly-Datenbank.",
      ],
      subcategoriesTitle: "Häufige Unterkategorien",
      subcategories: [
        {
          slug: "pauschalreisen",
          label: "Pauschalreisen",
          description:
            "Gebündelte Pakete mit klarem Leistungsumfang — gut planbar, weniger Flexibilität im Detail.",
        },
        {
          slug: "individualreisen",
          label: "Individualreisen",
          description:
            "Maßgeschneidert: Städte springen, Flex-Tage, besondere Interessen.",
        },
        {
          slug: "visa-hilfe",
          label: "Visa-Hilfe",
          description:
            "Parallel zur Routenplanung: Checklisten und Erfahrung mit Antragswegen.",
        },
      ],
      sections: [
        {
          heading: "Was eine gute Erstnachricht enthält",
          body: [
            "Zeitraum (auch grob), Reisende inklusive Alter, ob Sie lieber ÖPNV, Mietwagen oder gemischt reisen, und ob Ruhe oder Bildungsprogramm im Vordergrund steht.",
            "Je weniger Pauschalannahmen nötig sind, desto eher bekommen Sie einen Vorschlag, der wirklich zu Ihrem Alltag passt.",
          ],
        },
        {
          heading: "Pauschal versus maßgeschneidert",
          bullets: [
            "Pauschal: oft günstiger, klarer Leistungskatalog, weniger Freiheitsgrade bei Storno.",
            "Individuell: mehr Aufwand in der Planung, aber Routen, die genau Ihre Geschwindigkeit treffen.",
          ],
        },
        {
          heading: "Freuly und Buchungsabwicklung",
          body: "Freuly selbst ist kein Ticketing-System — buchen und bezahlen klären Sie transparent mit dem Profil, das Sie wählen. Die Plattform fokussiert auf passende Sprache und nachvollziehbare Steckbriefe.",
        },
      ],
      specialistsTitle: "Reiseberaterinnen und -berater (Auswahl)",
      specialistsEmpty:
        "Sobald sichtbare Profile zu dieser Thematik existieren, erscheinen sie hier.",
      faqTitle: "FAQ",
      faq: [
        {
          question: "Übernehmen Berater die Buchung aller Teilstrecken?",
          answer:
            "Das ist individuell. Sprechen Sie im Profil ab, ob nur Beratung oder auch operative Buchung angeboten wird.",
        },
        {
          question: "Gibt es eine Erstberatung ohne Verpflichtung?",
          answer:
            "Fragen Sie direkt nach Konditionen — viele Profile beschreiben kurze Erstkontakte offen.",
        },
      ],
      relatedTitle: "Passend dazu",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description: "Weiter Blick auf Touren, Retreats und Übersicht.",
        },
        {
          href: "touren-ausfluege",
          label: "Touren & Ausflüge",
          description: "Wenn der Fokus auf geführten Erlebnissen vor Ort liegt.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description: "Mehrtägige Formate statt klassischer Pauschalreise.",
        },
      ],
      cta: {
        heading: "Zur Reiseberatungs-Kategorie",
        body: "Filtern Sie weiter und schreiben Sie mit konkretem Reiseziel.",
        buttonLabel: "Kategorie öffnen",
        ctaHref: "/de/category/reiseberatung",
      },
    },
    ru: {
      slug: "reiseberatung",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle: "Подбор туров и консультации по поездкам в Германии | Freuly",
      metaDescription:
        "Индивидуальный подбор маршрута и помощь в организации: как общаться с консультантом на Freuly на русском, украинском или немецком.",
      h1: "Консультации по путешествиям — что решить до бронирования",
      breadcrumbsLabel: "Подбор туров",
      homeLabel: "Главная",
      intro: [
        "Консультант по путешествиям может помочь выстроить маршрут, подобрать жильё и транспорт, подсказать по срокам виз и документов — в зависимости от компетенции.",
        "Ниже — на что обратить внимание до первого контакта и примеры профилей из базы Freuly.",
      ],
      subcategoriesTitle: "Частые темы",
      subcategories: [
        {
          slug: "pauschalreisen",
          label: "Пакетные туры",
          description: "Готовые связки услуг — проще по цене, меньше гибкости.",
        },
        {
          slug: "individualreisen",
          label: "Индивидуальные поездки",
          description: "Маршрут под ваш темп и интересы.",
        },
        {
          slug: "visa-hilfe",
          label: "Помощь с визой",
          description: "Параллельно с планом поездки.",
        },
      ],
      sections: [
        {
          heading: "Что написать в первом сообщении",
          body: [
            "Даты или сезон, состав семьи, ограничения по здоровью, предпочтение между поездами и авто, ожидания по ритму — быстрее, чем «хочу в отпуск».",
          ],
        },
        {
          heading: "Пакет или свободный маршрут",
          bullets: [
            "Пакет: понятный объём услуг.",
            "Индивидуально: больше работы на этапе согласования, зато точнее попадание в запрос.",
          ],
        },
        {
          heading: "Freuly и оплата",
          body: "Платформа показывает людей; билеты и оплата — по договорённости с выбранным специалистом.",
        },
      ],
      specialistsTitle: "Консультанты (примеры)",
      specialistsEmpty:
        "Подходящие видимые профили появятся по мере наполнения базы.",
      faqTitle: "Вопросы",
      faq: [
        {
          question: "Бронирует ли консультант всё сам?",
          answer:
            "Зависит от человека — уточняйте в профиле или в переписке.",
        },
        {
          question: "Есть ли бесплатный первый созвон?",
          answer:
            "Спрашивайте напрямую — у разных специалистов разные правила.",
        },
      ],
      relatedTitle: "Рядом на Freuly",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм и путешествия",
          description: "Широкий обзор направлений.",
        },
        {
          href: "touren-ausfluege",
          label: "Экскурсии и туры",
          description: "Очные программы с гидом.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Другой формат длинного отдыха.",
        },
      ],
      cta: {
        heading: "К категории консультантов",
        body: "Сравните профили и напишите с датами и запросом.",
        buttonLabel: "Открыть категорию",
        ctaHref: "/ru/category/reiseberatung",
      },
    },
    ua: {
      slug: "reiseberatung",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle: "Підбір турів та консультації з подорожей в Німеччині | Freuly",
      metaDescription:
        "Індивідуальне планування поїздок і підтримка українською, російською або німецькою: на що звернути увагу до першого листа на Freuly.",
      h1: "Консультації з подорожей — що зібрати до першого контакту",
      breadcrumbsLabel: "Підбір турів",
      homeLabel: "Головна",
      intro: [
        "Консультант може допомогти з маршрутом, житлом, логістикою або документами — залежно від спеціалізації.",
        "Нижче — стислі орієнтири й приклади профілів з Freuly.",
      ],
      subcategoriesTitle: "Типові теми",
      subcategories: [
        {
          slug: "pauschalreisen",
          label: "Пакетні тури",
          description: "Зв’язані послуги — зрозуміліше по грошах.",
        },
        {
          slug: "individualreisen",
          label: "Індивідуальні поїздки",
          description: "Під ваш ритм і склад родини.",
        },
        {
          slug: "visa-hilfe",
          label: "Допомога з візою",
          description: "Поруч із календарем поїздки.",
        },
      ],
      sections: [
        {
          heading: "Що варто написати спочатку",
          body: [
            "Дати або сезон, хто їде, обмеження за станом здоров’я, транспортні вподобання.",
          ],
        },
        {
          heading: "Пакет чи свій маршрут",
          bullets: [
            "Пакет: менше кроків на етапі вибору.",
            "Свій маршрут: більше узгоджень, точніше влучення в очікування.",
          ],
        },
        {
          heading: "Оплата",
          body: "Freuly не є касою квитків — умови з фахівцем.",
        },
      ],
      specialistsTitle: "Приклади консультантів",
      specialistsEmpty:
        "Відповідні видимі анкети з’являться згодом.",
      faqTitle: "Питання",
      faq: [
        {
          question: "Чи знімає людина бронювання на себе?",
          answer:
            "Уточнюйте в профілі або в листі.",
        },
        {
          question: "Чи є пробний контакт?",
          answer:
            "Залежить від спеціаліста — питайте прямо.",
        },
      ],
      relatedTitle: "Пов’язане",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм і подорожі",
          description: "Огляд ширшого контуру.",
        },
        {
          href: "touren-ausfluege",
          label: "Екскурсії та тури",
          description: "Очні програми.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Формат багатоденного відпочинку.",
        },
      ],
      cta: {
        heading: "До категорії консультацій",
        body: "Фільтруйте й пишіть із конкретикою.",
        buttonLabel: "Відкрити категорію",
        ctaHref: "/ua/category/reiseberatung",
      },
    },
  },
};
