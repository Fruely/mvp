import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Child SEO page under `health-psychology`: psychologists in Germany, Ukrainian & Russian speaking context.
 *
 * Specialist list uses the same Supabase `category` ilike pattern as the public `/category/psychologists` hub.
 */
export const psychologistsGermanyContent: LocalizedSeoCategory = {
  slug: "psychologists-germany",
  parentSlug: "health-psychology",
  categoryType: "child",
  filterOr: "category.ilike.%psycholog%",
  content: {
    de: {
      slug: "psychologists-germany",
      parentSlug: "health-psychology",
      locale: "de",
      categoryType: "child",
      metaTitle:
        "Psycholog:innen in Deutschland – Ukrainisch, Russisch, Deutsch | Freuly",
      metaDescription:
        "Psychologische Unterstützung in Deutschland: wie Sie vorgehen, worauf Sie achten und wie Sie auf Freuly passende Fachkräfte finden, die Ukrainisch, Russisch oder Deutsch sprechen.",
      h1: "Psycholog:innen in Deutschland — wenn die Muttersprache den Unterschied macht",
      breadcrumbsLabel: "Psycholog:innen in Deutschland",
      homeLabel: "Startseite",
      parentLabel: "Psychologie & Gesundheit",
      intro: [
        "Ein Umzug nach Deutschland bringt oft gleichzeitig Erleichterung, Leistungsdruck und emotionale Erschöpfung mit sich. Wenn innere Themen anstehen, ist der erste Schritt nicht „noch mehr durchhalten“, sondern jemanden zu finden, dem Sie sich wirklich mitteilen können — in der Sprache, in der Ihre Geschichte ohne Übersetzung erzählt werden kann.",
        "Diese Seite beschreibt, woran Sie erkennen können, ob ein Profil zu Ihrer Situation passt, und verweist auf echte Kontaktmöglichkeiten über Freuly. Darunter sehen Sie eine Auswahl psychologisch passender Profile, sofern sie in der Datenbank sichtbar sind.",
      ],
      subcategoriesTitle: "Verwandte Kategorien auf Freuly",
      subcategories: [
        {
          slug: "psychologists",
          label: "Alle Psycholog:innen (Übersicht)",
          description:
            "Breitere Filter in der öffentlichen Kategorie — Stadt, Sprachen, Arbeit online oder vor Ort.",
        },
        {
          slug: "psychotherapists",
          label: "Psychotherapeut:innen",
          description: "Wenn ein verfahrensgebundener Therapieprozess in Betracht kommt.",
        },
        {
          slug: "coaches",
          label: "Coaches",
          description: "Kurzfristige Ziele, Karriere, Stressbewältigung außerhalb klinischer Diagnosen.",
        },
      ],
      sections: [
        {
          heading: "Warum „richtige Sprache“ mehr ist als Komfort",
          body: [
            "Psychologische Arbeit lebt von Nuancen: Wut, Scham, Schuld oder Verlust formulieren Sie in Ihrer Muttersprache präziser — und Sie müssen weniger Energie in die grammatikalisch korrekte Fassung investieren.",
            "Ein guter Fit berücksichtigt außerdem Migration, Familienerwartungen und biografische Brüche, ohne dass Sie alles erst „für Deutschland“ erklären müssen.",
          ],
        },
        {
          heading: "Worauf Sie in einem Profil achten sollten",
          bullets: [
            "Welche Ausbildung wird genannt und welche Methoden werden angeboten?",
            "Arbeitet die Person online, hybrid oder nur vor Ort — und passt das zu Ihrem Alltag?",
            "Welche Sprachen werden explizit für die therapeutische Arbeit genannt?",
            "Gibt es Hinweise auf Erfahrung mit Belastung durch Flucht, Verlust oder Diskriminierung?",
          ],
        },
        {
          heading: "Erster Kontakt ohne Romandinner",
          body: "Halten Sie die erste Nachricht sachlich und dennoch persönlich: Altersspanne, aktuelle Belastung (zum Beispiel Schlaf, Panik, Konflikte), ob schon Behandlung läuft und in welchem Zeitraum Sie einen Termin brauchen. Daraus kann eine Fachkraft einschätzen, ob sie passend ist.",
        },
      ],
      specialistsTitle: "Sichtbare Psycholog:innen-Profile (Auswahl)",
      specialistsEmpty:
        "Derzeit sind keine passenden Profile in dieser Auswahl sichtbar — öffnen Sie die Kategorie „Psycholog:innen“ über den Button unten oder versuchen Sie später erneut.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Ist das eine Psychotherapie nach Heilpraktiker- oder Approbationsregeln?",
          answer:
            "Das variiert von Profil zu Profil. Lesen Sie den Steckbrief aufmerksam und fragen Sie offen nach Status, Kostenübernahme und Methodik.",
        },
        {
          question: "Was, wenn ich sofort jemanden brauche?",
          answer:
            "Bei Notlagen wenden Sie sich an lokale Krisendienste, psychiatrische Ambulanzen oder den ärztlichen Notdienst. Freuly ist kein Ersthelfer-Notruf.",
        },
        {
          question: "Kann ich zuerst schreiben und dann telefonieren?",
          answer:
            "Viele Profile auf Freuly beginnen mit einer schriftlichen Anfrage; ob ein Telefonat folgt, entscheidet die Fachkraft.",
        },
      ],
      relatedTitle: "Weitere Freuly-Themen",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Psychologie & Gesundheit (Übersicht)",
          description: "Zurück zur übergeordneten Einordnung aller Formate.",
        },
        {
          href: "pflege-betreuung",
          label: "Pflege & Betreuung",
          description: "Wenn statt Gespräch erst einmal Alltag und Betreuung drängen.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description: "Intensive Gruppenformate als Ergänzung zur Einzelarbeit.",
        },
      ],
      cta: {
        heading: "Direkt alle Psycholog:innen filtern",
        body: "In der öffentlichen Kategorie können Sie weiter einschränken — Ort, Sprache, Verfügbarkeit.",
        buttonLabel: "Zur Psycholog:innen-Kategorie",
        ctaHref: "/de/category/psychologists",
      },
    },
    ru: {
      slug: "psychologists-germany",
      parentSlug: "health-psychology",
      locale: "ru",
      categoryType: "child",
      metaTitle:
        "Психологи в Германии на украинском и русском — как искать помощь | Freuly",
      metaDescription:
        "Как найти психолога в Германии и на что смотреть в профиле: язык, формат, опыт. Freuly показывает специалистов с той же логикой, что и публичная категория «Психологи».",
      h1: "Психологи в Германии — когда важнее язык, чем красивый заголовок",
      breadcrumbsLabel: "Психологи в Германии",
      homeLabel: "Главная",
      parentLabel: "Психология и здоровье",
      intro: [
        "Переезд и жизнь между двумя странами часто сочетают надежду и усталость. Если внутри тревога, пустота или острый кризис, важна не только квалификация специалиста, но и возможность говорить так, чтобы вас слышали без лишних объяснений «контекста».",
        "Здесь — практические ориентиры без обещаний волшебного решения. Ниже вы увидите выборку профилей психологов из той же базы, что и в разделе «Психологи», если такие анкеты сейчас проходят публичные правила отображения.",
      ],
      subcategoriesTitle: "Рядом по смыслу на Freuly",
      subcategories: [
        {
          slug: "psychologists",
          label: "Все психологи",
          description: "Полный список с фильтрами по городу и языкам.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевты",
          description: "Если нужен долгий терапевтический процесс, а не разовая поддержка.",
        },
        {
          slug: "coaches",
          label: "Коучи",
          description: "Цели, стресс на работе, структура — вне клинической диагностики.",
        },
      ],
      sections: [
        {
          heading: "Почему родной язык меняет качество контакта",
          body: [
            "Тонкие оттенки стыда, вины или злости быстрее проговариваются на привычном языке — меньше самоцензуры из-за «как бы это по-немецки сказать».",
            "Не нужно отдельно объяснять, почему важны границы с родственниками или как устроена миграционная усталость: это остаётся в фокусе, а не в преамбуле.",
          ],
        },
        {
          heading: "На что смотреть в анкете",
          bullets: [
            "Образование, метод, указан ли опыт с мигрантскими историями.",
            "Онлайн, очно или гибрид — совпадает это с вашим графиком или нет.",
            "Явно ли перечислены языки для работы, а не только «знает разговорный».",
          ],
        },
        {
          heading: "Первое сообщение",
          body: "Достаточно трёх–пяти предложений: что болит сейчас, как давно, есть ли приём у врача и когда нужна первая встреча. Этого хватает, чтобы специалист понял, берётся ли он за запрос.",
        },
      ],
      specialistsTitle: "Примеры профилей психологов",
      specialistsEmpty:
        "Сейчас в выборке никого нет — откройте категорию «Психологи» через кнопку ниже или зайдите позже.",
      faqTitle: "Вопросы",
      faq: [
        {
          question: "Это всегда психотерапия с немецкой approbatio?",
          answer:
            "Нет, состав разный. Читайте в карточке статус и спрашивайте прямо про оплату и метод.",
        },
        {
          question: "Что делать в острой опасности?",
          answer:
            "Обращайтесь в неотложку и к местным кризисным службам; сайт и подбор не заменяют экстренную помощь.",
        },
        {
          question: "Можно ли сперва перепиской?",
          answer:
            "На Freuly часто начинают с заявки; продолжение по телефону зависит от специалиста.",
        },
      ],
      relatedTitle: "Другие разделы",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психология и здоровье — обзор",
          description: "Шире: коучинг, смежные направления.",
        },
        {
          href: "pflege-betreuung",
          label: "Уход и сопровождение",
          description: "Если кризис быта важнее разговора.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Смена ритма в малой группе.",
        },
      ],
      cta: {
        heading: "Открыть категорию «Психологи»",
        body: "Там доступны фильтры и полный список, синхронный с публичным поиском.",
        buttonLabel: "К списку психологов",
        ctaHref: "/ru/category/psychologists",
      },
    },
    ua: {
      slug: "psychologists-germany",
      parentSlug: "health-psychology",
      locale: "ua",
      categoryType: "child",
      metaTitle:
        "Психологи в Німеччині українською та російською — як шукати підтримку | Freuly",
      metaDescription:
        "Як обрати психолога в Німеччині: мова, формат роботи, досвід. Freuly підтягує ті самі профілі, що й публічна категорія «Психологи».",
      h1: "Психологи в Німеччині — коли зручна мова важливіша за гучну обіцянку",
      breadcrumbsLabel: "Психологи в Німеччині",
      homeLabel: "Головна",
      parentLabel: "Психологія і здоров’я",
      intro: [
        "Переїзд і життя «між двома світами» часто поєднує надію й виснаження. Якщо всередині тривога, втрата сенсу чи гострий злам, має значення не лише диплом спеціаліста, а й можливість вільно розповісти історію рідною мовою.",
        "Нижче — орієнтири без обіцянок швидкого зцілення. Під текстом показані профілі з тієї ж логіки відбору, що й у розділі «Психологи», якщо такі анкети зараз публічні.",
      ],
      subcategoriesTitle: "Суміжне на Freuly",
      subcategories: [
        {
          slug: "psychologists",
          label: "Усі психологи",
          description: "Повний каталог із фільтрами міста й мов.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевти",
          description: "Якщо потрібен тривалий терапевтичний процес.",
        },
        {
          slug: "coaches",
          label: "Коучі",
          description: "Цілі, навантаження на роботі, структура без клінічного діагнозу.",
        },
      ],
      sections: [
        {
          heading: "Навіщо рідна мова у розмові про психіку",
          body: [
            "Сором, злість, провина легше формулюються без перекладу в голові — менше самопідміни «правильними» словами.",
            "Досвід війни, розлуки чи дискриміанції не потрібно спершу пояснювати іноземцю — ви одразу в темі запиту.",
          ],
        },
        {
          heading: "На що дивитися в профілі",
          bullets: [
            "Освіта, метод, чи є досвід з людьми з міграційним досвідом.",
            "Онлайн, офлайн чи гібрид — чи підходить вашому тижню.",
            "Мови вказані саме для терапевтичної роботи.",
          ],
        },
        {
          heading: "Перше повідомлення",
          body: "Коротко: що болить зараз, як довго, чи є лікування в лікаря, коли потрібен перший контакт — цього достатньо для чесної відповіді «так / не мій профіль».",
        },
      ],
      specialistsTitle: "Приклади анкет",
      specialistsEmpty:
        "Зараз список порожній — перейдіть у категорію «Психологи» кнопкою нижче або зайдіть пізніше.",
      faqTitle: "Питання",
      faq: [
        {
          question: "Усі тут — ліцензовані психотерапевти?",
          answer:
            "Ні. Уважно читайте статус і уточнюйте оплату та метод напряму.",
        },
        {
          question: "Гострий стан — що робити?",
          answer:
            "Терміново до служб екстреної допомоги й кризових ліній; платформа не замінює екстрену допомогу.",
        },
        {
          question: "Чи можна почати листуванням?",
          answer:
            "Часто перший контакт текстовий; телефон узгоджується окремо.",
        },
      ],
      relatedTitle: "Інші розділи",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія і здоров’я — огляд",
          description: "Повернутися до ширшої карти напрямів.",
        },
        {
          href: "pflege-betreuung",
          label: "Догляд і супровід",
          description: "Якщо зараз важливіший побут, ніж розмова.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Інший темп і структура групи.",
        },
      ],
      cta: {
        heading: "Категорія «Психологи»",
        body: "Повний список і фільтри, зіставні з публічним пошуком.",
        buttonLabel: "Перейти до списку",
        ctaHref: "/ua/category/psychologists",
      },
    },
  },
};
