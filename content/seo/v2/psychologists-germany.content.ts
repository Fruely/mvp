import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Child SEO page under `health-psychology`: psychologists in Germany, Ukrainian & Russian speaking context.
 *
 * Specialist list uses the same Supabase `category` ilike pattern as the public `/specialists/psychologists` hub.
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
        "Psycholog:innen in Deutschland (Ukrainisch & Russisch) finden | Freuly",
      metaDescription:
        "Konkrete Hilfe bei der Suche: Psychologische Fachkräfte in Deutschland, die auf Ukrainisch, Russisch oder Deutsch arbeiten — was Sie vor dem Kontakt klären, Online vs. vor Ort, erste Nachricht, und wie Freuly Profile derselben öffentlichen Kategorie zeigt.",
      h1: "Psycholog:innen in Deutschland — fokussiert auf Ihre Sprache im Setting",
      breadcrumbsLabel: "Psycholog:innen in Deutschland",
      homeLabel: "Startseite",
      parentLabel: "Psychologie & Gesundheit",
      intro: [
        "Diese Seite richtet sich an Menschen, die bereits wissen: Sie wollen eine psychologische Fachkraft in Deutschland — nicht zuerst einen Rundgang durch alle Gesundheits- und Beratungsstile, bevor es konkret wird. Der Schwerpunkt liegt auf Profilen mit Psychologie-Bezug und auf der Alltagsfrage, ob Beratung und Weiteres auf Ukrainisch, Russisch oder (mit) Deutsch stattfinden können.",
        "Der Kontext „Deutschland + mehrere Sprachen“ ist hier kein Marketingdetail, sondern oft der Kern: Alltag, Arbeit, Familie in der Ukraine oder in der Ferne, Erschöpfung durch Sprachwechsel oder das Bedürfnis, emotionale Feinheiten nicht erst übersetzen zu müssen.",
        "Die übergeordnete Seite „Psychologie & Gesundheit“ ordnet breiter ein; hier geht es um den nächsten praktischen Schritt — Profile vergleichen, filtern und anschreiben. Darunter sehen Sie eine Auswahl sichtbarer Profile aus derselben Logik wie die öffentliche Kategorie „Psycholog:innen“.",
      ],
      subcategoriesTitle: "Wenn Ihr Thema schmaler oder breiter ist",
      subcategories: [
        {
          slug: "psychologists",
          label: "Alle Psycholog:innen (öffentliche Kategorie)",
          description:
            "Volle Liste mit Stadt-, Sprach- und Formatfiltern — dieselbe Datengrundlage wie auf dieser Seite.",
        },
        {
          slug: "psychotherapists",
          label: "Psychotherapeut:innen",
          description:
            "Wenn Sie explizit einen verfahrensgebundenen Therapieweg prüfen — nicht jede psychologische Fachkraft ist Psychotherapeut:in im Approbationssinne.",
        },
        {
          slug: "coaches",
          label: "Coaches",
          description:
            "Wenn es primär um berufliche Ziele oder Struktur geht und Sie keine psychologische Fachkraft suchen.",
        },
      ],
      sections: [
        {
          heading: "Typische Suchanlässe — nächster Schritt nach der großen Übersicht",
          body: [
            "Viele Nutzer:innen landen hier mit dem Ziel, schneller einen konkreten Gesprächspartner zu finden — und mit der Erfahrung, dass rein deutschsprachige Beratung schnell stockt, wenn Nuancen fehlen oder kulturelle Tabus unbenannt bleiben.",
            "Ukrainisch oder Russisch im Gespräch ersetzt keine gemeinsame Biografie — erleichtert aber oft den Zugang. Lesen Sie im Profil, welche Sprachen für die eigentliche Arbeit angeboten werden, nicht nur für die Website.",
          ],
        },
        {
          heading: "Online, Präsenz oder hybrid — was sich im Alltag unterscheidet",
          bullets: [
            "Online: weniger Wegzeit, oft leichter einzubauen; klären Sie Ruhe, Vertraulichkeit zu Hause und was bei technischen Ausfällen gilt.",
            "Vor Ort: anderer Raum, andere Körperhaltung — manche Themen erleben Menschen leichter ohne Laptop-Kamera.",
            "Hybrid: Wechsel im Verlauf möglich, wenn die Person das anbietet — nicht jede Fachkraft kombiniert alle Formate.",
            "Freuly zeigt, was im Profil steht; verbindliche Kapazitäten klären Sie in der Nachricht.",
          ],
        },
        {
          heading: "Profil vergleichen — woran Sie einen ersten Fit messen",
          bullets: [
            "Benannte Schwerpunkte (Belastung, Trauer, ADHS-nahe Themen, Paararbeit …) statt nur ein generisches „ich höre zu“.",
            "Sprachen explizit für die psychologische Arbeit, nicht nur Nebensatz „Sprachen: DE, EN“.",
            "Format und ggf. Einzugsgebiet oder reine Online-Praxis.",
            "Transparenz zu Ausbildung und dem, was die Person leistet — und was nicht; bei Unklarheit nachfragen.",
          ],
        },
        {
          heading: "Was Sie vor dem ersten Termin sachlich abfragen können",
          body: [
            "Ohne rechtliche oder kassenrechtliche Zusicherung von Freuly: viele Klärungen laufen direkt — etwa ob Erstgespräch und Folgesitzungen getrennt berechnet werden, wie häufig Sitzungen sinnvoll sind und ob eine andere Fachrichtung naheliegt.",
            "Medizinische Diagnosen stellt die Plattform nicht; ob und wann ein ärztlicher Kontakt nötig ist, entscheidet nicht Ihr Profilvergleich allein.",
          ],
        },
        {
          heading: "Erste Nachricht und erste Sitzung — ohne Überversprechen",
          body: [
            "Eine knappe Nachricht reicht: aktuelle Belastung, ungefähre Dauer, ob schon Behandlung läuft, gewünschte Sprache und ob online oder vor Ort passt. Daraus kann die Gegenpartei ehrlich sagen: zuständig, Warteliste oder nicht passend.",
            "Eine erste Sitzung ersetzt kein langes Vorab-Assessment im Netz — sie dient meist Kennenlernen, Erwartungen und ob Sie weiterarbeiten wollen. Passt die Chemie nicht, ist ein Wechsel legitim; das ist kein Versagen.",
          ],
        },
        {
          heading: "So nutzen Sie Freuly hier konkret",
          body: [
            "Lesen Sie Text und Sprachen im Profil, vergleichen Sie mehrere Personen. Nutzen Sie die Verlinkung zur Kategorie „Psycholog:innen“, wenn Sie Kartenfilter brauchen.",
            "Brauchen Sie zuerst die große Landkarte über Coaching und Therapie-Unterschiede, springen Sie kurz zur übergeordneten Seite „Psychologie & Gesundheit“ — und kehren Sie hierher zurück, sobald der Fokus klar „Psycholog:in in Deutschland mit passender Sprache“ ist.",
          ],
        },
      ],
      specialistsTitle: "Psycholog:innen-Profile (Auswahl)",
      specialistsEmpty:
        "Aktuell keine passenden sichtbaren Profile — öffnen Sie die Kategorie „Psycholog:innen“ über den Button oder versuchen Sie es später erneut.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Ist das dasselbe wie die allgemeine Übersicht „Psychologie & Gesundheit“?",
          answer:
            "Nein. Die übergeordnete Seite erklärt das Themengebiet breiter; diese Seite ist auf die Kombination Psycholog:in in Deutschland plus Sprach-/Kontext gedacht und führt zur gleichen Profilfamilie wie die Kategorie „Psycholog:innen“.",
        },
        {
          question: "Sind alle Listenden automatisch approbierte Psychotherapeut:innen?",
          answer:
            "Nein — Qualifikationen variieren. Das Profil sollte Ausbildung und Angebot nennen; bei der Frage nach approbierter Psychotherapie nach deutschem Recht müssen Sie direkt nachfragen.",
        },
        {
          question: "Übernimmt die Krankenkasse?",
          answer:
            "Das hängt von Status der Person, Vertrag und Einzelfall ab. Freuly ersetzt keine Prüfung Ihrer Kostenübernahme — klären Sie das in der Erstanfrage oder im Erstgespräch.",
        },
        {
          question: "Was tun bei akuter Gefahr für mich oder andere?",
          answer:
            "Notruf 112 oder lokale Krisendienste — Freuly ist kein Echtzeit-Notdienst.",
        },
        {
          question: "Kann ich nur schreiben und keinen Anruf?",
          answer:
            "Oft startet ein Text über die Plattform; ob Telefon oder Video folgt, legt die Fachkraft fest.",
        },
        {
          question: "Was, wenn nach ein oder zwei Terminen der Fit nicht stimmt?",
          answer:
            "Das kommt vor. Besprechen Sie es offen oder suchen Sie jemand anderen — ein Profil ist ein Einstieg, kein lebenslanger Vertrag.",
        },
      ],
      relatedTitle: "Zur Einordnung und zu Nachbarthemen",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Psychologie & Gesundheit — Überblick (Parent)",
          description:
            "Wenn Sie noch zwischen Psycholog:in, Therapieform und anderen Formaten sortieren — danach wieder hierher für die konkrete Psycholog:innen-Suche.",
        },
        {
          href: "pflege-betreuung",
          label: "Pflege & Betreuung",
          description: "Wenn der Alltag Pflege braucht, nicht primär eine psychologische Erstsprechstunde.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description: "Gruppenintensive — andere Struktur als Einzelpsychologie.",
        },
      ],
      cta: {
        heading: "Alle Psycholog:innen mit Filtern öffnen",
        body: "Gleiche Profilbasis wie hier — enger nach Stadt, Sprache und Verfügbarkeit eingrenzen.",
        buttonLabel: "Zur Kategorie Psycholog:innen",
        ctaHref: "/de/specialists/psychologists",
      },
    },
    ru: {
      slug: "psychologists-germany",
      parentSlug: "health-psychology",
      locale: "ru",
      categoryType: "child",
      metaTitle:
        "Психологи в Германии: украинский, русский, немецкий — как выбрать | Freuly",
      metaDescription:
        "Узкий запрос: психологическая поддержка в Германии на понятном языке сессии. Сценарии, что спросить до встречи, онлайн и очно, первая заявка и первая встреча без обещаний исхода — плюс те же профили, что в категории «Психологи».",
      h1: "Психологи в Германии — когда вы уже ищете человека, а не «про психологию вообще»",
      breadcrumbsLabel: "Психологи в Германии",
      homeLabel: "Главная",
      parentLabel: "Психология и здоровье",
      intro: [
        "Страница для тех, кто вводит в поиске не «что такое психология», а кого-то конкретного: специалиста с психологическим профилем в Германии, с опорой на язык сессии — украинский, русский или немецкий в совместной работе.",
        "Типичный контекст жизни в Германии при связях с Украиной или русскоязычным окружением: усталость от постоянного переключения языков, острые или затяжные переживания, семейные сюжеты через границу. Здесь не пересказ общей карты рынка — в отличие от родительской страницы «Психология и здоровье», где расширен зонт форматов.",
        "Ниже — практические ориентиры и выборка профилей из той же публичной логики, что и раздел «Психологи».",
      ],
      subcategoriesTitle: "Если запрос уже не «только психолог»",
      subcategories: [
        {
          slug: "psychologists",
          label: "Все психологи (категория)",
          description:
            "Полный список с фильтрами — та же база, что и на этой странице.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевты",
          description:
            "Когда важен именно длинный терапевтический процесс и статус в DE — не каждый психолог им является.",
        },
        {
          slug: "coaches",
          label: "Коучи",
          description:
            "Если вам ближе цели и структура без запроса к психологическому профилю.",
        },
      ],
      sections: [
        {
          heading: "Кого вы ищете, открывая эту страницу",
          body: [
            "Смысл — быстрее сойтись с тем, что вам нужен разговор с психологом или смежным профилем именно в немецком контексте и с языком под душу. Это не лонгрид «обо всём»: сопоставление ролей (психолог / терапия / коучинг) — на входной странице раздела «Психология и здоровье».",
            "Если речь о суицидальных мыслях или немедленной опасности — сначала экстренные службы и очная помощь, не ожидание ответа в приложении.",
          ],
        },
        {
          heading: "Ситуации, когда особенно часто ищут родной язык",
          bullets: [
            "Хронический стресс после переезда и нагрузки «быть сильным всё время».",
            "Семейные конфликты на фоне войны, разлуки, статуса «гостя» в стране.",
            "Паника, бессонница, выгорание — и ощущение, что на немецком вы описываете симптомы слишком сухо.",
            "Потребность не объяснять миграцию с нуля, а работать с тем, что уже внутри.",
          ],
        },
        {
          heading: "Онлайн, очно, гибрид — на что смотреть в календаре",
          bullets: [
            "Онлайн: экономия дороги; уточните приватность дома и план на сбой связи.",
            "Очно: другой контакт и границы пространства — иногда проще «дотронуться до тяжёлого» не через экран.",
            "Гибрид: не у всех в анкете; спросите прямо.",
          ],
        },
        {
          heading: "Как сравнивать анкеты, не теряя время",
          bullets: [
            "Читаемое описание метода и тем, а не одно слово «тревога».",
            "Языки именно для терапевтической работы.",
            "Город или чистый онлайн — совпадает ли с вашим бытом.",
            "Честная граница: что человек не делает (например, не работает с детьми).",
          ],
        },
        {
          heading: "Что уточнить до первого часа (без юридических обещаний с нашей стороны)",
          body: [
            "Стоимость первой и следующих встреч, формат оплаты, возможные очереди — это нормальные вопросы. Страховой статус и права по GKV/PKV мы не подтверждаем: это между вами и специалистом или вашей кассой.",
            "Мы не ставим диагнозы и не оцениваем медицинскую срочность — при сомнении к врачу.",
          ],
        },
        {
          heading: "Первая заявка и первая встреча",
          body: [
            "В заявке: что болит сейчас, как долго, нужен ли язык сессии украинский/русский и онлайн или офлайн. Коротко — чтобы получить честный ответ «подхожу / нет / позже».",
            "Первая встреча обычно про знакомство и договорённости, не «исцеление за час». Не сошлись — это нормальный повод искать другого человека.",
          ],
        },
        {
          heading: "Первый шаг в Freuly",
          body: [
            "Просмотрите несколько карточек, отфильтруйте категорию «Психологи» при необходимости. Родительская «Психология и здоровье» остаётся запасным входом, если вы ещё выбираете между коучем и психологом.",
          ],
        },
      ],
      specialistsTitle: "Профили психологов (выборка)",
      specialistsEmpty:
        "Сейчас пусто — перейдите в категорию «Психологи» кнопкой ниже или зайдите позже.",
      faqTitle: "Вопросы и ответы",
      faq: [
        {
          question: "Чем эта страница отличается от обзора «Психология и здоровье»?",
          answer:
            "Родительская — широкий зонт и сравнение ролей. Здесь уместен узкий интент: психолог в Германии и язык сессии; меньше обзора, больше выбора человека.",
        },
        {
          question: "Все здесь — психотерапевты по немецкому закону?",
          answer:
            "Нет. Состав смешанный. Статус смотрите в профиле и уточняйте при сомнениях.",
        },
        {
          question: "Freuly гарантирует результат терапии?",
          answer:
            "Нет — платформа показывает профили и контакт; исход зависит от задачи, пары специалист-клиент и обстоятельств.",
        },
        {
          question: "Что при острой опасности?",
          answer:
            "Локальная неотложка и телефоны помощи — не переписка на сайте.",
        },
        {
          question: "Можно только перепиской?",
          answer:
            "Часто первая точка — текст; звонок или видео по договорённости.",
        },
        {
          question: "Не подошло после пары встреч?",
          answer:
            "Имеет смысл сказать прямо и поискать другого специалиста — это обычная практика.",
        },
      ],
      relatedTitle: "Связанные страницы",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психология и здоровье — родительский обзор",
          description:
            "Если нужно сначала развести психолога, терапию и коучинг — потом вернитесь сюда за выбором психолога.",
        },
        {
          href: "pflege-betreuung",
          label: "Уход и сопровождение",
          description: "Когда приоритет быт и уход, а не психологическая первая линия.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Другая структура времени и группы.",
        },
      ],
      cta: {
        heading: "Открыть полный список психологов",
        body: "Фильтры по городу и языку — та же логика отображения, что здесь.",
        buttonLabel: "К категории «Психологи»",
        ctaHref: "/ru/specialists/psychologists",
      },
    },
    ua: {
      slug: "psychologists-germany",
      parentSlug: "health-psychology",
      locale: "ua",
      categoryType: "child",
      metaTitle:
        "Психологи в Німеччині: українська, російська, німецька — вибір | Freuly",
      metaDescription:
        "Дочірня сторінка під конкретний запит: психологічна підтримка в Німеччині рідною мовою сесії, практичні сценарії, онлайн чи офлайн, що узгодити до зустрічі, перша заявка — без медичних обіцянок. Профілі як у категорії «Психологи».",
      h1: "Психологи в Німеччині — коли потрібен фахівець, а не вступ до «усієї психології»",
      breadcrumbsLabel: "Психологи в Німеччині",
      homeLabel: "Головна",
      parentLabel: "Психологія і здоров’я",
      intro: [
        "Сторінка для пошуку конкретного профілю психолога в Німеччині з опорою на мову роботи: українську, російську чи німецьку — як ви домовитеся. Це не довідка про всі напрями психічного здоров’я: широку карту ролей дає батьківська «Психологія і здоров’я».",
        "Тут фокус на типових причинах шукати саме психолога саме тут: навантаження переїзду, подвійний культурний код, втома від постійного пояснювати себе німецькою, коли хочеться говорити про себе рідною мовою.",
        "Далі — перевірені орієнтири й добірка акаунтів із тієї ж публічної логіки, що й розділ «Психологи».",
      ],
      subcategoriesTitle: "Якщо запит уже не лише «психолог»",
      subcategories: [
        {
          slug: "psychologists",
          label: "Усі психологи",
          description: "Повний каталог із фільтрами — та ж база.",
        },
        {
          slug: "psychotherapists",
          label: "Психотерапевти",
          description: "Коли потрібен саме тривалий терапевтичний процес у німецьких рамках.",
        },
        {
          slug: "coaches",
          label: "Коучі",
          description: "Якщо ближче цілі й звички, а не профіль психолога.",
        },
      ],
      sections: [
        {
          heading: "Навіщо ця сторінка поруч із загальним оглядом",
          body: [
            "Вона відповідає на запит «мені потрібен психолог у Німеччині, і мова сесії критична». Батьківська пояснює парасольку форматів — коучинг, терапія, консультування; тут менше повтору теорії, більше дій із профілями.",
            "Гострий стан загрози життю — до екстрених служб, не до очікування відповіді в кабінеті на сайті.",
          ],
        },
        {
          heading: "Сценарії, де часто шукають рідну мову",
          bullets: [
            "Вигорання, тривога, порушення сну без «гучного» діагнозу в голові.",
            "Родинні конфлікти на відстані або після переїзду.",
            "Потреба не витрачати сесію на переклад емоцій з української в «правильну» німецьку.",
            "Репетиторство німецької вже не допомагає з психологічним навантаженням.",
          ],
        },
        {
          heading: "Онлайн, офлайн, змішаний формат",
          bullets: [
            "Онлайн — зручність графіка; уточіть приватність і резерв на технічні збої.",
            "Офлайн — інший простір тіла; деякі теми легше без «квадратика» в ноутбуці.",
            "Комбінація — лише якщо фахівець це пропонує.",
          ],
        },
        {
          heading: "Як обрати без зайвого скролу",
          bullets: [
            "Зрозуміле описання тем і методу.",
            "Мови саме для терапевтичної роботи.",
            "Місто чи чистий онлайн.",
            "Якщо вказано межі: з якими групами не працює людина — це добрий знак.",
          ],
        },
        {
          heading: "Що узгодити до оплати години",
          body: [
            "Вартість першої та наступних зустрічей, можлива черга — нормальні питання. Страхове покриття Freuly не підтверджує: це між вами, фахівцем і вашим договором.",
            "Діагнози й медична невідкладність — зона лікаря; не покладайтеся лише на порівняння профілів.",
          ],
        },
        {
          heading: "Перше повідомлення і перша зустріч",
          body: [
            "Напишіть коротко: що зараз найгостріше, скільки триває, який мова сесії і формат. Достатньо для відповіді «беру / не беру / пізніше».",
            "Перша зустріч зазвичай про знайомство і угоду про роботу, не про миттєвий ефект. Якщо контакт не «зійшовся» — можна шукати іншого.",
          ],
        },
        {
          heading: "Перший крок у Freuly",
          body: [
            "Порівняйте кілька профілів, за потреби відкрийте категорію «Психологи». Якщо ще ламаєтеся між коучем і психологом — спершу батьківська сторінка, потім сюди.",
          ],
        },
      ],
      specialistsTitle: "Профілі психологів (добірка)",
      specialistsEmpty:
        "Поки порожньо — кнопка нижче веде до повної категорії.",
      faqTitle: "Питання та відповіді",
      faq: [
        {
          question: "Чим це відрізняється від огляду «Психологія і здоров’я»?",
          answer:
            "Батьківська дає карту напрямів; тут — звуження до пошуку психолога в Німеччині з мовним акцентом.",
        },
        {
          question: "Чи всі — ліцензовані психотерапевти в Німеччині?",
          answer:
            "Ні. Перевіряйте профіль і запитуйте прямо про статус.",
        },
        {
          question: "Чи гарантує платформа результат?",
          answer:
            "Ні — показує профілі; результат залежить від запиту та пари клієнт-фахівець.",
        },
        {
          question: "Гостра небезпека?",
          answer:
            "Служби 112 і локальні кризові лінії — не лист у формі на сайті.",
        },
        {
          question: "Можна лише текстом?",
          answer:
            "Часто так; телефон або відео за домовленістю.",
        },
        {
          question: "Що якщо не зайшло після кількох зустрічей?",
          answer:
            "Нормально озвучити й обрати іншого спеціаліста.",
        },
      ],
      relatedTitle: "Зв’язані розділи",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія і здоров’я — батьківський огляд",
          description:
            "Якщо треба спочатку відокремити ролі — потім поверніться сюди для вибору психолога.",
        },
        {
          href: "pflege-betreuung",
          label: "Догляд і супровід",
          description: "Коли головне — побут і догляд за близьким.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Інший формат часу та групи.",
        },
      ],
      cta: {
        heading: "Відкрити категорію «Психологи»",
        body: "Фільтри міста та мови — та ж база профілів.",
        buttonLabel: "До списку психологів",
        ctaHref: "/ua/specialists/psychologists",
      },
    },
  },
};
