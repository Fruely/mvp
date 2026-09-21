import type { Lang } from "@/lib/i18n";

export type ForSpecialistsCopy = {
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    cta: string;
    secondaryCta: string;
    note: string;
  };
  illustration: { alt: string; tags: readonly [string, string, string] };
  proof: readonly { value: string; title: string; body: string }[];
  problem: { title: string; intro: string; bullets: readonly string[]; caption: string };
  steps: { title: string; items: readonly { number: string; title: string; body: string }[] };
  seo: { title: string; intro: string };
  categories: { title: string; intro: string; items: readonly string[] };
  offer: { title: string; intro: string; bullets: readonly string[]; caption: string };
  faq: { title: string; items: readonly { q: string; a: string }[] };
  finalCta: { headline: string; body: string; button: string };
};

const ruCopy: ForSpecialistsCopy = {
  meta: {
    title: "Получайте заявки от клиентов в Германии — Freuly для специалистов",
    description:
      "Freuly помогает специалистам в Германии получать заявки и целевые обращения клиентов: профиль, локальный поиск, категории услуг, города и продвижение от 29 евро в месяц.",
  },
  hero: {
    eyebrow: "Freuly для специалистов в Германии",
    headline: "Забудьте о поиске клиентов. Начните получать заявки в вашем городе",
    sub:
      "Freuly помогает специалистам в Германии получать заявки и целевые обращения клиентов на русском, украинском и немецком языках. Вы зарабатываете деньги на своей услуге, а не тратите часы на рекламу, контент и бесконечные попытки поймать клиента в соцсетях.",
    cta: "Начать принимать заявки",
    secondaryCta: "Как это работает",
    note:
      "Регистрация и публикация профиля — бесплатно. Платите только за доступ к заявкам: разово или по подписке от 29€/мес.",
  },
  illustration: {
    alt: "Цветная иллюстрация про заявки для специалистов Freuly",
    tags: ["реклама", "контент", "заявки"],
  },
  proof: [
    {
      value: "0 €",
      title: "за профиль",
      body: "Регистрация и публикация профиля бесплатны. Платная часть начинается с доступа к клиентским заявкам.",
    },
    {
      value: "0%",
      title: "комиссии с заказа",
      body: "Вы забираете 100% своего гонорара. Freuly не становится посредником между вами и клиентом.",
    },
    {
      value: "5 минут",
      title: "до старта профиля",
      body: "Профиль бесплатный, готов за 5 минут: имя, город, языки, категория, услуги и цены — и клиент уже может вас найти.",
    },
  ],
  problem: {
    title: "Хватит выпрашивать внимание у алгоритмов",
    intro:
      "Самозанятый специалист в Германии часто превращается в рекламное агентство для самого себя: пишет посты, снимает сторис, проверяет охваты, думает про таргет, платит за тесты и всё равно не знает, когда придёт следующая заявка.",
    bullets: [
      "Instagram и Telegram видят ваши подписчики, но не обязательно тот человек, который сегодня ищет психолога, мастера, репетитора, бухгалтера или IT-помощь рядом с собой.",
      "Таргет и реклама могут стоить сотни евро в месяц, а настройка без опыта легко превращается в слив бюджета без заявок.",
      "Сарафанное радио приятно слышать, но его нельзя включить по расписанию, масштабировать по городам и стабильно планировать по нему доход.",
    ],
    caption: "Хватит бегать за клиентами. Начните получать заявки.",
  },
  steps: {
    title: "Как Freuly приводит клиента к вашей заявке",
    items: [
      {
        number: "01",
        title: "Мы собираем локальный спрос",
        body:
          "Человек ищет услугу в Германии: психолог онлайн, мастер маникюра в Дюссельдорфе, электрик, переводчик, репетитор, IT-помощь, бухгалтер на русском языке. Freuly строится под такие поисковые сценарии.",
      },
      {
        number: "02",
        title: "Клиент видит ваш профиль",
        body:
          "В профиле сразу понятно, кто вы, в каком городе работаете, на каких языках говорите, какие услуги оказываете, сколько это стоит и как с вами связаться.",
      },
      {
        number: "03",
        title: "Вы получаете обращение напрямую",
        body:
          "Клиент оставляет заявку или пишет вам. Вы слышите конкретный запрос, видите задачу и сами договариваетесь о цене, времени и формате работы.",
      },
    ],
  },
  seo: {
    title: "Страница работает не как визитка ради визитки, а как точка входа для заявок",
    intro:
      "Человек ищет нужную услугу в своём городе, открывает ваш профиль, понимает предложение и связывается напрямую. Freuly помогает пройти этот путь без лишней рекламной суеты: от интереса к услуге до заявки специалисту.",
  },
  categories: {
    title: "Кому подходит Freuly.de",
    intro:
      "Платформа подходит специалистам и малому бизнесу, которые продают услугу, консультацию, работу руками, обучение или помощь на понятном клиенту языке.",
    items: [
      "Психологи, коучи, консультанты",
      "Репетиторы, преподаватели, наставники",
      "Красота и здоровье: косметологи, мастера маникюра, массажисты",
      "Ремонт, строительство, электрика, сантехника, сборка мебели",
      "IT-помощь, настройка техники, сайты и приложения",
      "Юристы, бухгалтеры, переводчики, миграционные консультации",
      "Фотографы, ведущие, частные и бытовые услуги",
      "Специалисты онлайн и офлайн в Берлине, Мюнхене, Дюссельдорфе, Кёльне, Франкфурте, Штутгарте и других городах",
    ],
  },
  offer: {
    title: "Что получает специалист",
    intro:
      "Не обещание ради обещания, а понятный путь к заявке: человек ищет услугу, находит ваш профиль, понимает предложение и связывается напрямую. Цель простая: чтобы вы начали получать заявки и могли зарабатывать деньги на своей работе.",
    bullets: [
      "Готовый профиль специалиста: услуги, цены, языки, город, фото, описание, портфолио и отзывы.",
      "Прямая ссылка, которую можно отправлять клиентам вместо длинных объяснений в мессенджерах.",
      "Клиенты находят вас по городу, языку и типу услуги: психолог, ремонт техники, репетитор, электрик, бухгалтер, переводчик, IT-помощь и другие запросы.",
      "Возможность получать обращения без комиссии и без обязанности отдавать процент с каждого заказа.",
      "Дальше мы будем усиливать продукт: больше городов, больше категорий, реклама, контент и отдельные маркетинговые пакеты для специалистов.",
    ],
    caption: "Вы зарабатываете деньги. Freuly помогает привести обращение к вам.",
  },
  faq: {
    title: "Частые вопросы",
    items: [
      {
        q: "Вы гарантируете конкретное количество заявок?",
        a: "Мы не рисуем фантастические цифры. Мы строим и продвигаем систему, цель которой — приводить целевые обращения. Количество заявок зависит от города, ниши, цены, качества профиля и спроса, но весь смысл Freuly именно в том, чтобы специалист не покупал призрак видимости, а получал маршрут к реальным клиентам.",
      },
      {
        q: "Почему это выгоднее, чем самому запускать рекламу?",
        a: "Потому что самостоятельный таргет часто начинается от сотен евро за настройку и тесты. На Freuly старт от 29 евро в месяц, а в будущем максимальный пакет планируется в районе 60 евро: это маленький бюджет за понятную точку входа к заявкам.",
      },
      {
        q: "Если у меня уже есть Instagram, Telegram или сарафан, зачем мне Freuly?",
        a: "Соцсети работают на вашу аудиторию, а Freuly закрывает другой момент: человек уже ищет услугу по городу, языку и категории. Это не замена вашим каналам, а ещё один путь, по которому клиент может прийти к вам.",
      },
      {
        q: "Куда ведёт кнопка «Начать принимать заявки»?",
        a: "На форму регистрации специалиста. Вы создаёте профиль, заполняете основные данные и готовите страницу, через которую клиент сможет понять ваше предложение и связаться с вами.",
      },
    ],
  },
  finalCta: {
    headline: "Перестаньте искать клиентов вручную. Начните принимать заявки через Freuly",
    body:
      "Создайте профиль специалиста, покажите услуги и дайте клиенту простой путь к вам: увидеть, понять, довериться и написать.",
    button: "Зарегистрировать профиль специалиста",
  },
};

