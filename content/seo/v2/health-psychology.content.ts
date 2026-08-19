import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Parent SEO hub: mental health, psychology-related support and coaching in Germany.
 * Child hub page: `psychologists-germany`.
 */
export const healthPsychologyContent: LocalizedSeoCategory = {
  slug: "health-psychology",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%psycholog%,category.ilike.%coach%,category.ilike.%gesundheit%,category.ilike.%health%,category.ilike.%therapy%",
  content: {
    de: {
      slug: "health-psychology",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle:
        "Psychologie & mentale Gesundheit in Deutschland – Psycholog:in, Therapie, Coaching | Freuly",
      metaDescription:
        "Überblick zu psychologischer Beratung, Psychotherapie, Coaching und Ernährungsberatung in Deutschland: wann welche Rolle passt, warum Sprache zählt, Formate online und vor Ort — und wie Sie von dieser Hub-Seite zur passenden Kategorie und zum Profil kommen.",
      h1: "Psychologie & Gesundheit — sich orientieren, dann gezielt auswählen",
      breadcrumbsLabel: "Psychologie & Gesundheit",
      homeLabel: "Startseite",
      intro: [
        "Unter „Psychologie & Gesundheit“ auf Freuly finden Sie Angebote rund um psychische Gesundheit und Begleitung: von psychologischer Beratung und psychotherapeutischen Formaten über Coaching bis zu Ernährungsberatung mit Psychologie-Bezug. Die Kategorie ist bewusst breit — weil reale Suchanfragen selten mit einem perfekten Fachbegriff starten.",
        "Typische Einstiege: Belastung auf der Arbeit, Beziehungskonflikte, chronische innere Unruhe, Übergänge nach Umzug oder Verlust, Unterstützung bei ADHS-Persönlichkeit, oder die Frage „Therapie oder erst einmal Beratung?“. Diese Seite fasst zusammen, was üblicherweise gemeint ist, und leitet zu den Kacheln und Themenseiten weiter.",
        "Nutzen Sie sie als Karte: darunter die fachlichen Unterschiede, Sprache und Formate — und den direkten Sprung zur vertiefenden Seite „Psycholog:innen in Deutschland“, wenn Sie gezielt nach ukrainischer oder russischer Sprache suchen.",
      ],
      subcategoriesTitle: "Wohin als Nächstes — typische Einstiege",
      subcategories: [
        {
          slug: "psychologists",
          label: "Psycholog:innen",
          description:
            "Wenn Sie Gesprächsraum, Methoden der allgemeinen Psychologie und psychologische Beratung suchen — Belastung, Krisen, Anpassung, Beziehung; oft erste Anlaufstelle vor oder parallel zur Therapie.",
        },
        {
          slug: "psychotherapists",
          label: "Psychotherapeut:innen",
          description:
            "Wenn Symptome länger anhalten oder eine diagnostische Einordnung im Vordergrund steht: Verfahren nach anerkannter psychotherapeutischer Qualifikation in Deutschland — mit klaren Regeln zu Kostenstellen (GKV/PKV) je nach Status.",
        },
        {
          slug: "coaches",
          label: "Coaches",
          description:
            "Wenn es um Ziele, berufliche Wenden, Selbstorganisation, Führung oder Sport geht — ohne klinische Diagnosestellung; klarere Struktur und nächste Schritte, keine „Therapie im medizinischen Sinn“.",
        },
        {
          slug: "nutritionists",
          label: "Ernährungsberatung",
          description:
            "Wenn Essen, Verdauung oder Stoffwechsel die Hauptbelastung sind oder ärztliche Diagnosen Einfluss auf den Alltag haben — sinnvoll abgestimmt mit behandelnden Ärztinnen und Ärzten.",
        },
      ],
      sections: [
        {
          heading: "Was fällt unter diese Übersicht — und was nicht?",
          body: [
            "Gemeint sind unterstützende Formate zwischen mentalem Wohlbefinden und professioneller Hilfe: Einzelgespräche, strukturierte Therapie, Coaching und ernährungsbezogene Beratung, soweit sie in den Profilen auf Freuly angelegt sind.",
            "Nicht ersetzt wird der medizinische Notfall: bei akuter Selbst- oder Fremdgefährdung wählen Sie Notruf 112 oder die psychiatrische Notaufnahme — unabhängig von einem Online-Profil.",
          ],
        },
        {
          heading: "Psycholog:in, Psychotherapeut:in, Coach, Beratung — kurz auseinandergehalten",
          body: [
            "Psychologische Fachkräfte decken mitunter Beratung, Prävention und in bestimmten Settings auch Therapie ab — das hängt von Ausbildung, Zusatzqualifikation und gesetzlichen Rahmen ab. „Psychotherapeut:in“ bezeichnet in Deutschland einen geschützten Weg mit approbationskonformen Verfahren für psychische Störungen im engeren Sinne.",
            "Coaching adressiert oft Zielerreichung und berufliche oder persönliche Entwicklung ohne den therapeutischen Diagnosefokus. Ernährungsberater:innen arbeiten an Gewohnheiten und Planung; körperliche und psychische Themen können sich überschneiden — dann lohnt die Abstimmung zwischen mehreren Professionen.",
            "Wenn Sie unsicher sind: nennen Sie in der Erstanfrage die Dringlichkeit, Dauer der Beschwerden und ob bereits eine ärztliche oder therapeutische Behandlung läuft — so kann die Gegenpartei ehrlich sagen, ob sie passt oder weitervermittelt.",
          ],
        },
        {
          heading: "Typische Situationen, in denen Menschen hier landen",
          bullets: [
            "Anhaltende innere Anspannung, Schlaf oder Konzentration leiden, obwohl „äußerlich alles passt“.",
            "Konflikte in Partnerschaft oder Familie, die sich ohne neutrale Person nicht lösen.",
            "Nach Migration: Erschöpfung, Orientierungslosigkeit, das Gefühl, emotional „zwischen Welten“ zu stehen.",
            "Frage nach Therapieplatz, Erstgespräch oder ob Coaching zunächst reicht — ohne falsche Scham.",
          ],
        },
        {
          heading: "Warum die Sprache der Sitzung praktisch wichtig ist",
          body: [
            "Feinheiten von Scham, Schuld oder kulturell geprägten Erwartungen lassen sich in der Muttersprache oft präziser benennen. Das reduziert Missverständnisse und beschleunigt die therapeutische oder beratende Arbeit — unabhängig davon, wie gut Ihr Alltagsdeutsch ist.",
            "Auf Freuly filtern Sie Profile nach Sprachen und Standort; die vertiefende Seite „Psycholog:innen in Deutschland“ bündelt genau den Sprach-Fokus Ukrainisch und Russisch.",
          ],
        },
        {
          heading: "Formate: online, Praxis, hybrid",
          bullets: [
            "Online reduziert Anfahrtswege und passt zu Schichtdienst oder Kinderbetreuung — klären Sie Technik, Vertraulichkeit und was bei Krisen gilt.",
            "Vor-Ort-Termine können Körperhaltung und Raum anders spürbar machen — manche Themen profitieren vom persönlichen Kontakt.",
            "Hybrid bedeutet beides im Verlauf; nicht jede Person bietet jedes Format — im Profil und in der Nachricht klären.",
          ],
        },
        {
          heading: "So wählen Sie — und wie Freuly den ersten Schritt erleichtert",
          body: [
            "Lesen Sie Kurz-Bio, Schwerpunkte, Sprachen und ggf. Kostenrahmen. Ein Profil ist eine öffentliche Einstiegsseite: Sie sehen, was die Person über sich ausstellt — kritisches Hinterfragen bleibt bei Ihnen.",
            "Gehen Sie über die Kacheln oben in die passende Kategorie, oder direkt zur vertiefenden Seite zu Psycholog:innen mit Ukrainisch und Russisch, wenn das Ihr Hauptfilter ist.",
            "Erste Nachricht: eine konkrete Belastung, gewünschtes Format (online/vor Ort), verfügbare Zeiten und Sprache — kurz genug zum Lesen, konkret genug zum Einordnen.",
          ],
        },
      ],
      specialistsTitle: "Profile, die zu diesem Überblick passen",
      specialistsEmpty:
        "Sobald sichtbare Fachkräfte dieser Zuordnung zugeordnet sind, erscheinen sie hier.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Ist jede Fachkraft auf Freuly approbierte Psychotherapeut:in?",
          answer:
            "Nein — die Plattform listiert verschiedene Qualifikationen. Prüfen Sie im Profil Ausbildung, Titel und angebotene Leistungen. Approbierte Psychotherapie erfüllt spezifische gesetzliche Kriterien; bei Zweifeln fragen Sie direkt nach.",
        },
        {
          question: "Was ist der Unterschied zwischen dieser Hub-Seite und „Psycholog:innen in Deutschland“?",
          answer:
            "Diese Seite ordnet das gesamte Themengebiet ein und verweist auf mehrere Kategorien. Die Kind-Seite konzentriert sich auf einen konkreten Such- und Sprach-Kontext für psychologische Unterstützung in Deutschland.",
        },
        {
          question: "Wie erkenne ich, ob Beratung oder Therapie sinnvoller ist?",
          answer:
            "Grobe Faustregel: akute Bewältigung und Orientierung oft zuerst in Beratung oder Coaching; länger anhaltende, eingeschränkte Funktionsfähigkeit oft im therapeutischen Rahmen — die Einordnung nimmt im Erstgespräch eine qualifizierte Person vor.",
        },
        {
          question: "Kann ich online beginnen und später vor Ort wechseln?",
          answer:
            "Oft ja — Verfügbarkeit, Datenschutz bei Videositzungen und mögliche Zuzahlungen sollten Sie vorab klären.",
        },
        {
          question: "Was schreibe ich in die erste Anfrage?",
          answer:
            "Thema in eigenen Worten, seit wann es belastet, gewünschte Sprache und Format — ohne die ganze Lebensgeschichte; Details folgen im Gespräch.",
        },
      ],
      relatedTitle: "Vertiefung und Wege von hier",
      relatedLinks: [
        {
          href: "psychologists-germany",
          label: "Psycholog:innen in Deutschland (Ukrainisch & Russisch)",
          description:
            "Kind-Seite mit Fokus auf Sprache und Kontext — wenn Sie bereits wissen, dass es ein psychologisches Profil sein soll.",
        },
        {
          href: "pflege-betreuung",
          label: "Pflege & Betreuung",
          description: "Wenn Alltagspflege und häusliche Unterstützung im Vordergrund stehen, nicht Gesprächstherapie.",
        },
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description: "Planung von Aufenthalten und Mobilität — parallel zu psychischer Entlastung oft ein zweites Thema.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description: "Gruppen oder intensive Formate mit festem Rahmen — ergänzend zur Einzelarbeit.",
        },
      ],
      cta: {
        heading: "In die passende Kategorie springen",
        body: "Öffnen Sie Psycholog:innen und filtern Sie nach Stadt, Sprache und Format — oder nutzen Sie die vertiefende Seite zu Ukrainisch und Russisch im Menü „Verwandte Themen“.",
        buttonLabel: "Psycholog:innen durchsuchen",
        ctaHref: "/de/specialists/psychologists",
      },
    },
    ru: {
      slug: "health-psychology",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Психология и психическое здоровье в Германии: психолог, психотерапия, коучинг | Freuly",
      metaDescription:
        "Родительский обзор: что входит в раздел психологии и здоровья на Freuly, в каких случаях искать психолога, терапевта или коуча, зачем важен язык сессии и как перейти к категориям и тематической странице про психологов с украинским и русским.",
      h1: "Психология и здоровье — сначала картина целого, потом выбор специалиста",
      breadcrumbsLabel: "Психология и здоровье",
      homeLabel: "Главная",
      intro: [
        "Раздел объединяет запросы, которые в жизни называют по-разному: перегруз на работе, тревога, отношения, посттравма, поиск терапии по направлению, коучинг без «медицинской истории» или работа с пищевым поведением через консультанта. Родительская страница как раз для того, чтобы не путаться в словах и понять следующий шаг.",
        "Сюда обычно попадают те, кто уже чувствует, что одной силой не справиться, но ещё не знает: психолог, психотерапевт, коуч или смежный специалист — и на каком языке комфортнее говорить о личном.",
        "Ниже — различия ролей, типичные сценарии и фильтры Freuly; отдельно оформлена дочерняя страница «Психологи в Германии» для тех, кто целится именно в русскоязычную или украиноязычную психологическую поддержку.",
      ],
      subcategoriesTitle: "Куда перейти из обзора",
      subcategories: [
        {
          slug: "psychologists",
          label: "Психологи",
          description:
            "Если нужны беседа, структурирование кризиса, работа со стрессом, отношениями, адаптацией; часто первая линия до или рядом с терапией.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевты",
          description:
            "Если симптомы длятся и нужна методическая длительная работа в рамках немецкой квалификации; вопросы очередей и оплаты обсуждаются индивидуально.",
        },
        {
          slug: "coaches",
          label: "Коучи",
          description:
            "Если запрос про цели, карьеру, привычки, мотивацию без постановки клинического диагноза на платформе — фокус на шагах вперёд.",
        },
        {
          slug: "nutritionists",
          label: "Нутрициологи и консультанты по питанию",
          description:
            "Если в центре еда, режим, телесные симптомы; при хронике — совместно с врачом.",
        },
      ],
      sections: [
        {
          heading: "Что мы называем «психология и здоровье» на Freuly",
          body: [
            "Это зонт для профилей, где речь о психическом комфорте, консультировании, методической терапии, коучинге и осознанном питании — по тому, как специалист сам представил услуги.",
            "Она не подменяет скорую и не решает острые угрозы жизни: при таком риске — телефон экстренных служб и очная помощь.",
          ],
        },
        {
          heading: "Психолог, психотерапевт, коуч, консультант — где граница",
          body: [
            "Психолог чаще помогает прожить трудный период и уменьшить острый стресс инструментами консультирования. Психотерапевт в Германии работает в рамках признанных методов и лицензированных траекторий, когда речь о устойчивых состояниях — это не синоним «любого длительного разговора».",
            "Коуч опирается на договорённость о целях; консультант по питанию смещает акцесс на телесно-бытовой слой. Роли могут пересекаться — и это нормально, если прозрачно сказано, что человек делает и чего не делает.",
            "В первом контакте полезно назвать сроки, интенсивность симптомов и идёт ли уже приём у врача или терапевта — так проще понять fit.",
          ],
        },
        {
          heading: "Типичные ситуации, когда открывают этот раздел",
          bullets: [
            "«Всё надоело, но жаловаться неудобно» — эмоциональное выгорание и опустошение.",
            "Отношения: повторяющиеся сцены, ревность, расставание, семья после переезда.",
            "Тревога и паника, сложности со сном; вопрос «это уже к психиатру или к психологу?».",
            "Поиск специалиста говорящего на родном языке в конкретном городе Германии.",
          ],
        },
        {
          heading: "Почему язык сессии — не мелочь",
          body: [
            "Травма, стыд, вина и семейные сценарии быстрее проходят без постоянного внутреннего перевода. Для многих мигрантов отдельная ценность — не объяснять с нуля контекст «как у нас принято».",
            "На Freuly можно отфильтровать языки и город; узкий вход — тематическая страница про психологов при украинском и русском.",
          ],
        },
        {
          heading: "Форматы: онлайн, очно, гибрид",
          bullets: [
            "Онлайн экономит дорогу и время; уточните конфиденциальность и что делать в кризис между сессиями.",
            "Очно — другой контакт тела и пространства; важно, если не хочется дома подключаться к тяжёлым темам.",
            "Гибрид — по договорённости; уточняйте расписание и часовой пояс.",
          ],
        },
        {
          heading: "Как выбрать и как Freuly помогает с первым шагом",
          body: [
            "Читайте био и специализацию; профиль — публичная точка входа, не гарантия результата. Сравните несколько человек по языку, городу и описанию формата.",
            "С родительской страницы уходите в карточку категории сверху или в дочернюю «Психологи в Германии», если язык — главный фильтр.",
            "Первая заявка: одна главная боль, с какого момента она сильнее, желаемый язык и онлайн/офлайн — без романа в первом абзаце.",
          ],
        },
      ],
      specialistsTitle: "Примеры профилей из этого направления",
      specialistsEmpty:
        "Здесь появятся специалисты, когда их анкеты будут сопоставлены с этим разделом.",
      faqTitle: "Вопросы и ответы",
      faq: [
        {
          question: "Все ли специалисты — психотерапевты по немецкому закону?",
          answer:
            "Нет, состав смешанный. Статус и образование смотрите в профиле; термин «психотерапия» в Германии юридически строг. При сомнениях спросите прямо в переписке.",
        },
        {
          question: "Чем эта страница отличается от «Психологи в Германии»?",
          answer:
            "Эта — обзор всего зонта и переходы в категории. Дочерняя страница уже заточена под языковой и жизненный контекст поиска психолога.",
        },
        {
          question: "Обещает ли Freuly поток клиентов или исход терапии?",
          answer:
            "Нет. Платформа помогает быть найденным и сравнивать профили; результат зависит от пары специалист–клиент и обстоятельств.",
        },
        {
          question: "Можно ли начать онлайн?",
          answer:
            "Часто да — уточните защиту данных, стабильность связи и возможность очных встреч позже.",
        },
        {
          question: "Что писать в первой заявке?",
          answer:
            "Суть переживания, длительность, язык, формат; один фокус — проще получить честный ответ «подхожу / не подхожу».",
        },
      ],
      relatedTitle: "Куда двигаться дальше",
      relatedLinks: [
        {
          href: "psychologists-germany",
          label: "Психологи в Германии (украинский и русский)",
          description:
            "Дочерняя страница под конкретный поиск по языку — если образ «психолог» уже выбран.",
        },
        {
          href: "pflege-betreuung",
          label: "Уход и сопровождение",
          description: "Когда вопрос бытовой опеки и родственников, а не сессий 1:1.",
        },
        {
          href: "reisen-tourismus",
          label: "Туризм и поездки",
          description: "Логистика длинных поездок по Германии — рядом с психологией часто второй слой задач.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Интенсив в группе или среде — как дополнение, не замена индивидуальной работы.",
        },
      ],
      cta: {
        heading: "Перейти к категории или углубиться по языку",
        body: "Откройте список психологов с фильтрами по городу и языку; если важнее узкий контекст — используйте ссылку на страницу «Психологи в Германии» в блоке ниже.",
        buttonLabel: "Категория «Психологи»",
        ctaHref: "/ru/specialists/psychologists",
      },
    },
    ua: {
      slug: "health-psychology",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Психологія та ментальне здоров’я в Німеччині: психолог, психотерапія, коучинг | Freuly",
      metaDescription:
        "Батьківський огляд на Freuly: що охоплює категорія психології й здоров’я, коли шукати психолога чи терапевта, чим відрізняється коучинг, навіщо мова сесії та як перейти до профілів і сторінки «Психологи в Німеччині».",
      h1: "Психологія і здоров’я — орієнтир по категорії, потім вибір людини",
      breadcrumbsLabel: "Психологія і здоров’я",
      homeLabel: "Головна",
      intro: [
        "Тут зібрані різні, але пов’язані запити: тривога й виснаження, кризи в стосунках, пошук терапії чи коротшої підтримки, коучинг щодо цілей, а також робота з харчуванням і звичками. Батьківська сторінка пояснює масштаб категорії до того, як ви натиснете на фільтри.",
        "Зазвичай сюди заходять ті, хто вже відчуває навантаження, але ще не розвів ролі: психолог, психотерапевт, коуч, консультант — і який саме запит адресувати до кого.",
        "Нижче — відмінності форматів, типові життєві ситуації та як звідси перейти до дочірньої сторінки про психологів українською та російською в Німеччині.",
      ],
      subcategoriesTitle: "Куди перейти з цього огляду",
      subcategories: [
        {
          slug: "psychologists",
          label: "Психологи",
          description:
            "Коли потрібен діалог, опора в кризі, стрес, відновлення після змін — часто перший контакт до або поруч із довшою терапією.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевти",
          description:
            "Коли симптоми стійкі та потрібна методична робота в німецьких рамках кваліфікації; фінанси й черги — у переговорах.",
        },
        {
          slug: "coaches",
          label: "Коучі",
          description:
            "Коли запит про цілі, про кар’єру, самоорганізацію, спорт — без медичної діагностики як основи роботи.",
        },
        {
          slug: "nutritionists",
          label: "Нутриціологи",
          description:
            "Коли фокус на харчуванні, режимі, поведінці за їжею; за хронічних діагнозів — узгоджено з лікарем.",
        },
      ],
      sections: [
        {
          heading: "Що входить у цю категорію на Freuly",
          body: [
            "Це парасолька для профілів про психічне благополуччя: психологічна підтримка, терапевтичні формати, коучинг і консультування щодо здоров’я, як спеціаліст явно описав у картці.",
            "Вона не замінює екстрену допомогу: при небезпеці для життя звертайтеся до служб 112 та медиків у позаонлайн-режимі.",
          ],
        },
        {
          heading: "Психолог, психотерапевт, коуч — чим відрізняються ролі",
          body: [
            "Психолог допомагає зрозуміти стан і знайти опору в консультативних методах. Психотерапевт у Німеччині працює в узгоджених із законом форматах, коли потрібна тривала клініко-орієнтована робота — це не просто «довга розмова».",
            "Коуч тримає у фокусі кроки й цілі. Консультант із харчування веде тему тіла й звичок. На перетині тем корисно домовлятися, хто за що відповідає.",
          ],
        },
        {
          heading: "Типові сценарії, коли користуються цим розділом",
          bullets: [
            "Постійна внутрішня напруга після переїзду або втрати.",
            "Повтор конфліктів із партнером чи родиною без виходу.",
            "Питання «терапія чи поки що коротка підтримка?» без осуду за «слабкість».",
            "Потреба знайти фахівця рідною мовою в конкретному місті.",
          ],
        },
        {
          heading: "Чому мова сесії має значення",
          body: [
            "Сором, провина, дитячі сценарії швидше формулюються без перекладу в голові. Досвід міграції лишається в полі розмови, а не додатку до нього.",
            "На Freuly можна відсіяти мову й місто; вузький вхід — сторінка про психологів з українською та російською в Німеччині.",
          ],
        },
        {
          heading: "Онлайн, очно, змішано",
          bullets: [
            "Онлайн — менше часу на дорогу; уточіть приватність і план на випадок кризи між зустрічами.",
            "Очно — інший контакт і межі простору.",
            "Комбінування можливе, якщо людина так працює — дивіться профіль і запитайте напряму.",
          ],
        },
        {
          heading: "Як обрати фахівця і що робить Freuly на першому кроці",
          body: [
            "Профіль — публічна вітрина: порівнюйте опис, мови, місто, не лише фото. Кілька коротких запитів краще за один «випадковий».",
            "З цієї сторінки перейдіть у потрібну плитку категорії або на дочірню сторінку про мовний запит до психологів.",
            "Перше повідомлення: одна гостра тема, бажаний формат і мова — достатньо, щоб отримати чесну відповідь «можу / не мій профіль».",
          ],
        },
      ],
      specialistsTitle: "Профілі, що відповідають цьому огляду",
      specialistsEmpty:
        "Фахівці з’являться тут, коли їхні анкети будуть пов’язані з розділом.",
      faqTitle: "Питання та відповіді",
      faq: [
        {
          question: "Чи всі фахівці — ліцензовані психотерапевти в Німеччині?",
          answer:
            "Ні. Перевіряйте освіту й зазначені формати в профілі; статус психотерапевта визначений законом і не збігається з будь-якою довгою розмовою.",
        },
        {
          question: "Чим ця сторінка відрізняється від «Психологи в Німеччині»?",
          answer:
            "Це батьківський огляд із розгалуженнями в категорії. Дочірня сторінка — для вужчого наміру, коли важлива саме мова та контекст пошуку психолога.",
        },
        {
          question: "Чи гарантує Freuly кількість клієнтів або результат терапії?",
          answer:
            "Ні. Сервіс допомагає бути знайденим і порівняти пропозиції; результат залежить від пари фахівець–клієнт.",
        },
        {
          question: "Чи можна почати онлайн?",
          answer:
            "Часто так — уточіть конфіденційність, графік і можливість подальших очних зустрічей.",
        },
        {
          question: "Що писати в першій заявці?",
          answer:
            "Коротко про те, що зараз найгостріше, скільки триває та який формат підходить; деталі розкриються пізніше.",
        },
      ],
      relatedTitle: "Пов’язані розділи",
      relatedLinks: [
        {
          href: "psychologists-germany",
          label: "Психологи в Німеччині (українська та російська)",
          description:
            "Дочірня сторінка для навігації за мовою — коли вже зрозуміло, що потрібен психологічний профіль.",
        },
        {
          href: "pflege-betreuung",
          label: "Догляд і супровід",
          description: "Якщо пріоритет — побутова опіка близької людини.",
        },
        {
          href: "reisen-tourismus",
          label: "Подорожі та туризм",
          description: "Окремий пласт планування поїздок поряд із психологічним навантаженням.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Структуровані програми як додаток до індивідуальної роботи.",
        },
      ],
      cta: {
        heading: "Перейти до категорії чи звузити за мовою",
        body: "Відкрийте список психологів із фільтрами; якщо важливий саме мовний контекст — скористайтесь сторінкою в блоці «Пов’язані розділи».",
        buttonLabel: "Дивитися «Психологи»",
        ctaHref: "/ua/specialists/psychologists",
      },
    },
  },
};
