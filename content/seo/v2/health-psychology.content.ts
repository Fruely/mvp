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
      metaTitle: "Psychologie & Gesundheit in Deutschland – Beratung in Ihrer Sprache | Freuly",
      metaDescription:
        "Orientierung zu Psychologie, Coaching und Gesundheitsberatung in Deutschland. Finden Sie Spezialistinnen und Spezialisten, die Ukrainisch, Russisch oder Deutsch sprechen — und passende Kategorien von der Ernährung bis zur Psychotherapie.",
      h1: "Psychologie & Gesundheit — wählen Sie das passende Format",
      breadcrumbsLabel: "Psychologie & Gesundheit",
      homeLabel: "Startseite",
      intro: [
        "Unter „Psychologie & Gesundheit“ fallen sehr unterschiedliche Angebote: von Gesprächspsychologie über Psychotherapie bis zu Coaching, Ernährungsberatung und Weiterem. Entscheidend ist weniger der Fachbegriff auf dem Profil, sondern ob das Setting, die Sprache und die Erfahrung zu Ihrer aktuellen Situation passen.",
        "Diese Seite gibt eine Landkarte: welche Richtungen es häufig gibt, worin sie sich unterscheiden, und wie Sie auf Freuly gezielt Profile vergleichen — bei Bedarf auf Ukrainisch, Russisch oder Deutsch.",
      ],
      subcategoriesTitle: "Typische Bereiche und Kategorien",
      subcategories: [
        {
          slug: "psychologists",
          label: "Psycholog:innen",
          description:
            "Beratung, Diagnostik (je nach Qualifikation) und psychologische Begleitung in Krisen, bei Belastung und bei Lebensübergängen.",
        },
        {
          slug: "psychotherapists",
          label: "Psychotherapeut:innen",
          description:
            "Verfahrensgebundene Psychotherapie bei länger anhaltenden Symptomen — je nach Qualifikation Kassen- oder Privatleistung.",
        },
        {
          slug: "coaches",
          label: "Coaches",
          description:
            "Zielorientierte Begleitung bei Stress, beruflichen Weichenstellungen, Zeitmanagement und persönlicher Entwicklung.",
        },
        {
          slug: "nutritionists",
          label: "Ernährungsberatung",
          description:
            "Veränderungen von Essverhalten, Allergien, chronische Beschwerden — sinnvoll kombinierbar mit ärztlicher Betreuung.",
        },
      ],
      sections: [
        {
          heading: "Psychologie, Coaching, Therapie — wo endet was?",
          body: [
            "Grob gesagt richtet sich Psychologie stark auf Verstehen, Bewältigen und Stabilisieren. Coaching fokussiert oft klare Ziele und nächste Schritte. Psychotherapie arbeitet in diagnosenahen Kontexten nach anerkannten Verfahren — das ist in Deutschland reguliert und nicht jedes Gespräch ist automatisch Psychotherapie.",
            "Wenn Sie unsicher sind: schreiben Sie Ihre Hauptbelastung und den Zeitrahmen in einer kurzen Anfrage. Seriöse Anbieter erklären ehrlich, ob sie das anbieten oder weitervermitteln.",
          ],
        },
        {
          heading: "Warum Muttersprache hier oft wichtiger ist als beim Behördengang",
          bullets: [
            "Feinnuancen von Scham, Angst oder Schuld lassen sich auf Deutsch oft nur mühsam beschreiben — in der Muttersprache geht es schneller zur Sache.",
            "Migrationserfahrung und kultureller Kontext müssen nicht erst „übersetzt“ werden.",
            "Vertrauen entsteht schneller, wenn Sie nicht gleichzeitig Wortschatz sparen müssen.",
          ],
        },
        {
          heading: "Wie nutzt man Freuly hier konkret?",
          body: [
            "Starten Sie über die Kacheln zu Psycholog:innen, Psychotherapie, Coaching oder Ernährung — dort sehen Sie passende Fachkräfte mit echten Profilen.",
            "Gibt es eine eingehende Themenseite (zum Beispiel Psycholog:innen in Deutschland mit Ukrainisch und Russisch), nutzen Sie diese als zweiten Einstieg.",
            "Schreiben Sie nicht „alles“, sondern eine knappe Erstinformation: aktuelle Belastung, gewünschtes Format (online/vor Ort) und ob ein Erstkontakt zeitnah nötig ist.",
          ],
        },
      ],
      specialistsTitle: "Ein Blick in passende Profile",
      specialistsEmpty:
        "Sobald sichtbare Spezialistinnen und Spezialisten dieser Übersicht zugeordnet sind, erscheinen sie hier.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Ist jede Person auf Freuly approbierte Psychotherapeut:in?",
          answer:
            "Nein — Freuly zeigt unterschiedliche Profile. Prüfen Sie im Steckbrief Ausbildung, Titel, angebotene Formate und ggf. Kostenträger. Bei psychischen Notfällen wenden Sie sich an ärztliche Notdienste oder Notruf 112.",
        },
        {
          question: "Kann ich online starten und später vor Ort wechseln?",
          answer:
            "Viele Fachkräfte bieten flexibel online, hybrid oder vor Ort — fragen Sie konkret nach Kapazität und Datenschutz bei Videositzungen.",
        },
        {
          question: "Was, wenn ich mehrere Themen gleichzeitig habe?",
          answer:
            "Das ist üblich. Schreiben Sie die drängendste Belastung zuerst — dann kann die Person einschätzen, ob sie alles abdeckt oder andere Fachrichtungen einbezieht.",
        },
      ],
      relatedTitle: "Vertiefung und benachbarte Themen",
      relatedLinks: [
        {
          href: "psychologists-germany",
          label: "Psycholog:innen in Deutschland (Ukrainisch & Russisch)",
          description:
            "Spezifische Seite zur Suche nach psychologischer Unterstützung in passender Sprache.",
        },
        {
          href: "pflege-betreuung",
          label: "Pflege & Betreuung",
          description: "Wenn der Fokus auf alltäglicher Pflege und Begleitung liegt.",
        },
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description: "Für längere Aufenthalte, Erholung und Planung in Deutschland.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description: "Strukturierte Auszeiten mit klarem Schwerpunkt — ergänzend zu Einzelarbeit.",
        },
      ],
      cta: {
        heading: "Direkt in die Kategorie wechseln",
        body: "Öffnen Sie die Psycholog:innen-Übersicht und filtern Sie nach Stadt, Sprache und Format.",
        buttonLabel: "Psycholog:innen ansehen",
        ctaHref: "/de/category/psychologists",
      },
    },
    ru: {
      slug: "health-psychology",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle: "Психология и здоровье в Германии — поддержка на понятном языке | Freuly",
      metaDescription:
        "Как ориентироваться в психологической помощи, коучинге и смежных направлениях в Германии. Freuly помогает находить специалистов, говорящих по-украински, по-русски или по-немецки, и переходить к нужной категории.",
      h1: "Психология и здоровье — как выбрать формат поддержки",
      breadcrumbsLabel: "Психология и здоровье",
      homeLabel: "Главная",
      intro: [
        "Под здоровьем и психологией в одном блоке часто скрываются разные запросы: пережить кризис, снять тревогу, получить терапию по показаниям, либо поработать с питанием и привычками через консультанта по питанию. Важно не столько название профиля, сколько соответствие задаче, опыту и языку.",
        "Ниже — схема основных направлений и ссылок на категории Freuly, где можно сразу сравнивать профили специалистов.",
      ],
      subcategoriesTitle: "Частые направления",
      subcategories: [
        {
          slug: "psychologists",
          label: "Психологи",
          description:
            "Консультирование, диагностика в рамках компетенций, работа со стрессом, адаптацией, отношениями и личными кризисами.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевты",
          description:
            "Длительная методическая терапия при устойчивых симптомах — формат и оплата зависят от статуса и договорённости.",
        },
        {
          slug: "coaches",
          label: "Коучи",
          description:
            "Про ясные цели, карьерные и жизненные перестановки, прокрастинацию и самоорганизацию без медицинской диагностики.",
        },
        {
          slug: "nutritionists",
          label: "Нутрициологи и консультанты по питанию",
          description:
            "Питание, режим, пищевое поведение — часто в связке с врачом при хронических диагнозах.",
        },
      ],
      sections: [
        {
          heading: "Чем психолог отличается от коуча и когда нужна терапия",
          body: [
            "Психолог чаще помогает осмыслить ситуацию и снизить острый стресс. Коуч фокусируется на движении к задаче. Клиническая психотерапия в Германии проводится по признанным методам и часто связана с медицинским контекстом.",
            "Если есть риск для жизни или сильная растерянность — обратитесь к экстренным службам и врачам; онлайн-платформа не заменяет неотложку.",
          ],
        },
        {
          heading: "Зачем искать специалиста на родном языке",
          bullets: [
            "Стыд, вина, детские воспоминания — быстрее выходят на поверхность без языкового фильтра.",
            "Опыт миграции не нужно объяснять «с нуля».",
            "Проще договориться о формате и границах работы.",
          ],
        },
        {
          heading: "Как пользоваться Freuly на практике",
          body: [
            "Перейдите в карточку категории — например «Психологи» — и отфильтруйте язык и город.",
            "Для узкой темы есть отдельная страница про психологов в Германии при украинском и русском.",
            "В первом сообщении опишите одну главную боль и желаемый формат (онлайн / встреча).",
          ],
        },
      ],
      specialistsTitle: "Примеры профилей",
      specialistsEmpty:
        "Здесь появятся специалисты, когда их анкеты будут сопоставлены с этим разделом.",
      faqTitle: "Вопросы и ответы",
      faq: [
        {
          question: "Все ли на платформе — психотерапевты с немецкой лицензией?",
          answer:
            "Нет, состав разный. Смотрите в профиле образование и статус. Терапия по закону — отдельная линия; при сомнениях уточняйте напрямую.",
        },
        {
          question: "Можно ли начать онлайн?",
          answer:
            "Часто да. Спросите про конфиденциальность, расписание и возможность очных встреч позже.",
        },
        {
          question: "Что писать в первой заявке?",
          answer:
            "Коротко: что болит сейчас, как давно, какой результат хотите и какой язык предпочитаете.",
        },
      ],
      relatedTitle: "Связанные разделы",
      relatedLinks: [
        {
          href: "psychologists-germany",
          label: "Психологи в Германии (украинский и русский)",
          description: "Тематическая страница под языковой запрос.",
        },
        {
          href: "pflege-betreuung",
          label: "Уход и сопровождение",
          description: "Если вопрос быта и ухода за близкими важнее разговорной терапии.",
        },
        {
          href: "reisen-tourismus",
          label: "Туризм и поездки",
          description: "Перемещения и планирование длинных поездок по Германии.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Ритмичный групповой формат как дополнение к индивидуальной работе.",
        },
      ],
      cta: {
        heading: "Перейти к списку психологов",
        body: "Откройте категорию и выберите человека по городу, языку и формату.",
        buttonLabel: "Смотреть категорию «Психологи»",
        ctaHref: "/ru/category/psychologists",
      },
    },
    ua: {
      slug: "health-psychology",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle: "Психологія і здоров’я в Німеччині — підтримка зрозумілою мовою | Freuly",
      metaDescription:
        "Як орієнтуватися між психологічною допомогою, коучингом і суміжними напрямами в Німеччині. Freuly з’єднує з фахівцями українською, російською чи німецькою та веде до потрібної категорії.",
      h1: "Психологія і здоров’я — як обрати формат супроводу",
      breadcrumbsLabel: "Психологія і здоров’я",
      homeLabel: "Головна",
      intro: [
        "У цьому блоці зустрічаються різні запити: пережити кризу, зменшити тривогу, пройти терапевтичний процес, або працювати з харчуванням та звичками. Важливі відповідність задачі й мова спілкування, а не лише гучна спеціалізація в пошуку.",
        "Нижче — карта основних напрямів і посилання на категорії Freuly, де можна відразу переглядати профілі.",
      ],
      subcategoriesTitle: "Типові напрями",
      subcategories: [
        {
          slug: "psychologists",
          label: "Психологи",
          description:
            "Консультування, підтримка при стресі, адаптації, стосунках і особистих кризах.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевти",
          description:
            "Тривала методична робота при стійких симптомах — формат залежить від кваліфікації та договору.",
        },
        {
          slug: "coaches",
          label: "Коучі",
          description:
            "Цілі, зміни в кар’єрі та рутині, прокрастинація — без медичної діагностики.",
        },
        {
          slug: "nutritionists",
          label: "Нутриціологи",
          description:
            "Режим харчування та поведінка за їжею; при хронічних діагнозах — узгоджено з лікарем.",
        },
      ],
      sections: [
        {
          heading: "Відмінності між психологом, коучем і терапією",
          body: [
            "Психолог допомагає зрозуміть ситуацію й стабілізувати стан. Коуч націлює на конкретні кроки. Психотерапія в Німеччині має чіткі рамки; не кожна розмова є терапією в юридичному сенсі.",
            "При гострій загрозі життю звертайтеся до екстрених служб і лікарів — платформа їх не замінює.",
          ],
        },
        {
          heading: "Навіщо рідна мова в терапевтичному контексті",
          bullets: [
            "Легше говорити про сором і страх без перекладу «у голові».",
            "Культурний контекст міграції залишається в розмові, а не на маргінесі.",
            "Швидше виникає довіра й зрозумілі межі роботи.",
          ],
        },
        {
          heading: "Як користуватися Freuly",
          body: [
            "Відкрийте категорію — наприклад «Психологи» — і відфільтруйте мову та місто.",
            "Для вузького інтенту є сторінка про психологів у Німеччині українською та російською.",
            "У першому повідомленні коротко опишіть одну головну проблему та бажаний формат.",
          ],
        },
      ],
      specialistsTitle: "Приклади профілів",
      specialistsEmpty:
        "Спеціалісти з’являться тут, коли їхні анкети будуть пов’язані з цим розділом.",
      faqTitle: "Запитання та відповіді",
      faq: [
        {
          question: "Чи всі фахівці — ліцензовані психотерапевти?",
          answer:
            "Ні, склад різний. У профілі шукайте освіту й статус; за сумнівів уточнюйте напряму.",
        },
        {
          question: "Чи можна почати онлайн?",
          answer:
            "Часто так; уточніть конфіденційність, розклад і можливість очних зустрічей.",
        },
        {
          question: "Що писати в першій заявці?",
          answer:
            "Стисло: що зараз найважче, скільки триває і який результат хочете.",
        },
      ],
      relatedTitle: "Пов’язані розділи",
      relatedLinks: [
        {
          href: "psychologists-germany",
          label: "Психологи в Німеччині (українська та російська)",
          description: "Окрема сторінка під мовний запит.",
        },
        {
          href: "pflege-betreuung",
          label: "Догляд і супровід",
          description: "Коли на першому плані побут і догляд за близькими.",
        },
        {
          href: "reisen-tourismus",
          label: "Подорожі та туризм",
          description: "Планування поїздок і тривалих поїздок.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Структуровані програми як доповнення до індивідуальної роботи.",
        },
      ],
      cta: {
        heading: "До списку психологів",
        body: "Відкрийте категорію та оберіть людину за містом, мовою й форматом.",
        buttonLabel: "Категорія «Психологи»",
        ctaHref: "/ua/category/psychologists",
      },
    },
  },
};