const uaCopy: ForSpecialistsCopy = {
  meta: {
    title: "Отримуйте заявки від клієнтів у Німеччині — Freuly для спеціалістів",
    description:
      "Freuly допомагає спеціалістам у Німеччині отримувати заявки та цільові звернення клієнтів: профіль, локальний пошук, категорії послуг, міста та просування від 29 євро на місяць.",
  },
  hero: {
    eyebrow: "Freuly для спеціалістів у Німеччині",
    headline: "Забудьте про пошук клієнтів. Почніть отримувати заявки у своєму місті",
    sub:
      "Freuly допомагає спеціалістам у Німеччині отримувати заявки та цільові звернення клієнтів російською, українською та німецькою мовами. Ви заробляєте на своїй послузі, а не витрачаєте години на рекламу, контент і нескінченні спроби піймати клієнта в соцмережах.",
    cta: "Почати приймати заявки",
    secondaryCta: "Як це працює",
    note:
      "Реєстрація та публікація профілю — безкоштовно. Платіть лише за доступ до запитів: разово або за підпискою від 29 €/міс.",
  },
  illustration: {
    alt: "Кольорова ілюстрація про заявки для спеціалістів Freuly",
    tags: ["реклама", "контент", "заявки"],
  },
  proof: [
    {
      value: "0 €",
      title: "за профіль",
      body: "Реєстрація та публікація профілю безкоштовні. Платна частина починається з доступу до клієнтських запитів.",
    },
    {
      value: "0%",
      title: "комісії із замовлення",
      body: "Ви залишаєте 100% свого гонорару. Freuly не стає посередником між вами та клієнтом.",
    },
    {
      value: "5 хвилин",
      title: "до старту профілю",
      body: "Профіль безкоштовний і готовий за 5 хвилин: ім’я, місто, мови, категорія, послуги та ціни — і клієнт уже може вас знайти.",
    },
  ],
  problem: {
    title: "Досить випрошувати увагу в алгоритмів",
    intro:
      "Самозайнятий спеціаліст у Німеччині часто перетворюється на рекламне агентство для самого себе: пише пости, знімає сторіс, перевіряє охоплення, думає про таргет, платить за тести і все одно не знає, коли прийде наступна заявка.",
    bullets: [
      "Instagram і Telegram бачать ваші підписники, але не обов’язково та людина, яка сьогодні шукає психолога, майстра, репетитора, бухгалтера чи IT-допомогу поруч із собою.",
      "Таргет і реклама можуть коштувати сотні євро на місяць, а налаштування без досвіду легко перетворюється на злив бюджету без заявок.",
      "Сарафанне радіо приємно чути, але його не можна увімкнути за розкладом, масштабувати по містах і стабільно планувати за ним дохід.",
    ],
    caption: "Досить бігати за клієнтами. Почніть отримувати заявки.",
  },
  steps: {
    title: "Як Freuly приводить клієнта до вашої заявки",
    items: [
      {
        number: "01",
        title: "Ми збираємо локальний попит",
        body:
          "Людина шукає послугу в Німеччині: психолог онлайн, майстер манікюру в Дюссельдорфі, електрик, перекладач, репетитор, IT-допомога, бухгалтер українською мовою. Freuly будується під такі пошукові сценарії.",
      },
      {
        number: "02",
        title: "Клієнт бачить ваш профіль",
        body:
          "У профілі одразу зрозуміло, хто ви, в якому місті працюєте, якими мовами говорите, які послуги надаєте, скільки це коштує і як із вами зв’язатися.",
      },
      {
        number: "03",
        title: "Ви отримуєте звернення напряму",
        body:
          "Клієнт залишає заявку або пише вам. Ви чуєте конкретний запит, бачите задачу і самі домовляєтеся про ціну, час і формат роботи.",
      },
    ],
  },
  seo: {
    title: "Сторінка працює не як візитка заради візитки, а як точка входу для заявок",
    intro:
      "Людина шукає потрібну послугу у своєму місті, відкриває ваш профіль, розуміє пропозицію і зв’язується напряму. Freuly допомагає пройти цей шлях без зайвої рекламної метушні: від інтересу до послуги до заявки спеціалісту.",
  },
  categories: {
    title: "Кому підходить Freuly.de",
    intro:
      "Платформа підходить спеціалістам і малому бізнесу, які продають послугу, консультацію, роботу руками, навчання або допомогу зрозумілою клієнту мовою.",
    items: [
      "Психологи, коучі, консультанти",
      "Репетитори, викладачі, наставники",
      "Краса та здоров’я: косметологи, майстри манікюру, масажисти",
      "Ремонт, будівництво, електрика, сантехніка, збирання меблів",
      "IT-допомога, налаштування техніки, сайти та застосунки",
      "Юристи, бухгалтери, перекладачі, міграційні консультації",
      "Фотографи, ведучі, приватні та побутові послуги",
      "Спеціалісти онлайн і офлайн у Берліні, Мюнхені, Дюссельдорфі, Кельні, Франкфурті, Штутгарті та інших містах",
    ],
  },
  offer: {
    title: "Що отримує спеціаліст",
    intro:
      "Не обіцянка заради обіцянки, а зрозумілий шлях до заявки: людина шукає послугу, знаходить ваш профіль, розуміє пропозицію і зв’язується напряму. Мета проста: щоб ви почали отримувати заявки і могли заробляти на своїй роботі.",
    bullets: [
      "Готовий профіль спеціаліста: послуги, ціни, мови, місто, фото, опис, портфоліо та відгуки.",
      "Пряме посилання, яке можна надсилати клієнтам замість довгих пояснень у месенджерах.",
      "Клієнти знаходять вас за містом, мовою і типом послуги: психолог, ремонт техніки, репетитор, електрик, бухгалтер, перекладач, IT-допомога та інші запити.",
      "Можливість отримувати звернення без комісії і без обов’язку віддавати відсоток із кожного замовлення.",
      "Далі ми посилюватимемо продукт: більше міст, більше категорій, реклама, контент і окремі маркетингові пакети для спеціалістів.",
    ],
    caption: "Ви заробляєте гроші. Freuly допомагає привести звернення до вас.",
  },
  faq: {
    title: "Часті запитання",
    items: [
      {
        q: "Ви гарантуєте конкретну кількість заявок?",
        a: "Ми не малюємо фантастичні цифри. Ми будуємо і просуваємо систему, мета якої — приводити цільові звернення. Кількість заявок залежить від міста, ніші, ціни, якості профілю і попиту, але весь сенс Freuly саме в тому, щоб спеціаліст не купував привид видимості, а отримував маршрут до реальних клієнтів.",
      },
      {
        q: "Чому це вигідніше, ніж самостійно запускати рекламу?",
        a: "Тому що самостійний таргет часто починається від сотень євро за налаштування і тести. На Freuly старт від 29 євро на місяць, а в майбутньому максимальний пакет планується близько 60 євро: це невеликий бюджет за зрозумілу точку входу до заявок.",
      },
      {
        q: "Якщо в мене вже є Instagram, Telegram або сарафан, навіщо мені Freuly?",
        a: "Соцмережі працюють на вашу аудиторію, а Freuly закриває інший момент: людина вже шукає послугу за містом, мовою і категорією. Це не заміна вашим каналам, а ще один шлях, яким клієнт може прийти до вас.",
      },
      {
        q: "Куди веде кнопка «Почати приймати заявки»?",
        a: "На форму реєстрації спеціаліста. Ви створюєте профіль, заповнюєте основні дані і готуєте сторінку, через яку клієнт зможе зрозуміти вашу пропозицію і зв’язатися з вами.",
      },
    ],
  },
  finalCta: {
    headline: "Припиніть шукати клієнтів вручну. Почніть приймати заявки через Freuly",
    body:
      "Створіть профіль спеціаліста, покажіть послуги і дайте клієнту простий шлях до вас: побачити, зрозуміти, довіритися і написати.",
    button: "Зареєструвати профіль спеціаліста",
  },
};

