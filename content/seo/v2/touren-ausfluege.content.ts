import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO page: guided tours & day trips (guides, excursions). */
export const tourenAusfluegeContent: LocalizedSeoCategory = {
  slug: "touren-ausfluege",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%tour%,category.ilike.%guide%,category.ilike.%ausfl%,category.ilike.%excursion%",
  content: {
    de: {
      slug: "touren-ausfluege",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle:
        "Touren & Ausflüge in Deutschland – Stadtführungen & Tagestrips | Freuly",
      metaDescription:
        "Geführte Touren und Ausflüge: Worin sich Stadt-, Themen- und Tagestrips unterscheiden und wie Sie Guides auf Freuly finden, die Deutsch, Russisch oder Ukrainisch sprechen.",
      h1: "Touren und Ausflüge — Deutschland mit Guide erleben",
      breadcrumbsLabel: "Touren & Ausflüge",
      homeLabel: "Startseite",
      intro: [
        "Ein gut geplanter halber oder ganzer Tag mit Guide kann mehr zeigen als oberflächliches Sightseeing aus der App: Kontext zu Geschichte, Architektur oder Küche, ohne selbst jede Verbindung puzzleartig zusammenzusetzen.",
        "Unten finden Sie typische Kategorien und eine Auswahl sichtbarer Profile; der Feinschliff (Sprache, Gruppengröße, barrierearme Routen) klären Sie direkt im Kontakt.",
      ],
      subcategoriesTitle: "Was Guide-Angebote oft unterscheidet",
      subcategories: [
        {
          slug: "stadtfuehrung",
          label: "Stadtführungen",
          description:
            "Kernzentren wie Berlin, Hamburg, München — klassisch zu Fuß oder mit ÖPNV-Hops.",
        },
        {
          slug: "tagesausfluege",
          label: "Tagesausflüge",
          description:
            "Hinaus in Regionen, Seen oder Burgen — meist längere Wegstrecke als reine Innenstadtführung.",
        },
        {
          slug: "thementouren",
          label: "Thementouren",
          description:
            "Ein roter Faden: Geschichte, jüdisches Erbe, Streetart, Kulinarik — je nach Expertise.",
        },
        {
          slug: "gruppenreisen",
          label: "Gruppenreisen",
          description:
            "Fester Termin und Gruppe — oft günstiger pro Person, weniger Individualität.",
        },
      ],
      sections: [
        {
          heading: "Woran erkennen Sie einen guten Fit?",
          body: [
            "Klare Dauer, Treffpunkt, maximale Gruppengröße und ob Tickets für Museen bereits eingepreist sind — alles sollte vorab geschrieben stehen.",
            "Fragen Sie bei längeren Touren nach Toiletten- und Pausenrhythmus, besonders mit Kindern oder eingeschränkter Gehfähigkeit.",
          ],
        },
        {
          heading: "Privat versus Gruppe",
          bullets: [
            "Privat: flexibler Tempo, höherer Preis.",
            "Öffentliche Termine: sozial, oft günstiger, weniger Spielraum.",
          ],
        },
        {
          heading: "Sprache wirklich für die Führung",
          body: "Achten Sie im Profil darauf, welche Sprachen für die Erklärung angeboten werden — nicht nur „spricht akzentfrei“, sondern ob der inhaltliche Teil Ihrer Sprache folgt.",
        },
      ],
      specialistsTitle: "Guides und Tour-Anbieter (Auswahl)",
      specialistsEmpty:
        "Wenn passende sichtbare Profile vorhanden sind, erscheinen sie hier.",
      faqTitle: "FAQ",
      faq: [
        {
          question: "Sind Trinkgelder üblich?",
          answer:
            "Das ist in Deutschland nicht zwingend wie in anderen Ländern; fragen Sie ruhig vorab nach lokal üblichen Erwartungen.",
        },
        {
          question: "Was bei schlechtem Wetter?",
          answer:
            "Seriöse Guides definieren Alternativen oder Storno-Regeln — klären Sie das schriftlich.",
        },
      ],
      relatedTitle: "Weitere Themen",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description: "Breitere Einordnung neben geführten Touren.",
        },
        {
          href: "reiseberatung",
          label: "Reiseberatung",
          description: "Wenn vor der Tour noch der Gesamtplan fehlt.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description: "Wenn Sie mehrere Tage gebunden bleiben möchten.",
        },
      ],
      cta: {
        heading: "Zur Guide- und Tour-Kategorie",
        body: "Filtern Sie nach Stadt und Sprache.",
        buttonLabel: "Kategorie Tourguides",
        ctaHref: "/de/category/tourguide",
      },
    },
    ru: {
      slug: "touren-ausfluege",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle: "Экскурсии и туры по Германии – гиды на вашем языке | Freuly",
      metaDescription:
        "Городские туры, тематические прогулки и однодневные поездки: как выбрать гида на Freuly и на что смотреть в описании программы.",
      h1: "Экскурсии и поездки с гидом — не только фото у достопримечательностей",
      breadcrumbsLabel: "Экскурсии и туры",
      homeLabel: "Главная",
      intro: [
        "Гид может связать историю, архитектуру и быт в цельный рассказ за несколько часов — а не оставить вас с обрывочными заметками из навигатора.",
        "Ниже — типы предложений и ссылки на категории; список профилей — живой срез базы Freuly.",
      ],
      subcategoriesTitle: "Отличия форматов",
      subcategories: [
        {
          slug: "stadtfuehrung",
          label: "Городские туры",
          description: "Пешком или с короткими пересадками в центре города.",
        },
        {
          slug: "tagesausfluege",
          label: "Однодневные выезды",
          description: "За город — природа, замки, соседние регионы.",
        },
        {
          slug: "thementouren",
          label: "Тематические маршруты",
          description: "Единая линия: история, кухня, стрит-арт.",
        },
        {
          slug: "gruppenreisen",
          label: "Групповые форматы",
          description: "Фиксированная дата и состав.",
        },
      ],
      sections: [
        {
          heading: "Проверка перед оплатой",
          body: [
            "Длительность, место встречи, язык экскурсии, входные билеты, размер группы и политика при отмене из-за погоды.",
          ],
        },
        {
          heading: "Индивидуально или в группе",
          bullets: [
            "Соло или малый круг: дороже, гибче.",
            "Открытая группа: дешевле с человека, меньше вариативности.",
          ],
        },
        {
          heading: "Язык экскурсии",
          body: "Смотрите, что язык указан именно для проведения маршрута, а не только «канцелярский» уровень.",
        },
      ],
      specialistsTitle: "Гиды и организаторы (примеры)",
      specialistsEmpty:
        "Подходящие анкеты появятся, когда база их покажет публично.",
      faqTitle: "Вопросы",
      faq: [
        {
          question: "Нужны ли чаевые?",
          answer:
            "В Германии нет жёсткой нормы как в ряде стран — уточняйте у гида заранее.",
        },
        {
          question: "Дождь и перенос",
          answer:
            "Нормально прописать запасной маршрут или правила возврата.",
        },
      ],
      relatedTitle: "Рядом",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм и путешествия",
          description: "Шире, чем только гиды.",
        },
        {
          href: "reiseberatung",
          label: "Подбор туров",
          description: "Если нужна полная логистика поездки.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Многодневный фокус.",
        },
      ],
      cta: {
        heading: "К гидам",
        body: "Фильтр по городу и языку экскурсии.",
        buttonLabel: "Категория гидов",
        ctaHref: "/ru/category/tourguide",
      },
    },
    ua: {
      slug: "touren-ausfluege",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle: "Екскурсії та тури Німеччиною – гіди вашою мовою | Freuly",
      metaDescription:
        "Міські тури, тематичні прогулянки та одноденні виїзди: як обрати гіда на Freuly і що уточнити перед бронюванням.",
      h1: "Екскурсії та виїзди з гідом — коли важлива подача, а не лише маршрут на карті",
      breadcrumbsLabel: "Екскурсії та тури",
      homeLabel: "Головна",
      intro: [
        "Гід перетворює набір точок на лінію історії й контексту — особливо якщо розповідь рідною мовою без постійного перекладу термінів.",
        "Нижче — формати та посилання на категорії; картки — живий фрагмент бази.",
      ],
      subcategoriesTitle: "Формати",
      subcategories: [
        {
          slug: "stadtfuehrung",
          label: "Міські тури",
          description: "Центр, пішки або короткий транспорт.",
        },
        {
          slug: "tagesausfluege",
          label: "Одноденні виїзди",
          description: "Регіон, природа, сусідні міста.",
        },
        {
          slug: "thementouren",
          label: "Тематичні маршрути",
          description: "Єдиний фокус: епоха, їжа, мистецтво.",
        },
        {
          slug: "gruppenreisen",
          label: "Групові тури",
          description: "Спільний календар.",
        },
      ],
      sections: [
        {
          heading: "Що погодити наперед",
          body: [
            "Тривалість, зустріч, мова програми, квитки, розмір групи, дощовий план.",
          ],
        },
        {
          heading: "Приват чи група",
          bullets: [
            "Приват: дорожче, гнучкіше.",
            "Група: дешевше з особи, менше свободи.",
          ],
        },
        {
          heading: "Мова супроводу",
          body: "Перевірте, що мова стосується саме екскурсійного супроводу.",
        },
      ],
      specialistsTitle: "Гіди (приклади)",
      specialistsEmpty:
        "З’являться відповідні публічні профілі.",
      faqTitle: "Питання",
      faq: [
        {
          question: "Чайові обов’язкові?",
          answer:
            "Уточніть у гіда — у Німеччині немає однієї норми.",
        },
        {
          question: "Дощ і скасування",
          answer:
            "Краще мати письмові правила переносу чи повернення.",
        },
      ],
      relatedTitle: "Поруч на Freuly",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм і подорожі",
          description: "Ширший огляд.",
        },
        {
          href: "reiseberatung",
          label: "Підбір турів",
          description: "Повна організація поїздки.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Багатоденний формат.",
        },
      ],
      cta: {
        heading: "До гідів",
        body: "Фільтри міста й мови.",
        buttonLabel: "Категорія гідів",
        ctaHref: "/ua/category/tourguide",
      },
    },
  },
};
