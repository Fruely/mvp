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
        "Touren & Tagestrips in Deutschland: Geführte Erlebnisse wählen | Freuly",
      metaDescription:
        "Stadt-, Themen- und Tagesausflüge mit Guide: wie Sie passende Angebote filtern, Vor-Ort versus Gruppe, was vor Buchung klar sein sollte, und Profile auf Ukrainisch, Russisch oder Deutsch.",
      h1: "Touren & Ausflüge — wenn der Tag schon gebucht ist und der Guide fehlt",
      breadcrumbsLabel: "Touren & Ausflüge",
      homeLabel: "Startseite",
      intro: [
        "Diese Seite ist der Einstieg, wenn Ihre Reise steht oder Ihr Wochenende brauchbar werden soll: Sie suchen jemanden, der vor Ort erklärt, navigiert und Zeitfenster abfedert — nicht jemanden, der vom Nullpunkt den ganzen Urlaub plant (dafür gibt es „Reiseberatung“).",
        "Typische Suchanlässe: erster Besuch in einer Großstadt, Geburtstag mit Familie, Firmenbesuch mit Gästen aus dem Ausland oder ein Tag Entlastung zwischen Messe und Business-Terminen.",
        "Unten sehen Sie eine Profilauswahl; detailliert filtern Sie in der Guide-Kategorie.",
      ],
      subcategoriesTitle: "Formate kurz erklärt",
      subcategories: [
        {
          slug: "stadtfuehrung",
          label: "Stadtführungen",
          description:
            "Meist zwei bis vier Stunden im Zentrum — gut, wenn Sie rasch Orientierung wollen.",
        },
        {
          slug: "tagesausfluege",
          label: "Tagesausflüge",
          description:
            "Weiter raus — Seen, Burgen, Nachbarregionen; längere Bus- oder Bahnzeiten einplanen.",
        },
        {
          slug: "thementouren",
          label: "Thementouren",
          description:
            "Kulinarik, Geschichte, Architektur — ein roter Faden statt bunter Mix.",
        },
        {
          slug: "gruppenreisen",
          label: "Gruppenreisen",
          description:
            "Feste Daten, gemeinsamer Takt — oft günstiger pro Kopf, weniger Tempo-Flex.",
        },
      ],
      sections: [
        {
          heading: "Touren-Seite versus Reiseberatung versus Tourismus-Überblick",
          body: [
            "„Reisen & Tourismus“ ordnet das große Feld; „Reiseberatung“ hilft beim Gesamtrouting. Hier geht es um die nächste konkrete Einheit: eine geführte Einheit mit Start- und Endzeit.",
            "Wenn Sie noch keine Unterkunft haben, kann trotzdem eine Tour sinnvoll sein — dann klären Sie Treffpunkt flexibel.",
          ],
        },
        {
          heading: "Worauf Sie vor der Buchung achten",
          bullets: [
            "Dauer, Treffpunkt, maximale Gruppengröße, Sprache der Führung.",
            "Ob Tickets, Snacks oder öffentliche Verkehrsmittel im Preis sind.",
            "Barriere: Kopfsteinpflaster, Treppen, Pausenrhythmus bei Kindern oder Gehwagen.",
            "Storno und Alternativplan bei Regen — schriftlich.",
          ],
        },
        {
          heading: "Privat, Kleingruppe oder offener Termin",
          bullets: [
            "Privat oder sehr klein: höhere Kosten, eigenes Tempo.",
            "Offene Gruppe: Budget freundlicher, weniger Eingriffsmöglichkeit.",
          ],
        },
        {
          heading: "Online-Infos, Präsenz-Erlebnis",
          body: "Sie buchen digital, erleben vor Ort. Hybrid ist selten sinnvoll — Ausnahme: Vorbereitungs-Call; die Führung selbst lebt vom realen Raum.",
        },
        {
          heading: "Erste Nachricht an eine Guide-Person",
          body: "Nennen Sie Datum, ungefähre Gruppengröße, Sprache und ob Kinder dabei sind — dann kann jemand ehrlich sagen, ob Route und Geschwindigkeit passen.",
        },
        {
          heading: "So nutzen Sie Freuly",
          body: "Profil, Sprachen und beschriebene Leistungen genau lesen; dieselbe Anfrage zweimal mit leicht anderer Formulierung stellen — so erkennen Sie, wer konkret nachfragt statt nur vorformulierte Antworten zu senden.",
        },
      ],
      specialistsTitle: "Guides und Tour-Anbieter (Auswahl)",
      specialistsEmpty:
        "Wenn passende sichtbare Profile vorhanden sind, erscheinen sie hier.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Ist Trinkgeld Pflicht?",
          answer:
            "In Deutschland gibt es kein US-Modell; fragen Sie vorab nach lokalen Gepflogenheiten.",
        },
        {
          question: "Regen — was dann?",
          answer:
            "Gute Anbieter definieren Indoor-Alternativen oder klare Storno-Regeln.",
        },
        {
          question: "Übernimmt Freuly die Tickets?",
          answer:
            "Nein — Zahlungsflüsse laufen mit dem Profil; lesen Sie, was im Paket steht.",
        },
        {
          question: "Brauche ich schon ein Hotel?",
          answer:
            "Nicht zwingend, aber der Treffpunkt muss zum Tag passen — stimmen Sie ihn ab.",
        },
      ],
      relatedTitle: "Verknüpfte Einstiege",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description:
            "Wenn Sie noch nicht wissen, ob eher Beratung, Tour oder Retreat passt.",
        },
        {
          href: "reiseberatung",
          label: "Reiseberatung",
          description:
            "Wenn Logistik und Unterkunft noch offen sind, bevor ein Guide Sinn macht.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description:
            "Mehrtägige intensive Formate — nicht dasselbe wie ein Stadtspaziergang.",
        },
      ],
      cta: {
        heading: "Guides in der Kategorie öffnen",
        body: "Stadt und Sprache filtern, dann konkrete Nachricht.",
        buttonLabel: "Kategorie Tourguides",
        ctaHref: "/de/specialists/tourguide",
      },
    },
    ru: {
      slug: "touren-ausfluege",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Экскурсии и однодневные поездки в Германии — выбрать гида | Freuly",
      metaDescription:
        "Узкий сценарий: вам нужен гид и программа на часы или день, а не планирование всей поездки с нуля. Что спросить до оплаты, приват или группа, язык экскурсии.",
      h1: "Экскурсии и выезды — когда нужен гид, а не новый тур с чистого листа",
      breadcrumbsLabel: "Экскурсии и туры",
      homeLabel: "Главная",
      intro: [
        "Страница для тех, у кого даты и город уже определены, а нужна живая подача: маршрут, история, ритм пешеходной группы.",
        "Если вы ещё собираете отели и билеты по всей Европе — логичнее начать с «Туристических консультаций»; если хотите много дней одной темы — смотрите «Ретриты».",
        "Ниже — срез профилей; фильтрация — в категории гидов.",
      ],
      subcategoriesTitle: "Чем форматы отличаются",
      subcategories: [
        {
          slug: "stadtfuehrung",
          label: "Городские экскурсии",
          description:
            "Несколько часов в центре — быстрый захват места.",
        },
        {
          slug: "tagesausfluege",
          label: "Однодневные выезды",
          description:
            "Дальше от центра — считайте дорогу и усталость.",
        },
        {
          slug: "thementouren",
          label: "Тематические туры",
          description:
            "Один фокус — еда, эпоха, субкультура.",
        },
        {
          slug: "gruppenreisen",
          label: "Групповые слоты",
          description:
            "Фиксированные даты, общий темп.",
        },
      ],
      sections: [
        {
          heading: "Где здесь граница с другими разделами",
          body: [
            "«Туризм и путешествия» — карта; «консультации» — сбор всей поездки; здесь — конкретный гид и слот времени.",
            "Платформа не продаёт билеты как агент — договор с человеком из профиля.",
          ],
        },
        {
          heading: "Чеклист до оплаты",
          bullets: [
            "Время, место встречи, язык ведения.",
            "Включены ли музейные входы и транспорт.",
            "Размер группы и отмена при плохой погоде.",
            "Особенности детей и колясок.",
          ],
        },
        {
          heading: "Приват и группа",
          bullets: [
            "Приват — цена выше, маршрут гибче.",
            "Открытая группа — дешевле, меньше коррекций.",
          ],
        },
        {
          heading: "Первое сообщение гиду",
          body: "Дата, примерный состав, язык, если есть дети — достаточно, чтобы отсеять несовпадение по темпу.",
        },
        {
          heading: "Freuly как старт",
          body: "Сравните 2–3 анкеты с одинаковым запросом — видно, кто уточняет детали.",
        },
      ],
      specialistsTitle: "Гиды и организаторы (примеры)",
      specialistsEmpty:
        "Подходящие анкеты появятся, когда база их покажет публично.",
      faqTitle: "Вопросы",
      faq: [
        {
          question: "Обязательны ли чаевые?",
          answer:
            "Уточняйте культурную норму заранее.",
        },
        {
          question: "Дождь?",
          answer:
            "Нужен запасной сценарий или чёткие правила отмены.",
        },
        {
          question: "Freuly бронирует билеты?",
          answer:
            "Нет — смотрите описание в профиле.",
        },
        {
          question: "Нужен ли уже отель?",
          answer:
            "Желательно согласовать точку встречи под ваш случай.",
        },
      ],
      relatedTitle: "Рядом",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм и путешествия",
          description: "Если формат ещё не выбран.",
        },
        {
          href: "reiseberatung",
          label: "Туристические консультации",
          description: "Если нужна вся логистика поездки.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Много дней одной практики.",
        },
      ],
      cta: {
        heading: "К списку гидов",
        body: "Город + язык экскурсии.",
        buttonLabel: "Категория гидов",
        ctaHref: "/ru/specialists/tourguide",
      },
    },
    ua: {
      slug: "touren-ausfluege",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Екскурсії та одноденні виїзди в Німеччині — обрати гіда | Freuly",
      metaDescription:
        "Конкретний намір: гід на день або кілька годин, не повна туроператорська послуга. Порівняння з консультаціями та загальним туризмом, що уточнити перед бронюванням.",
      h1: "Екскурсії та виїзди — коли потрібен супровід дня, а не новий маршрут з нуля",
      breadcrumbsLabel: "Екскурсії та тури",
      homeLabel: "Головна",
      intro: [
        "Сторінка для тих, хто вже має місто й дату, але хоче професійну подачу матеріалу й маршрут без самостійного копання в довідниках.",
        "Якщо треба зібрати всю поїздку з переїздами й готелями — спершу «Підбір турів»; якщо багатоденний фокус однієї теми — «Ретрити».",
        "Нижче — фрагмент бази; далі — категорія гідів.",
      ],
      subcategoriesTitle: "Формати",
      subcategories: [
        {
          slug: "stadtfuehrung",
          label: "Міські тури",
          description: "Коротко й щільно в центрі.",
        },
        {
          slug: "tagesausfluege",
          label: "Одноденні виїзди",
          description: "Більше дороги, інший ритм.",
        },
        {
          slug: "thementouren",
          label: "Тематичні маршрути",
          description: "Один акцент історії чи кухні.",
        },
        {
          slug: "gruppenreisen",
          label: "Групові виїзди",
          description: "Спільний календар.",
        },
      ],
      sections: [
        {
          heading: "Відмінності від інших сторінок",
          body: [
            "«Туризм і подорожі» дає карту; «консультації» будують усю поїздку; тут — один гід і часова одиниця.",
            "Freuly не гарантує погоду й не продає квитки як агентство.",
          ],
        },
        {
          heading: "Що погодити",
          bullets: [
            "Тривалість, зустріч, мова гіда.",
            "Включені квитки й транспорт чи ні.",
            "Розмір групи, Plan Б дощу.",
            "Доступність для дітей.",
          ],
        },
        {
          heading: "Приват чи група",
          bullets: [
            "Приват — дорожче, гнучкіше.",
            "Група — економніше, менше варіацій.",
          ],
        },
        {
          heading: "Перший лист",
          body: "Дата, склад, мова — мінімум для чесної відповіді «так/ні».",
        },
        {
          heading: "Старт на Freuly",
          body: "Однаковий запит кільком профілям показує рівень деталізації відповіді.",
        },
      ],
      specialistsTitle: "Гіди (приклади)",
      specialistsEmpty:
        "З’являться відповідні публічні профілі.",
      faqTitle: "Питання",
      faq: [
        {
          question: "Чайові?",
          answer:
            "Уточнюйте до виїзду.",
        },
        {
          question: "Дощ?",
          answer:
            "Має бути письмовий запасний план.",
        },
        {
          question: "Квитки через Freuly?",
          answer:
            "Ні — умови в профілі.",
        },
        {
          question: "Готель обов’язковий?",
          answer:
            "Ні, але точку зустрічі підлаштовують під вашу логістику.",
        },
      ],
      relatedTitle: "Поруч",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм і подорожі",
          description: "Ширший вибір, якщо тип відпочинку не визначений.",
        },
        {
          href: "reiseberatung",
          label: "Підбір турів",
          description: "Повна організація маршруту.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Довгі програми однієї теми.",
        },
      ],
      cta: {
        heading: "До гідів",
        body: "Місто й мова в фільтрі.",
        buttonLabel: "Категорія гідів",
        ctaHref: "/ua/specialists/tourguide",
      },
    },
  },
};