const deCopy: ForSpecialistsCopy = {
  meta: {
    title: "Anfragen von Kundinnen und Kunden in Deutschland erhalten — Freuly für Fachkräfte",
    description:
      "Freuly hilft Fachkräften in Deutschland, Anfragen und gezielte Kundenanfragen zu erhalten: Profil, lokale Suche, Leistungskategorien, Städte und Sichtbarkeit ab 29 Euro im Monat.",
  },
  hero: {
    eyebrow: "Freuly für Fachkräfte in Deutschland",
    headline: "Hören Sie auf, Kundschaft zu suchen. Beginnen Sie, Anfragen in Ihrer Stadt zu erhalten",
    sub:
      "Freuly hilft Fachkräften in Deutschland, Anfragen und gezielte Kundenanfragen auf Russisch, Ukrainisch und Deutsch zu erhalten. Sie verdienen an Ihrer Leistung, statt Stunden in Werbung, Content und endlose Versuche zu stecken, Kundschaft in sozialen Netzwerken zu finden.",
    cta: "Anfragen annehmen",
    secondaryCta: "So funktioniert es",
    note:
      "Ein Profil kostet ab 29 Euro im Monat. Keine Provision vom Auftrag: Kundinnen und Kunden schreiben Ihnen direkt, Preis und Konditionen klären Sie selbst.",
  },
  illustration: {
    alt: "Farbige Illustration zu Kundenanfragen für Freuly-Fachkräfte",
    tags: ["Werbung", "Content", "Anfragen"],
  },
  proof: [
    {
      value: "0 €",
      title: "für das Profil",
      body: "Registrierung und Veröffentlichung sind kostenlos. Kostenpflichtig ist der Zugang zu Kundenanfragen.",
    },
    {
      value: "0%",
      title: "Provision vom Auftrag",
      body: "Sie behalten 100 % Ihres Honorars. Freuly wird nicht zum Vermittler zwischen Ihnen und der Kundschaft.",
    },
    {
      value: "5 Minuten",
      title: "bis zum Start des Profils",
      body: "Name, Stadt, Sprachen, Kategorie, Leistungen und Preise — und Kundinnen und Kunden haben bereits einen klaren Weg zu Ihnen.",
    },
  ],
  problem: {
    title: "Hören Sie auf, Algorithmen um Aufmerksamkeit zu bitten",
    intro:
      "Selbstständige Fachkräfte in Deutschland werden oft zur Werbeagentur in eigener Sache: Posts schreiben, Stories drehen, Reichweite prüfen, Targeting planen, Tests bezahlen — und trotzdem nicht wissen, wann die nächste Anfrage kommt.",
    bullets: [
      "Instagram und Telegram sehen Ihre Follower, aber nicht unbedingt die Person, die heute eine Psychologin, eine Handwerkerin, Nachhilfe, Buchhaltung oder IT-Hilfe in der Nähe sucht.",
      "Targeting und Werbung können Hunderte Euro im Monat kosten. Ohne Erfahrung wird die Einrichtung schnell zum Budgetverlust ohne Anfragen.",
      "Mundpropaganda ist angenehm, aber sie lässt sich nicht einschalten, nicht nach Städten skalieren und nicht verlässlich als Einkommen planen.",
    ],
    caption: "Hören Sie auf, Kundschaft hinterherzulaufen. Beginnen Sie, Anfragen zu erhalten.",
  },
  steps: {
    title: "Wie Freuly Kundinnen und Kunden zu Ihrer Anfrage führt",
    items: [
      {
        number: "01",
        title: "Wir bündeln die lokale Nachfrage",
        body:
          "Jemand sucht eine Leistung in Deutschland: Psychologin online, Nageldesign in Düsseldorf, Elektriker, Dolmetscherin, Nachhilfe, IT-Hilfe, Buchhaltung auf Russisch. Freuly ist für genau solche Suchen gebaut.",
      },
      {
        number: "02",
        title: "Kundinnen und Kunden sehen Ihr Profil",
        body:
          "Im Profil ist sofort klar, wer Sie sind, in welcher Stadt Sie arbeiten, welche Sprachen Sie sprechen, welche Leistungen Sie anbieten, was das kostet und wie man Sie erreicht.",
      },
      {
        number: "03",
        title: "Sie erhalten die Anfrage direkt",
        body:
          "Kundinnen und Kunden hinterlassen eine Anfrage oder schreiben Ihnen. Sie hören den konkreten Bedarf, sehen die Aufgabe und vereinbaren Preis, Termin und Arbeitsform selbst.",
      },
    ],
  },
  seo: {
    title: "Die Seite ist keine Visitenkarte um der Visitenkarte willen, sondern ein Einstieg zu Anfragen",
    intro:
      "Jemand sucht eine Leistung in der eigenen Stadt, öffnet Ihr Profil, versteht das Angebot und nimmt direkt Kontakt auf. Freuly macht genau diesen Weg einfach: von Interesse an der Leistung bis zur Anfrage an die Fachkraft — ohne unnötigen Werbeaufwand.",
  },
  categories: {
    title: "Für wen Freuly.de geeignet ist",
    intro:
      "Die Plattform eignet sich für Fachkräfte und kleine Unternehmen, die eine Leistung, Beratung, handwerkliche Arbeit, Unterricht oder Hilfe in einer für Kundinnen und Kunden verständlichen Sprache anbieten.",
    items: [
      "Psychologinnen, Coaches, Beratende",
      "Nachhilfe, Lehrkräfte, Mentorinnen und Mentoren",
      "Schönheit und Gesundheit: Kosmetik, Nageldesign, Massage",
      "Reparatur, Bau, Elektrik, Sanitär, Möbelmontage",
      "IT-Hilfe, Geräte-Setup, Websites und Apps",
      "Juristinnen, Buchhaltung, Dolmetschen, Migrationsberatung",
      "Fotografie, Moderation, private und haushaltsnahe Dienste",
      "Online- und Vor-Ort-Fachkräfte in Berlin, München, Düsseldorf, Köln, Frankfurt, Stuttgart und weiteren Städten",
    ],
  },
  offer: {
    title: "Was Fachkräfte erhalten",
    intro:
      "Kein Versprechen um des Versprechens willen, sondern ein klarer Weg zur Anfrage: jemand sucht eine Leistung, findet Ihr Profil, versteht das Angebot und nimmt direkt Kontakt auf. Das Ziel ist einfach: dass Sie Anfragen erhalten und mit Ihrer Arbeit verdienen können.",
    bullets: [
      "Ein fertiges Fachkraft-Profil: Leistungen, Preise, Sprachen, Stadt, Fotos, Beschreibung, Portfolio und Bewertungen.",
      "Ein direkter Link, den Sie Kundinnen und Kunden schicken können, statt lange Erklärungen in Messengern zu tippen.",
      "Kundinnen und Kunden finden Sie nach Stadt, Sprache und Leistung: Psychologie, Gerätereparatur, Nachhilfe, Elektrik, Buchhaltung, Dolmetschen, IT-Hilfe und weitere Anfragen.",
      "Anfragen ohne Provision und ohne Pflicht, einen Anteil jedes Auftrags abzugeben.",
      "Als Nächstes stärken wir das Produkt weiter: mehr Städte, mehr Kategorien, Werbung, Content und eigene Marketingpakete für Fachkräfte.",
    ],
    caption: "Sie verdienen das Geld. Freuly hilft, die Anfrage zu Ihnen zu bringen.",
  },
  faq: {
    title: "Häufige Fragen",
    items: [
      {
        q: "Garantieren Sie eine bestimmte Anzahl an Anfragen?",
        a: "Wir malen keine Fantasiezahlen. Wir bauen und bewerben ein System, dessen Ziel gezielte Anfragen sind. Die Zahl hängt von Stadt, Nische, Preis, Profilqualität und Nachfrage ab. Der Sinn von Freuly ist genau das: keine Scheinsichtbarkeit zu kaufen, sondern einen Weg zu echten Kundinnen und Kunden zu erhalten.",
      },
      {
        q: "Warum ist das günstiger, als selbst Werbung zu schalten?",
        a: "Weil eigenes Targeting oft bei Hunderten Euro für Einrichtung und Tests beginnt. Bei Freuly startet es bei 29 Euro im Monat, später ist ein Maximalpaket um die 60 Euro geplant: ein kleines Budget für einen klaren Einstieg zu Anfragen.",
      },
      {
        q: "Wenn ich schon Instagram, Telegram oder Mundpropaganda habe, wozu dann Freuly?",
        a: "Soziale Netzwerke erreichen Ihr Publikum. Freuly schließt einen anderen Moment: jemand sucht bereits eine Leistung nach Stadt, Sprache und Kategorie. Das ersetzt Ihre Kanäle nicht, sondern ist ein weiterer Weg, auf dem Kundschaft zu Ihnen kommen kann.",
      },
      {
        q: "Wohin führt die Schaltfläche „Anfragen annehmen“?",
        a: "Zum Registrierungsformular für Fachkräfte. Sie legen ein Profil an, füllen die wichtigsten Daten aus und bereiten die Seite vor, über die Kundinnen und Kunden Ihr Angebot verstehen und Sie kontaktieren können.",
      },
    ],
  },
  finalCta: {
    headline: "Hören Sie auf, Kundschaft manuell zu suchen. Nehmen Sie Anfragen über Freuly an",
    body:
      "Erstellen Sie ein Fachkraft-Profil, zeigen Sie Ihre Leistungen und geben Sie Kundinnen und Kunden einen einfachen Weg zu Ihnen: sehen, verstehen, vertrauen und schreiben.",
    button: "Fachkraft-Profil registrieren",
  },
};

export const FOR_SPECIALISTS_COPY: Record<Lang, ForSpecialistsCopy> = {
  ru: ruCopy,
  ua: uaCopy,
  de: deCopy,
};
