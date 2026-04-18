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
      metaTitle:
        "Reisen & Tourismus in Deutschland — Karte der nächsten Schritte | Freuly",
      metaDescription:
        "Überblick, wann Reiseberatung, Touren, Retreats oder Visa-Hilfe passen; typische Suchanlässe; was Sie in die Erstanfrage schreiben; Sprache als Filter — ohne Versprechen von Versicherung oder Visum.",
      h1: "Reisen & Tourismus — erst Einordnung, dann Spezialist:in wählen",
      breadcrumbsLabel: "Reisen & Tourismus",
      homeLabel: "Startseite",
      intro: [
        "Diese Seite ist die Landkarte: Sie hilft entscheiden, ob Sie zuerst eine Route planen, einen Tag mit Guide füllen, mehrere Tage in einem Retreat verbringen oder parallel Formalitäten sortieren — bevor Sie in eine Kategorie springen.",
        "Sie ersetzt keine Versicherung, keinen Visa-Bescheid und kein klassisches Reisebüro: Freuly zeigt Profile, mit denen Sie direkt sprechen, oft auf Ukrainisch, Russisch oder Deutsch.",
        "Unten eine Auswahl passender Einträge; verfeinern tun Sie in den jeweiligen Kategorien.",
      ],
      subcategoriesTitle: "Typische nächste Klicks — je nach Problemstellung",
      subcategories: [
        {
          slug: "reiseberatung",
          label: "Reiseberatung",
          description:
            "Wenn Route, Unterkünfte und Transport noch offen sind — Startpunkt für viele Reisen.",
        },
        {
          slug: "tourguide",
          label: "Tourguide",
          description:
            "Wenn Datum und Stadt stehen und ein geführter Tag oder halber Tag fehlt.",
        },
        {
          slug: "retreats",
          label: "Retreats",
          description:
            "Wenn Sie mehrere Tage einem klaren Programm widmen wollen — nicht klassischer Städtetrip.",
        },
        {
          slug: "visa-hilfe",
          label: "Visa & Formalitäten",
          description:
            "Parallel zur Route — klären Sie Grenzen der Unterstützung im Profil; keine Rechtsberatung.",
        },
        {
          slug: "gruppenreisen",
          label: "Gruppenreisen",
          description:
            "Wenn ein fertiger Termin und Gruppentakt für Sie vorteilhaft sind.",
        },
      ],
      sections: [
        {
          heading: "Welche Freuly-Seite wann?",
          body: [
            "Noch unsicher zwischen Hotel und Route: Reiseberatung-SEO-Seite oder Kategorie Reiseberatung.",
            "Hotel steht, Stadt ist klar, es fehlt Erlebnis: Touren & Ausflüge.",
            "Längere Auszeit mit Fokus Yoga/Meditation/Wellness: Retreats.",
            "Pflege von Angehörigen oder psychische Belastung parallel: verlinkte Lebensbereiche, nicht Mische aus einem Kontakt.",
          ],
        },
        {
          heading: "Suchanlässe, die hier häufig starten",
          bullets: [
            "Erste Deutschlandreise mit Familie — Überforderung bei Bahn-Tarifen.",
            " Geschäftsreise mit halbem freien Tag — soll lohnenswert sein.",
            "Besuch aus dem Ausland — Guide gesucht, der mehrsprachig erklärt.",
            "Retreat-Idee, aber unklar, ob Wochenende oder Woche reicht.",
          ],
        },
        {
          heading: "Erste Nachricht an eine Person auf Freuly",
          bullets: [
            "Zeitraum als Fenster, nicht nur ein Datum ohne Alternative.",
            "Reisende, Alter, Einschränkungen bei Gehen oder Treppen.",
            "Budget-Spannen — schützt vor unrealistischen Vorschlägen.",
            "Ob Kinder, Gepäckmenge oder Messe-Baggage eine Rolle spielen.",
          ],
        },
        {
          heading: "Online planen, Erlebnis vor Ort",
          body: "Typischer Mix: remote abstimmen, Tickets digital, Touren und Retreat-Tage physisch. Hybrid heißt hier Kombination aus Planung + Präsenz, nicht Video-Urlaub.",
        },
        {
          heading: "Risiken und Zusagen",
          body: "Freuly garantiert keine Versicherungsleistungen, keine Visumserteilung und keine Wetterlage — Lesen Sie Profilinfos und Nachrichten ernsthaft nach, bevor Sie zahlen.",
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
            "Nein — es ist eine Kontextseite plus Profilauswahl; Verträge schließen Sie mit der jeweiligen Person.",
        },
        {
          question: "Warum ist die Liste oben kurz?",
          answer:
            "Vorschau — vollständige Filter stehen in den Kategorien.",
        },
        {
          question: "Versicherung über die Plattform?",
          answer:
            "Nein — separat absichern.",
        },
        {
          question: "Was ist der Unterschied zu „Reiseberatung“?",
          answer:
            "Diese Seite ordnet breiter; die Reiseberatungsseite vertieft den Planungs-Intent.",
        },
        {
          question: "Was ist der Unterschied zu Touren?",
          answer:
            "Touren betonen geführte Tage; hier wählen Sie zuerst Ihre strategische Richtung.",
        },
      ],
      relatedTitle: "Vertiefungen",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Pflege & Betreuung",
          description:
            "Wenn Reisen neben Alltag in Deutschland koordiniert werden muss.",
        },
        {
          href: "psychologists-germany",
          label: "Psycholog:innen in Deutschland",
          description:
            "Wenn der emotionale Druck Reisen erschwert.",
        },
        {
          href: "health-psychology",
          label: "Psychologie & Gesundheit",
          description: "Breiter, wenn Stress nicht nur reisebezogen ist.",
        },
        {
          href: "retreats",
          label: "Retreats (Detail)",
          description: "Vertiefung bei mehrtägigen Programmen.",
        },
      ],
      cta: {
        heading: "In eine konkrete Kategorie wechseln",
        body: "Wenn Sie bereits wissen, dass Beratung zuerst kommt — öffnen Sie Reiseberatung; bei Stadttag Touren & Ausflüge.",
        buttonLabel: "Reiseberatung-Kategorie",
        ctaHref: "/de/category/reiseberatung",
      },
    },
    ru: {
      slug: "reisen-tourismus",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Туризм и поездки по Германии: карта разделов Freuly | Freuly",
      metaDescription:
        "Обзор без навязанного тура: куда кликнуть — консультации, гиды, ретриты, документы; примеры запросов; что написать в первом сообщении; без обещаний страховки и визы от платформы.",
      h1: "Туризм и путешествия — сначала выбрать тип задачи, потом специалиста",
      breadcrumbsLabel: "Туризм и путешествия",
      homeLabel: "Главная",
      intro: [
        "Эта страница помогает не потеряться между «спланировать всё», «нанять гида на день» и «поехать на ретрит на неделю».",
        "Она не бронирует за вас и не заменяет страховку — даёт контекст и ссылки на профили.",
        "Ниже — превью; точная фильтрация — по категориям.",
      ],
      subcategoriesTitle: "Куда идти по смыслу запроса",
      subcategories: [
        {
          slug: "reiseberatung",
          label: "Туристические консультации",
          description:
            "Маршрут и логистика с нуля или почти с нуля.",
        },
        {
          slug: "tourguide",
          label: "Гиды",
          description:
            "Когда город и дата есть, нужен сопровождающий день.",
        },
        {
          slug: "retreats",
          label: "Ретриты",
          description:
            "Несколько дней одной среды и расписания.",
        },
        {
          slug: "visa-hilfe",
          label: "Визы",
          description:
            "Параллельно поездке — уточняйте рамки помощи в профиле.",
        },
        {
          slug: "gruppenreisen",
          label: "Групповые туры",
          description:
            "Готовые даты и общий ритм.",
        },
      ],
      sections: [
        {
          heading: "Как не смешать разные услуги",
          body: [
            "Консультация строит поездку; гид заполняет день; ретрит — про удержание фокуса, не про список музеев.",
            "Семья, уход, стресс — смежные темы, но не одна кнопка «всё решить».",
          ],
        },
        {
          heading: "Частые сценарии",
          bullets: [
            "Первый приезд — страх сломаться на тарифах.",
            "Гости из-за границы — нужен язык экскурсии.",
            "Нужен отдых, но не очередной «просто отпуск» — интерес к ретриту.",
          ],
        },
        {
          heading: "Первое сообщение",
          bullets: [
            "Даты или окно.",
            "Состав и мобильность.",
            "Бюджет честно.",
          ],
        },
        {
          heading: "Онлайн и офлайн",
          body: "План удалённо — опыт на месте — обычная связка.",
        },
        {
          heading: "Ограничения платформы",
          body: "Нет гарантий погоды, виз и страховок — уточняйте у профилей и внешних сервисов.",
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
            "Нет, это витрина профилей.",
        },
        {
          question: "Почему мало карточек?",
          answer:
            "Это превью.",
        },
        {
          question: "Страховка?",
          answer:
            "Отдельно.",
        },
        {
          question: "Чем страница отличается от консультаций?",
          answer:
            "Здесь карта; там узкий консалтинг.",
        },
        {
          question: "Чем от экскурсий?",
          answer:
            "Экскурсии — про гида; здесь вы сначала выбираете слой задачи.",
        },
      ],
      relatedTitle: "Другие разделы",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Уход",
          description: "Параллельный быт.",
        },
        {
          href: "psychologists-germany",
          label: "Психологи",
          description: "Стресс и адаптация.",
        },
        {
          href: "health-psychology",
          label: "Психология и здоровье",
          description: "Шире запрос.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Подробнее про форматы.",
        },
      ],
      cta: {
        heading: "К консультациям по поездкам",
        body: "Если нужен маршрут целиком — откройте категорию; для одного дня с гидом идите в экскурсии.",
        buttonLabel: "Категория консультаций",
        ctaHref: "/ru/category/reiseberatung",
      },
    },
    ua: {
      slug: "reisen-tourismus",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Туризм і подорожі в Німеччині: карта розділів Freuly | Freuly",
      metaDescription:
        "Огляд, куди рухатися далі — консультації, гіди, ретрити; приклади запитів; без обіцянок страховки; мови в профілях.",
      h1: "Подорожі та туризм — спочатку тип задачі, потім фахівець",
      breadcrumbsLabel: "Туризм і подорожі",
      homeLabel: "Головна",
      intro: [
        "Сторінка допомагає відрізнити планування поїздки від найму гіда на день чи ретриту на кілька днів.",
        "Це не бронювальний центр і не страховик.",
        "Нижче — зразки; повнота — у категоріях.",
      ],
      subcategoriesTitle: "Типові наступні кроки",
      subcategories: [
        {
          slug: "reiseberatung",
          label: "Консультації",
          description: "Маршрут і логістика.",
        },
        {
          slug: "tourguide",
          label: "Гіди",
          description: "Супровід дня в місті.",
        },
        {
          slug: "retreats",
          label: "Ретрити",
          description: "Багатоденний фокус.",
        },
        {
          slug: "visa-hilfe",
          label: "Візи",
          description: "Уточнюйте межі допомоги.",
        },
        {
          slug: "gruppenreisen",
          label: "Групові тури",
          description: "Готові дати.",
        },
      ],
      sections: [
        {
          heading: "Що не змішувати",
          body: [
            "Консультант будує поїздку; гід веде маршрут дня; ретрит — інша логіка часу.",
            "Побут і здоров’я — інші розділи сайту.",
          ],
        },
        {
          heading: "Сценарії",
          bullets: [
            "Перший візит до Німеччини.",
            "Гості, яким потрібна мова супроводу.",
            "Цікавість до ретриту замість класичного туру.",
          ],
        },
        {
          heading: "Перше повідомлення",
          bullets: [
            "Діапазон дат.",
            "Склад родини.",
            "Бюджет-орієнтир.",
          ],
        },
        {
          heading: "Дистанційно й на місці",
          body: "План часто онлайн; прогулянки — офлайн.",
        },
        {
          heading: "Межі платформи",
          body: "Без гарантій віз і страхових виплат.",
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
            "Ні.",
        },
        {
          question: "Чому мало карток?",
          answer:
            "Прев’ю.",
        },
        {
          question: "Страховка?",
          answer:
            "Окремо.",
        },
        {
          question: "Відмінність від консультацій?",
          answer:
            "Тут — карта; там — вузький сервіс.",
        },
        {
          question: "Відмінність від екскурсій?",
          answer:
            "Гіди дня — в іншому розділі.",
        },
      ],
      relatedTitle: "Інші розділи",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Догляд",
          description: "Паралельні задачі.",
        },
        {
          href: "psychologists-germany",
          label: "Психологи",
          description: "Стрес.",
        },
        {
          href: "health-psychology",
          label: "Психологія",
          description: "Ширше.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Детальніше.",
        },
      ],
      cta: {
        heading: "До консультацій з подорожей",
        body: "Якщо потрібна вся логістика; для гіда на день — екскурсії.",
        buttonLabel: "Категорія консультацій",
        ctaHref: "/ua/category/reiseberatung",
      },
    },
  },
};
