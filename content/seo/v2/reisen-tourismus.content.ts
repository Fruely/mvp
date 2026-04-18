import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO hub: travel & tourism in Germany — planning, tours, retreats (parent). */
export const reisenTourismusContent: LocalizedSeoCategory = {
  slug: "reisen-tourismus",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%reise%,category.ilike.%touris%,category.ilike.%travel%,category.ilike.%retreat%",
  content: {
    de: {
      slug: "reisen-tourismus",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle: "Reisen & Tourismus in Deutschland – Beratung & Angebote | Freuly",
      metaDescription:
        "Reiseplanung, Guides und Retreats in Deutschland: Orientierung zu Angeboten und wie Sie auf Freuly deutsch-, russisch- oder ukrainischsprachige Anbieter finden.",
      h1: "Reisen und Tourismus in Deutschland — vom Plan bis zur ersten Buchung",
      breadcrumbsLabel: "Reisen & Tourismus",
      homeLabel: "Startseite",
      intro: [
        "Deutschland lässt sich auf sehr verschiedene Weisen erleben: Städtereisen mit Führung, organisierte Tagesausflüge, individuell zusammengestellte Rundreisen oder bewusste Retreat-Formate. Was für Sie passt, hängt weniger vom Marketingwort auf der Startseite ab als von Budget, Zeitraum und dem, ob Sie lieber flexibel selbst planen oder eine klare Struktur von außen brauchen.",
        "Diese Seite ordnet typische Wege ein und verweist auf öffentliche Kategorie-Seiten auf Freuly — inklusive einer Auswahl sichtbarer Profile, die grob zum Themenfeld passen.",
      ],
      subcategoriesTitle: "Typische Einstiege (Kategorien)",
      subcategories: [
        {
          slug: "reiseberatung",
          label: "Reiseberatung",
          description:
            "Individuelle Planung: Ziele, Unterkünfte, Transfers, oft auch organisatorische Hilfe bei Formalitäten.",
        },
        {
          slug: "tourguide",
          label: "Tourguide",
          description:
            "Geführte Touren vor Ort — Stadt, Region oder Themenschwerpunkt mit erklärender Begleitung.",
        },
        {
          slug: "retreats",
          label: "Retreats",
          description:
            "Mehrtägige Programme mit Fokus auf Yoga, Wellness, Kreativität oder Stille — oft mit fester Tagesstruktur.",
        },
        {
          slug: "visa-hilfe",
          label: "Visa & Formalitäten",
          description:
            "Unterstützung rund um Dokumente und Anträge — sinnvoll parallel zu konkreter Reiseplanung zu klären.",
        },
        {
          slug: "gruppenreisen",
          label: "Gruppenreisen",
          description:
            "Feste Termine und gemeinsamer Rhythmus — gut, wenn Sie Anschluss an eine Gruppe suchen.",
        },
      ],
      sections: [
        {
          heading: "Warum Sprache beim Thema Reisen oft der erste Filter ist",
          body: [
            "Bahnverbindungen, Umbuchungsregeln oder Hotelkategorien missversteht man schnell — umso mehr, wenn alles in zweiter Sprache koordiniert wird. Ein Berater oder Guide, der mit Ihnen auf Ukrainisch, Russisch oder Deutsch denselben Plan bespricht, spart Zeit und Nerven.",
            "Freuly ist kein klassisches Reisebüro-Portal: Sie sehen Profile von selbstständigen Anbietenden und treten direkt Kontakt auf Basis transparenter Angaben.",
          ],
        },
        {
          heading: "Worauf Sie vor der ersten Nachricht achten sollten",
          bullets: [
            "Zeitraum und ungefähres Budget — auch als Spanne.",
            "Ob Kinder, eingeschränkte Mobilität oder großes Gepäck eine Rolle spielen.",
            "Ob Sie Flexibilität brauchen (Storno, Umbuchung) oder ein fixes Paket bevorzugen.",
          ],
        },
        {
          heading: "Online-Beratung oder vor Ort?",
          body: "Viele Abläufe lassen sich digital starten; Touren und Tagestrips finden natürlich vor Ort statt. Hybrid ist üblich: Planung remote, Erlebnis in Präsenz.",
        },
      ],
      specialistsTitle: "Passende Profile (Auswahl)",
      specialistsEmpty:
        "Wenn passende Anbieter in der Freuly-Datenbank sichtbar sind, erscheinen sie hier.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Ist Freuly ein Reiseveranstalter?",
          answer:
            "Nein. Wir zeigen Profile unabhängiger Spezialistinnen und Spezialisten; Vertragsinhalte klären Sie mit der jeweiligen Person.",
        },
        {
          question: "Ersetzt die Plattform eine Reiserücktrittsversicherung?",
          answer:
            "Nein. Versicherungen und rechtliche Absicherung sind separat zu prüfen — die Profile beschreiben Leistungen, ersetzen aber keine Police.",
        },
        {
          question: "Was bedeutet die Liste oben bei „Spezialisten“?",
          answer:
            "Es ist eine grobe Vorschau passender Einträge aus der Datenbank; die vollständige Filterung erfolgt über die jeweilige Kategorie-Seite.",
        },
      ],
      relatedTitle: "Weitere Freuly-Bereiche",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Pflege & Betreuung",
          description: "Wenn parallel Alltagshilfe in Deutschland Thema ist.",
        },
        {
          href: "psychologists-germany",
          label: "Psycholog:innen in Deutschland",
          description: "Reise- und Anpassungsstress begleitend abfedern.",
        },
        {
          href: "health-psychology",
          label: "Psychologie & Gesundheit",
          description: "Übergeordnete Gesundheitsthemen neben Reiseplanung.",
        },
        {
          href: "retreats",
          label: "Retreats (Detail-Hub)",
          description: "Vertiefung zu Auszeit-Formaten.",
        },
      ],
      cta: {
        heading: "In die Reise-Kategorie wechseln",
        body: "Filtern Sie nach passendem Profil und schreiben Sie eine konkrete Erstanfrage.",
        buttonLabel: "Reise-Themen in der Kategorie",
        ctaHref: "/de/category/reiseberatung",
      },
    },
    ru: {
      slug: "reisen-tourismus",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle: "Туризм и поездки по Германии — консультации и гиды | Freuly",
      metaDescription:
        "Как планировать поездки по Германии и находить на Freuly специалистов на русском, украинском или немецком: консультации, экскурсии и ретриты.",
      h1: "Путешествия и туризм в Германии — с чего начать план",
      breadcrumbsLabel: "Туризм и путешествия",
      homeLabel: "Главная",
      intro: [
        "Германию можно проехать по-разному: с гидом по городу, заранее собранным туром, полностью самостоятельно или с ретритом «внутрь отдыха». Выбор зависит не от рекламного слогана, а от времени, бюджета и того, нужен ли вам жёсткий сценарий или свобода маршрута.",
        "Ниже — ориентиры по направлениям и ссылки на категории Freuly плюс выборка профилей, связанных с туризмом и поездками.",
      ],
      subcategoriesTitle: "Частые направления",
      subcategories: [
        {
          slug: "reiseberatung",
          label: "Туристические консультации",
          description:
            "Подбор маршрута, отелей, трансферов, иногда помощь с документами.",
        },
        {
          slug: "tourguide",
          label: "Гиды",
          description: "Пешие и тематические туры с сопровождением.",
        },
        {
          slug: "retreats",
          label: "Ретриты",
          description: "Форматы на несколько дней с фокусом на практике и распорядке.",
        },
        {
          slug: "visa-hilfe",
          label: "Визы и формальности",
          description: "Сопровождение по документам — разумно сочетать с планом поездки.",
        },
        {
          slug: "gruppenreisen",
          label: "Групповые туры",
          description: "Общий календарь и состав — если важен контакт с группой.",
        },
      ],
      sections: [
        {
          heading: "Зачем на первом шаге думать о языке",
          body: [
            "Ж/д соединения, условия отмены и классы отелей легко перепутать, если всё читается «скользко» на втором языке. Консультант или гид, с которым вы говорите на привычном языке, снижает количество недопониманий.",
            "Freuly не заменяет классический туроператор: вы смотрите профили и пишете людям напрямую.",
          ],
        },
        {
          heading: "Что указать в первом сообщении",
          bullets: [
            "Даты или хотя бы месяц и гибкость ± несколько дней.",
            "Состав семьи, дети, особые потребности по здоровью.",
            "Ориентир по бюджету без стеснения — так легче предложить реалистичный вариант.",
          ],
        },
        {
          heading: "Онлайн и офлайн",
          body: "План часто строится удалённо, а прогулки и поездки проходят очно — такая комбинация обычна.",
        },
      ],
      specialistsTitle: "Примеры анкет",
      specialistsEmpty:
        "Когда в базе появятся подходящие видимые профили, они отобразятся здесь.",
      faqTitle: "Вопросы",
      faq: [
        {
          question: "Freuly — туроператор?",
          answer:
            "Нет, это витрина профилей; договорённости и оплата — с выбранным специалистом.",
        },
        {
          question: "Есть ли страховка через платформу?",
          answer:
            "Нет, страховки и отмены бронирования оформляются отдельно.",
        },
        {
          question: "Почему список короткий?",
          answer:
            "Это превью; полный поиск — в соответствующих категориях.",
        },
      ],
      relatedTitle: "Другие разделы",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Уход и сопровождение",
          description: "Если параллельно важен быт и забота о близких.",
        },
        {
          href: "psychologists-germany",
          label: "Психологи в Германии",
          description: "Стресс переезда и дороги.",
        },
        {
          href: "health-psychology",
          label: "Психология и здоровье",
          description: "Широкий контекст здоровья.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Отдельный хаб про форматы ретритов.",
        },
      ],
      cta: {
        heading: "К консультациям по поездкам",
        body: "Откройте категорию и сравните предложения.",
        buttonLabel: "Категория «консультации по турам»",
        ctaHref: "/ru/category/reiseberatung",
      },
    },
    ua: {
      slug: "reisen-tourismus",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle: "Туризм і подорожі в Німеччині — поради й гіди | Freuly",
      metaDescription:
        "Як планувати подорожі Німеччиною й знаходити на Freuly фахівців українською, російською чи німецькою: консультації, тури та ретрити.",
      h1: "Подорожі та туризм у Німеччині — з чого складати маршрут",
      breadcrumbsLabel: "Туризм і подорожі",
      homeLabel: "Головна",
      intro: [
        "Німеччину можна відкривати по-різному: з міським гідом, готовим туром, повністю самостійно або через ретрит із чітким розкладом. Логіка вибору зав’язана на часі, бюджеті й тому, чи потрібна вам зовнішня структура.",
        "Нижче — карта напрямів і посилання на категорії Freuly, а також вибірка профілів, пов’язаних із подорожами й туризмом.",
      ],
      subcategoriesTitle: "Типові входи",
      subcategories: [
        {
          slug: "reiseberatung",
          label: "Консультації з подорожей",
          description:
            "Маршрут, готелі, трансфери, інколи допомога з паперами.",
        },
        {
          slug: "tourguide",
          label: "Гіди",
          description: "Екскурсії та тематичні прогулянки.",
        },
        {
          slug: "retreats",
          label: "Ретрити",
          description: "Багатоденні програми з акцентом на практику.",
        },
        {
          slug: "visa-hilfe",
          label: "Візи та документи",
          description: "Логічно узгоджувати з планом поїздки.",
        },
        {
          slug: "gruppenreisen",
          label: "Групові тури",
          description: "Стійкий склад і спільний графік.",
        },
      ],
      sections: [
        {
          heading: "Чому мова вирішує на старті",
          body: [
            "Розклад потягів, правила скасування та категорії житла простіше узгоджувати рідною мовою — менше двозначностей.",
            "Freuly не є заміною туроператору: ви обираєте людину й пишете їй безпосередньо.",
          ],
        },
        {
          heading: "Що написати в першому листі",
          bullets: [
            "Дати або місяць і можлива гнучкість.",
            "Склад родини й особливі потреби.",
            "Орієнтир витрат — так простіше запропонувати реалістичний план.",
          ],
        },
        {
          heading: "Онлайн проти офлайну",
          body: "План часто збирають дистанційно, а прогулянки й поїздки проходять на місці.",
        },
      ],
      specialistsTitle: "Приклади профілів",
      specialistsEmpty:
        "Як з’являться відповідні видимі анкети, вони з’являться тут.",
      faqTitle: "Питання",
      faq: [
        {
          question: "Чи Freuly — туроператор?",
          answer:
            "Ні; угоди й оплата — безпосередньо з фахівцем.",
        },
        {
          question: "Чи є страхування?",
          answer:
            "Ні, оформлюйте страхування окремо.",
        },
        {
          question: "Чому мало карток?",
          answer:
            "Це прев’ю; повний набір — у категоріях.",
        },
      ],
      relatedTitle: "Інші розділи",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Догляд і супровід",
          description: "Паралельні побутові задачі.",
        },
        {
          href: "psychologists-germany",
          label: "Психологи в Німеччині",
          description: "Стрес переїзду й подорожей.",
        },
        {
          href: "health-psychology",
          label: "Психологія і здоров’я",
          description: "Ширший контекст.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Окремий огляд форматів.",
        },
      ],
      cta: {
        heading: "До консультацій з подорожей",
        body: "Відкрийте категорію та порівняйте профілі.",
        buttonLabel: "Категорія рейзебератунг",
        ctaHref: "/ua/category/reiseberatung",
      },
    },
  },
};
