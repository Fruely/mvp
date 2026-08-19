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
            "Geschäftsreise mit halbem freien Tag — soll lohnenswert sein.",
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
        ctaHref: "/de/specialists/reiseberatung",
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
        "Карта тематики туризма в Германии: когда уместна туристическая консультация, гид на день, мульти-дневный ретрит или параллельная помощь с визой и формальностями; типичные сценарии и что написать в первом сообщении; язык как фильтр в профилях — без обещаний страховки, визы или роли классического турагентства.",
      h1: "Туризм и путешествия — сначала выбрать тип задачи, потом специалиста",
      breadcrumbsLabel: "Туризм и путешествия",
      homeLabel: "Главная",
      intro: [
        "Эта страница — карта решений: помогает понять, сперва ли строить маршрут и логистику, достаточно ли гида на один день, нужен ли многодневный ретрит с расписанием или параллельно разбираться с документами — прежде чем уходить в узкую категорию.",
        "Freuly не заменяет страховку, визовое решение или классическое агентство: на платформе видны профили людей, с которыми можно написать напрямую; часто есть украинский, русский или немецкий в описании.",
        "Ниже — примеры карточек специалистов; полнота фильтров и списков — в разделах по ссылкам.",
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
          heading: "Какая страница Freuly когда",
          body: [
            "Ещё не ясно, отель или маршрут: страница туристических консультаций или категория Reiseberatung.",
            "Отель и город выбраны, не хватает программы дня: экскурсии и однодневные туры.",
            "Нужна многосуточная пауза с йогой, медитацией или wellness-фокусом: ретриты.",
            "Параллельно поездке нужны формальности или виза: отдельный блок, без смешивания с отдыхом в одном чате.",
          ],
        },
        {
          heading: "Частые сценарии, откуда люди заходят сюда",
          bullets: [
            "Первая поездка по Германии с семьёй — перегруз тарифами ж/д и билетами.",
            "Деловая поездка с полднем свободы — хочется, чтобы время не потерялось впустую.",
            "Гости из другой страны — нужен гид, который объясняет на понятном вам языке.",
            "Есть идея ретрита, но неясно, хватит ли уикенда или нужна неделя.",
          ],
        },
        {
          heading: "Первое сообщение человеку с Freuly",
          bullets: [
            "Окно дат с запасом, а не одно жёсткое число без альтернатив.",
            "Кто едет, возраст, ограничения по ходьбе и лестницам.",
            "Диапазон бюджета — чтобы предложения не улетали в нереальность.",
            "Дети, объём багажа, нестандартные вещи (мессебагаж и т. п.), если это влияет на план.",
          ],
        },
        {
          heading: "Онлайн-планирование и опыт на месте",
          body: "Обычный микс: договорённости дистанционно, билеты в телефоне, экскурсии и дни ретрита — уже физически присутствием.",
        },
        {
          heading: "Ограничения платформы",
          body: "Freuly не гарантирует страховые выплаты, выдачу визы и хорошую погоду — внимательно читайте профиль и переписку до оплаты.",
        },
      ],
      specialistsTitle: "Подходящие профили (пример выдачи)",
      specialistsEmpty:
        "Если в каталоге есть видимые подходящие анкеты, они появятся в этом блоке.",
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
            "Это превью: полные фильтры — внутри выбранной категории.",
        },
        {
          question: "Страховка?",
          answer:
            "Оформляется отдельно; платформа её не продаёт и не подтверждает.",
        },
        {
          question: "Чем страница отличается от консультаций?",
          answer:
            "Здесь широкая навигация по смыслу поездки; на странице консультаций — углублённый планировочный запрос.",
        },
        {
          question: "Чем от экскурсий?",
          answer:
            "Там фокус на гиде и дне; здесь вы сначала определяете стратегию: что именно вам нужно от поездки.",
        },
      ],
      relatedTitle: "Смежные темы на Freuly",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Уход и сопровождение",
          description: "Когда поездки нужно стыковать с бытовой нагрузкой в Германии.",
        },
        {
          href: "psychologists-germany",
          label: "Психологи в Германии",
          description: "Когда эмоциональное напряжение мешает планировать поездку.",
        },
        {
          href: "health-psychology",
          label: "Психология и здоровье",
          description: "Шире, если стресс не только из-за маршрута.",
        },
        {
          href: "retreats",
          label: "Ретриты (детальнее)",
          description: "Углубление про многосуточные программы.",
        },
      ],
      cta: {
        heading: "К консультациям по поездкам",
        body: "Если нужен маршрут целиком — откройте категорию; для одного дня с гидом идите в экскурсии.",
        buttonLabel: "Категория консультаций",
        ctaHref: "/ru/specialists/reiseberatung",
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
        "Карта теми туризму в Німеччині: коли доречні туристичні консультації, гід на день, багатоденний ретрит або паралельна допомога з візою й формальностями; сценарії та що написати в першому повідомленні; мова як фільтр у профілях — без обіцянок страховки та віз від платформи.",
      h1: "Подорожі та туризм — спочатку тип задачі, потім фахівець",
      breadcrumbsLabel: "Туризм і подорожі",
      homeLabel: "Головна",
      intro: [
        "Тут — орієнтири, щоб не змішати «спланувати все з нуля», «замовити гіда на один день» і «поїхати на кілька днів у ретрит» або паралельно вести документи — перш ніж переходити в вузьку категорію.",
        "Це не бронювальний центр, не визовий офіс і не класичне турагентство: Freuly показує профілі людей, з якими можна написати напряму; у описах часто є українська, російська чи німецька.",
        "Нижче — зразки карток; повні фільтри та списки — у відповідних розділах.",
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
          heading: "Яку сторінку Freuly обрати коли",
          body: [
            "Ще не ясно готель чи маршрут: туристичні консультації чи категорія Reiseberatung.",
            "Місто й дата є, бракує програми дня: екскурсії та одноденні тури.",
            "Потрібна багатоденна пауза з йогою, медитацією чи wellness — ретрити.",
            "Паралельно подорожі формальності або віза: окремий напрям, без змішування з відпочинком в одному листі.",
          ],
        },
        {
          heading: "Типові сценарії, звідки заходять на цю карту",
          bullets: [
            "Перша поїздка сім’єю — перенавантаження тарифами й квитками.",
            "Відрядження з півднем вільного часу — важливо, щоб проміжок був змістовним.",
            "Гості з-за кордону — потрібен гід, який пояснює зручною мовою.",
            "Ідея ретриту є, невідомо, чи вистачить вихідних чи треба тиждень.",
          ],
        },
        {
          heading: "Перше повідомлення людині з Freuly",
          bullets: [
            "Вікно дат із запасом, не лише одна дата без альтернатив.",
            "Склад групи, вік, обмеження руху й сходами.",
            "Діапазон бюджету, щоб пропозиції не відривались від реальності.",
            "Діти, багаж, нестандартний багаж (ярмарки тощо), якщо це впливає на маршрут.",
          ],
        },
        {
          heading: "Онлайн-планування й досвід на місці",
          body: "Типово: домовленості дистанційно, квитки в телефоні, екскурсії та дні ретриту — уже присутністю.",
        },
        {
          heading: "Межі платформи",
          body: "Freuly не гарантує страхових виплат, рішення по візі чи гарну погоду — читайте профіль і листування до оплати.",
        },
      ],
      specialistsTitle: "Підходящі профілі (приклад видачі)",
      specialistsEmpty:
        "Якщо в каталозі є видимі відповідні анкети, вони з’являться тут.",
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
            "Це прев’ю; повні фільтри — у вибраній категорії.",
        },
        {
          question: "Страховка?",
          answer:
            "Окремо; платформа її не продає й не підтверджує.",
        },
        {
          question: "Відмінність від консультацій?",
          answer:
            "Тут широка навігація за сенсом подорожі; на сторінці консультацій — глибший планувальний запит.",
        },
        {
          question: "Відмінність від екскурсій?",
          answer:
            "Там фокус на гіді й дні; тут ви спочатку визначаєте стратегію, що саме потрібно від поїздки.",
        },
      ],
      relatedTitle: "Суміжні теми на Freuly",
      relatedLinks: [
        {
          href: "pflege-betreuung",
          label: "Догляд і супровід",
          description: "Коли подорожі треба поєднувати з побутом у Німеччині.",
        },
        {
          href: "psychologists-germany",
          label: "Психологи в Німеччині",
          description: "Коли емоційний тиск заважає планувати поїздку.",
        },
        {
          href: "health-psychology",
          label: "Психологія і здоров’я",
          description: "Ширше, якщо стрес не лише через маршрут.",
        },
        {
          href: "retreats",
          label: "Ретрити (детальніше)",
          description: "Уточнення багатоденних форматів.",
        },
      ],
      cta: {
        heading: "До консультацій з подорожей",
        body: "Якщо потрібна вся логістика; для гіда на день — екскурсії.",
        buttonLabel: "Категорія консультацій",
        ctaHref: "/ua/specialists/reiseberatung",
      },
    },
  },
};
