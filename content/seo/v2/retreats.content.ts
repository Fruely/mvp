import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Parent category page for the Freuly SEO layer: "retreats" hub.
 */
export const retreatsContent: LocalizedSeoCategory = {
  slug: "retreats",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%retreat%,category.ilike.%yoga%,category.ilike.%wellness%,category.ilike.%meditation%",
  content: {
    de: {
      slug: "retreats",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle:
        "Retreats in Deutschland: Yoga, Meditation, Wellness — Format wählen | Freuly",
      metaDescription:
        "Mehrtägige Auszeiten mit klarem Fokus: wie sich Retreat von Kurzurlaub und Tagestour unterscheidet, welche Fragen Sie an Anbieter stellen, online vs. Präsenz, und Profile auf Ukrainisch, Russisch oder Deutsch.",
      h1: "Retreats — mehrere Tage einem Rhythmus folgen",
      breadcrumbsLabel: "Retreats",
      homeLabel: "Startseite",
      intro: [
        "Retreats sind hier gemeint als gebundenes Programm über mehrere Tage — nicht als Marketing-Wort für jedes Hotelwochenende. Das unterscheidet die Seite vom allgemeinen „Reisen & Tourismus“ und von „Touren & Ausflügen“, wo es meist um einzelne Tage geht.",
        "Typische Nutzer:innen wissen bereits, dass sie Zeit blockieren wollen, sind sich aber unsicher zwischen Yoga-Fokus, Stille, Wellness oder kreativem Arbeiten — oder brauchen eine mehrsprachig geführte Gruppe.",
        "Unten eine Auswahl passender Profile; vergleichen Sie Anbieter in den Kategorien.",
      ],
      subcategoriesTitle: "Gängige Schwerpunkte",
      subcategories: [
        {
          slug: "yoga-retreats",
          label: "Yoga-Retreats",
          description:
            "Wenn Körperhaltung und Atem der rote Faden sind — oft klare Tagesfenster.",
        },
        {
          slug: "meditation",
          label: "Meditations-Retreats",
          description:
            "Wenn Stille, reduzierte Reize und längere Konzentration im Mittelpunkt stehen.",
        },
        {
          slug: "wellness-spa",
          label: "Wellness & Spa",
          description:
            "Wenn Regeneration und Körperarbeit gegenüber rein geistiger Arbeit dominieren.",
        },
        {
          slug: "kreativ-retreats",
          label: "Kreativ-Retreats",
          description:
            "Wenn ein künstlerisches Projekt endlich Produktionszeit bekommen soll.",
        },
      ],
      sections: [
        {
          heading: "Retreat versus klassischer Urlaub versus Tagestour",
          body: [
            "Urlaub offen geplant, Retreat mit Struktur — das unterscheidet die Erwartungen. Eine Tagestour (siehe Touren-Seite) ersetzt kein Retreat, weil der Effekt oft vom Durchhalten mehrerer Zyklen kommt.",
            "„Reisen & Tourismus“ hilft bei der großen Orientierung; diese Seite vertieft nur mehrtägige Fokusformate.",
          ],
        },
        {
          heading: "Suchanlässe und Energielevel",
          bullets: [
            "Hoher Stress, wenig Schlaf — eher Wellness oder sanftes Yoga statt Schweigewoche als erster Schritt.",
            "Überreizung und Gedankenkreisen — Meditation mit professioneller Begleitung.",
            "Projekt steht still — kreatives Retreat mit klaren Slots.",
          ],
        },
        {
          heading: "Online, Hybrid oder vor Ort",
          bullets: [
            "Kurze digitale Meditationszyklen möglich — weniger wirksam, wenn Körperarbeit oder Natur Teil des Konzepts sind.",
            "Yoga, Outdoor, Spa profitieren stark von Anwesenheit — der Ort ist Teil der Methode.",
          ],
        },
        {
          heading: "Welche Fragen vor Buchung sinnvoll sind",
          bullets: [
            "Gruppengröße, Sprache der Anleitung, All-Inclusive vs. Zusatzkosten.",
            "Tagesrhythmus, Schweigeanteile, körperliche Voraussetzungen.",
            "Storno bei Krankheit — schriftlich klären; Freuly garantiert keine Rückzahlung.",
          ],
        },
        {
          heading: "Erste Nachricht an Anbieter:innen",
          body: "Nennen Sie Erfahrungslevel, körperliche Einschränkungen und ob Sie eine mehrsprachige Gruppe brauchen — dann können seriöse Teams passend antworten oder von einem Format abraten.",
        },
        {
          heading: "Freuly-Rolle",
          body: "Wir bündeln Kontext und Profile — weder medizinische noch finanzielle Garantien für Outcomes; Vertrag und Risiko klären Sie mit dem Angebot.",
        },
      ],
      specialistsTitle: "Anbieter und Begleitpersonen",
      specialistsEmpty:
        "Sobald passende Anbieter in dieser Kategorie auf Freuly registriert sind, erscheinen sie an dieser Stelle.",
      faqTitle: "Häufige Fragen zu Retreats",
      faq: [
        {
          question: "Wie lange sollte ein Retreat dauern?",
          answer:
            "Ein Wochenende reicht oft zum Eintauchen; fünf bis sieben Tage sind üblich, wenn sich Gewohnheiten merklich verschieben sollen.",
        },
        {
          question: "Brauche ich Vorerfahrung?",
          answer:
            "Viele Formate labeln Einstiegsniveaus — trauen Sie sich, danach zu fragen statt zu raten.",
        },
        {
          question: "Chronische Erkrankungen?",
          answer:
            "Vorab offen kommunizieren; gute Anbieter passen an oder lehnen ab — kein Qualitätsmangel.",
        },
        {
          question: "Sprachen?",
          answer:
            "Es gibt gezielt mehrsprachige Gruppen — filtern Sie Profile.",
        },
        {
          question: "Preise?",
          answer:
            "Spans vom Tagesformat bis zur Woche mit Vollpension — im Profil nachlesen.",
        },
      ],
      relatedTitle: "Verwandte Seiten",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Psychologie & Gesundheit",
          description:
            "Wenn parallel therapeutische Arbeit offen ist — Retreat ersetzt sie nicht.",
        },
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description:
            "Größere Landkarte, wenn Sie noch unsicher sind, ob Retreat passt.",
        },
        {
          href: "touren-ausfluege",
          label: "Touren & Ausflüge",
          description:
            "Wenn Sie eigentlich nur einen Tag mit Guide brauchen.",
        },
      ],
      cta: {
        heading: "Retreat-Angebote in der Kategorie",
        body: "Filtern Sie nach Schwerpunkt und Sprache — dann gezielt nachfragen.",
        buttonLabel: "Kategorie Retreats",
        ctaHref: "/de/specialists/yoga-retreats",
      },
    },
    ru: {
      slug: "retreats",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Ретриты в Германии: йога, медитация, велнес — выбрать формат | Freuly",
      metaDescription:
        "Многодневные программы с устойчивым распорядком: чем ретрит отличается от отпуска и экскурсии, что спросить у организатора, онлайн или очно — и профили на русском, украинском или немецком.",
      h1: "Ретриты — несколько дней в одном ритме",
      breadcrumbsLabel: "Ретриты",
      homeLabel: "Главная",
      intro: [
        "Здесь «ретрит» — не любое слово в рекламе отеля, а формат с расписанием на несколько дней. Это ближе к осознанной паузе, чем к обзорной странице «туризм» и чем к однодневным турам.",
        "Частый запрос: выгорание, тревога, желание уединения или наоборот — творческой серии с дедлайном.",
        "Ниже — профили; уточняйте условия в переписке.",
      ],
      subcategoriesTitle: "Тематические входы",
      subcategories: [
        {
          slug: "yoga-retreats",
          label: "Йога-ретриты",
          description:
            "Когда важен корпус и дыхание.",
        },
        {
          slug: "meditation",
          label: "Медитация",
          description:
            "Тишина и снижение стимулов.",
        },
        {
          slug: "wellness-spa",
          label: "Велнес и спа",
          description:
            "Тело и восстановление впереди интеллекта.",
        },
        {
          slug: "kreativ-retreats",
          label: "Творческие ретриты",
          description:
            "Проект с датами завершения.",
        },
      ],
      sections: [
        {
          heading: "Не спутать с отпуском и экскурсией",
          body: [
            "Отпуск шире по смыслу; экскурсия короче по времени; ретрит держит фокус дольше одного дня.",
            "«Туризм и путешествия» — карта; эта страница — про много дней одного намерения.",
          ],
        },
        {
          heading: "Сценарии",
          bullets: [
            "Хроническая усталость — мягкий велнес или йогу легче, чем сразу молчание неделями.",
            "Тревожные мысли — медитация с поддержкой.",
            "Писательский ступор — креативные форматы.",
          ],
        },
        {
          heading: "Онлайн и офлайн",
          bullets: [
            "Короткие онлайн-интенсивы бывают; тело и природа сильнее офлайн.",
          ],
        },
        {
          heading: "Вопросы до оплаты",
          bullets: [
            "Язык группы, расписание, питание, отмена.",
            "Медицинские ограничения — прямо в письме.",
          ],
        },
        {
          heading: "Первый контакт",
          body: "Опыт, здоровье, язык — три опоры честного ответа.",
        },
        {
          heading: "Freuly",
          body: "Не обещает терапевтический результат — сопоставляет профили.",
        },
      ],
      specialistsTitle: "Ведущие и организаторы",
      specialistsEmpty:
        "Как только подходящие ведущие зарегистрируются в этой категории на Freuly, они появятся здесь.",
      faqTitle: "Частые вопросы о ретритах",
      faq: [
        {
          question: "Сколько дней иметь в виду?",
          answer:
            "Уикенд — прикосновение; неделя — чаще для устойчивого эффекта.",
        },
        {
          question: "Нужен опыт?",
          answer:
            "Смотрите уровень в описании.",
        },
        {
          question: "Здоровье?",
          answer:
            "Пишите заранее — уважающие себя организаторы корректируют или отказывают.",
        },
        {
          question: "Языки?",
          answer:
            "Есть билингвальные группы — спрашивайте.",
        },
        {
          question: "Цена?",
          answer:
            "Смотрите профили — диапазон огромный.",
        },
      ],
      relatedTitle: "Смежные разделы Freuly",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психология и здоровье",
          description: "Не замена терапии.",
        },
        {
          href: "reisen-tourismus",
          label: "Туризм и путешествия",
          description: "Если формат ещё не выбран.",
        },
        {
          href: "touren-ausfluege",
          label: "Экскурсии",
          description: "Один день с гидом.",
        },
      ],
      cta: {
        heading: "Ретриты в категории",
        body: "Фильтр по йоге/медитации и языку.",
        buttonLabel: "Открыть категорию",
        ctaHref: "/ru/specialists/yoga-retreats",
      },
    },
    ua: {
      slug: "retreats",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Ретрити в Німеччині: йога, медитація, велнес — обрати фокус | Freuly",
      metaDescription:
        "Багатоденні програми з чітким розкладом: відмінності від відпустки й одноденних турів; питання до організатора; онлайн/офлайн; профілі українською, російською чи німецькою.",
      h1: "Ретрити — кілька днів під одним настроєм програми",
      breadcrumbsLabel: "Ретрити",
      homeLabel: "Головна",
      intro: [
        "Тут ретрит — не просто гасло в готелі, а формат на кілька днів із розкладом. Це відрізняє сторінку від загального туризму й від екскурсій одного дня.",
        "Типові запити — виснаження, потреба в тиші або в творчому дедлайні.",
        "Нижче — профілі; деталі — у переписці.",
      ],
      subcategoriesTitle: "Напрями",
      subcategories: [
        {
          slug: "yoga-retreats",
          label: "Йога-ретрити",
          description: "Тіло і дихання.",
        },
        {
          slug: "meditation",
          label: "Медитація",
          description: "Стимули та голос у голові.",
        },
        {
          slug: "wellness-spa",
          label: "Велнес і спа",
          description: "Відновлення тіла.",
        },
        {
          slug: "kreativ-retreats",
          label: "Творчі ретрити",
          description: "Проєкт і фокус.",
        },
      ],
      sections: [
        {
          heading: "Відмінності",
          body: [
            "Відпустка ширша; екскурсія коротша; ретрит тримає фокус довше.",
            "Мапа подорожей — інша сторінка.",
          ],
        },
        {
          heading: "Сценарії",
          bullets: [
            "Вигорання — не завжди мітигована тижнева тиша з першого разу.",
            "Тривога — медитаційний супровід.",
            "Творчий ступор — арт-формати.",
          ],
        },
        {
          heading: "Онлайн і офлайн",
          bullets: [
            "Фізичні практики краще на місці.",
          ],
        },
        {
          heading: "Перед оплатою",
          bullets: [
            "Мова, харчування, скасування.",
            "Медобмеження чесно.",
          ],
        },
        {
          heading: "Перший лист",
          body: "Досвід, здоров’я, мова — три опори.",
        },
        {
          heading: "Freuly",
          body: "Показує профілі; не гарантує терапевтичний ефект.",
        },
      ],
      specialistsTitle: "Ведучі та організатори",
      specialistsEmpty:
        "Щойно в цій категорії з’являться відповідні ведучі на Freuly, вони будуть показані тут.",
      faqTitle: "Часті питання про ретрити",
      faq: [
        {
          question: "Тривалість?",
          answer:
            "Вихідні для проби; довше — для стійких змін.",
        },
        {
          question: "Досвід?",
          answer:
            "Дивіться рівень у описі.",
        },
        {
          question: "Здоров’я?",
          answer:
            "Попереджайте заздалегідь.",
        },
        {
          question: "Мови?",
          answer:
            "Шукайте багатомовні групи.",
        },
        {
          question: "Ціна?",
          answer:
            "У профілях — широкий діапазон.",
        },
      ],
      relatedTitle: "Суміжні розділи Freuly",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія і здоров’я",
          description: "Не заміна терапії.",
        },
        {
          href: "reisen-tourismus",
          label: "Подорожі та туризм",
          description: "Ширший огляд.",
        },
        {
          href: "touren-ausfluege",
          label: "Екскурсії",
          description: "Один день.",
        },
      ],
      cta: {
        heading: "Категорія ретритів",
        body: "Фільтр за фокусом і мовою.",
        buttonLabel: "Відкрити",
        ctaHref: "/ua/specialists/yoga-retreats",
      },
    },
  },
};
