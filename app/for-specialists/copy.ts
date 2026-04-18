import type { Lang } from "@/lib/i18n";

export type ForSpecialistsCopy = {
  meta: { title: string; description: string };
  hero: { headline: string; sub: string; cta: string };
  socialLimits: { title: string; intro: string; bullets: readonly string[] };
  valueProps: { title: string; cards: readonly { title: string; body: string }[] };
  audience: { title: string; bullets: readonly string[] };
  push: {
    title: string;
    intro: string;
    bullets: readonly string[];
    cta: string;
    imageAlt: string;
  };
  steps: { title: string; items: readonly { number: string; title: string; description: string }[] };
  faq: { title: string; items: readonly { q: string; a: string }[] };
  finalCta: { headline: string; button: string };
};

export const FOR_SPECIALISTS_COPY: Record<Lang, ForSpecialistsCopy> = {
  ua: {
    meta: {
      title: "Для спеціалістів — Freuly",
      description:
        "Публічний профіль у Freuly: категорія, мова, місто і формат роботи — щоб вас легше знайшли ті, хто вже шукає послугу в Німеччині.",
    },
    hero: {
      headline: "Freuly — додаткова точка видимості для вашої практики в Німеччині",
      sub:
        "Окрім соцмереж і знайомств — структурований профіль там, де люди шукають спеціалістів за мовою, містом і категорією. Ми не обіцяємо гарантований потік клієнтів, але допомагаємо вас знаходити саме тоді, коли людина вже обирає послугу.",
      cta: "Створити профіль спеціаліста",
    },
    socialLimits: {
      title: "Чому одних соцмереж і сарафану часто замало",
      intro:
        "Instagram, Telegram і рекомендації друзів залишаються важливими — але вони не закривають усі сценарії.",
      bullets: [
        "У соцмережах вас бачать підписники, а не кожен, хто саме зараз шукає послугу.",
        "Алгоритми й стрічка змінюються — охоплення стрибає, замовлення не завжди передбачувані.",
        "Сарафан не масштабується: довіра є, але нові запити рідко приходять рівномірно.",
        "Коли людина вже готова обрати спеціаліста, вона часто шукає структуровано: тема, мова, місто, формат.",
      ],
    },
    valueProps: {
      title: "Що дає профіль на Freuly",
      cards: [
        {
          title: "Публічна точка входу",
          body:
            "Ваш профіль можуть відкрити з пошуку або посилання — це зрозуміла сторінка про вас і ваші умови, а не розкидані пости.",
        },
        {
          title: "Знайомство за фактами пошуку",
          body:
            "Категорія, мови, місто, онлайн чи офлайн — люди фільтрують саме те, що для них важливо. Ви відповідаєте запиту «дуже зараз», а не лише підписникам.",
        },
        {
          title: "Додаткова видимість без заміни ваших каналів",
          body:
            "Freuly доповнює ваші соцмережі та особисті контакти: це ще одне місце, де вас можуть знайти, коли вже відбувається пошук послуги.",
        },
      ],
    },
    audience: {
      title: "Кому це особливо заходить",
      bullets: [
        "Спеціалістам у Німеччині, які працюють мовами клієнтів (не лише німецькою).",
        "Тим, хто хоче чітко показати місто, формат і тематику — без довгих переписок «ви взагалі про що?».",
        "Фрілансерам і малим практикам, яким важлива зрозуміла структура контакту з клієнтом.",
        "Тим, хто вже має стабільний сарафан, але хоче ще один спосіб бути знайденим.",
      ],
    },
    push: {
      title: "Не пропустіть новий запит",
      intro:
        "Після реєстрації можна ввімкнути push-сповіщення — ви швидше бачите нову заявку і обираєте, коли відповісти.",
      bullets: [
        "Один канал на нові звернення до вашого профілю.",
        "Менше ризику загубити звернення у загальному потоці повідомлень.",
        "Швидша відповідь — зручніше і вам, і людині, що написала.",
      ],
      cta: "Створити профіль спеціаліста",
      imageAlt: "Push-сповіщення про нову заявку у Freuly",
    },
    steps: {
      title: "Як це працює",
      items: [
        {
          number: "1",
          title: "Створіть профіль",
          description: "Ім'я, категорія, місто та мови — основа, за якою вас шукатимуть.",
        },
        {
          number: "2",
          title: "Опишіть послуги й формат",
          description: "Текст, фото, ціни або орієнтири — щоб клієнт розумів очікування до контакту.",
        },
        {
          number: "3",
          title: "Отримуйте заявки та відповідайте",
          description:
            "Люди надсилають запити; ви обираєте відповідь і умови. Ми не гарантуємо обсяг — ми допомагаємо вас знайти в момент пошуку.",
        },
      ],
    },
    faq: {
      title: "Питання та короткі відповіді",
      items: [
        {
          q: "Чи обіцяє Freuly конкретну кількість клієнтів?",
          a: "Ні. Ми надаємо профіль і пошук за параметрами, щоб вас було легше знайти тим, хто вже шукає послугу. Результат залежить і від ніші, і від вашого профілю, і від сезону.",
        },
        {
          q: "Якщо в мене вже є Instagram і Telegram, навіщо ще Freuly?",
          a: "Соцмережі — це контент і підписники; Freuly — структурований випадок «людина шукає зараз за мовою і містом». Це різні точки входу, їх добре поєднувати.",
        },
        {
          q: "Хто бачить мій профіль?",
          a: "Публічна сторінка доступна тим, хто користується каталогом або перейшов за посиланням — як додаткова точка видимості вашої практики.",
        },
        {
          q: "Що саме видно в пошуку?",
          a: "Категорія, мови, місто та формат роботи допомагають відсікти непідходящі звернення до першого повідомлення.",
        },
      ],
    },
    finalCta: {
      headline: "Готові додати профіль як ще одну точку видимості?",
      button: "Перейти до реєстрації спеціаліста",
    },
  },

  ru: {
    meta: {
      title: "Для специалистов — Freuly",
      description:
        "Публичный профиль в Freuly: категория, язык, город и формат работы — чтобы вас находили те, кто уже ищет услугу в Германии.",
    },
    hero: {
      headline: "Freuly — дополнительная точка видимости для вашей практики в Германии",
      sub:
        "Помимо соцсетей и сарафана — структурированный профиль там, где люди ищут специалистов по языку, городу и категории. Мы не обещаем гарантированный поток клиентов, но помогаем вам быть найденными именно тогда, когда человек уже выбирает услугу.",
      cta: "Создать профиль специалиста",
    },
    socialLimits: {
      title: "Почему одних соцсетей и сарафана часто мало",
      intro:
        "Instagram, Telegram и рекомендации друзей по-прежнему важны — но они не закрывают все сценарии.",
      bullets: [
        "В соцсетях вас видят подписчики, а не каждый, кто именно сейчас ищет услугу.",
        "Алгоритмы и лента меняются — охват скачет, заявки не всегда предсказуемы.",
        "Сарафан плохо масштабируется: доверие есть, но новые обращения редко приходят ровно.",
        "Когда человек готов выбрать специалиста, часто ищет структурированно: тема, язык, город, формат.",
      ],
    },
    valueProps: {
      title: "Что даёт профиль на Freuly",
      cards: [
        {
          title: "Публичная точка входа",
          body:
            "Ваш профиль можно открыть из поиска или по ссылке — это понятная страница о вас и условиях, а не разрозненные посты.",
        },
        {
          title: "Сопоставление с запросом",
          body:
            "Категория, языки, город, онлайн или офлайн — люди отфильтровывают то, что им важно. Вы попадаете в запрос «прямо сейчас», а не только в ленту подписчикам.",
        },
        {
          title: "Дополнительная видимость вместо замены ваших каналов",
          body:
            "Freuly дополняет соцсети и личные контакты: это ещё одно место, где вас могут найти, когда уже идёт поиск услуги.",
        },
      ],
    },
    audience: {
      title: "Кому это особенно подходит",
      bullets: [
        "Специалистам в Германии, которые работают на языках клиентов (не только на немецком).",
        "Тем, кто хочет явно показать город, формат и тематику — без длинных уточнений «вы вообще про что?».",
        "Фрилансерам и небольшим практикам, которым важна понятная структура первого контакта.",
        "Тем, у кого уже стабильный сарафан, но нужна ещё одна возможность быть найденным.",
      ],
    },
    push: {
      title: "Не пропустите новую заявку",
      intro:
        "После регистрации можно включить push-уведомления — вы быстрее видите новую заявку и сами решаете, когда ответить.",
      bullets: [
        "Отдельный сигнал по новым обращениям к вашему профилю.",
        "Меньше риска потерять заявку в общем потоке сообщений.",
        "Быстрее ответ — удобнее и вам, и человеку, который написал.",
      ],
      cta: "Создать профиль специалиста",
      imageAlt: "Push-уведомление о новой заявке в Freuly",
    },
    steps: {
      title: "Как это работает",
      items: [
        {
          number: "1",
          title: "Создайте профиль",
          description: "Имя, категория, город и языки — основа, по которой вас будут искать.",
        },
        {
          number: "2",
          title: "Опишите услуги и формат",
          description: "Текст, фото, цены или ориентиры — чтобы клиент понимал ожидания до контакта.",
        },
        {
          number: "3",
          title: "Получайте заявки и отвечайте",
          description:
            "Люди отправляют запросы; вы выбираете ответ и условия. Мы не гарантируем объём — мы помогаем вам быть заметнее в момент поиска.",
        },
      ],
    },
    faq: {
      title: "Вопросы и короткие ответы",
      items: [
        {
          q: "Обещает ли Freuly конкретное число клиентов?",
          a: "Нет. Мы даём профиль и поиск по параметрам, чтобы вас было проще найти тем, кто уже ищет услугу. Результат зависит от ниши, заполнения профиля и сезона.",
        },
        {
          q: "Если у меня уже есть Instagram и Telegram, зачем ещё Freuly?",
          a: "Соцсети — про контент и подписчиков; Freuly — про случай «человек ищет сейчас по языку и городу». Это разные точки входа, их логично сочетать.",
        },
        {
          q: "Кто видит мой профиль?",
          a: "Публичная страница доступна тем, кто пользуется каталогом или перешёл по ссылке — как дополнительная видимость вашей практики.",
        },
        {
          q: "Что видно в поиске?",
          a: "Категория, языки, город и формат работы помогают отсеять нерелевантные обращения до первого сообщения.",
        },
      ],
    },
    finalCta: {
      headline: "Готовы добавить профиль как ещё одну точку видимости?",
      button: "Перейти к регистрации специалиста",
    },
  },

  de: {
    meta: {
      title: "Für Fachkräfte — Freuly",
      description:
        "Ein öffentliches Freuly-Profil: Kategorie, Sprache, Stadt und Arbeitsformat — damit Sie von Menschen gefunden werden, die gerade eine Dienstleistung in Deutschland suchen.",
    },
    hero: {
      headline: "Freuly — eine zusätzliche Sichtbarkeit für Ihre Arbeit in Deutschland",
      sub:
        "Ergänzend zu Social Media und Mund-zu-Mund-Propaganda: ein strukturiertes Profil dort, wo Menschen Fachkräfte nach Sprache, Stadt und Kategorie suchen. Wir versprechen keinen garantierten Kundenstrom, aber wir helfen Ihnen, in genau dem Moment auffindbar zu sein, wenn jemand aktiv eine Dienstleistung sucht.",
      cta: "Profil als Fachkraft anlegen",
    },
    socialLimits: {
      title: "Warum allein Soziale Netzwerke und Empfehlungen oft nicht reichen",
      intro:
        "Instagram, Telegram und persönliche Empfehlungen bleiben wichtig — decken aber nicht jeden Fall ab.",
      bullets: [
        "In Sozialen Netzwerken sehen vor allem Follower Sie — nicht jeder, der gerade konkret eine Dienstleistung sucht.",
        "Algorithmen und Feeds ändern sich — Reichweite schwankt, Anfragen sind nicht immer planbar.",
        "Empfehlungen skalieren schlecht: Vertrauen da, aber neue Kontakte kommen selten gleichmäßig.",
        "Wer bereit ist, eine Fachkraft zu wählen, sucht oft strukturiert: Thema, Sprache, Stadt, Format.",
      ],
    },
    valueProps: {
      title: "Was ein Profil auf Freuly bringt",
      cards: [
        {
          title: "Ein öffentlicher Einstieg",
          body:
            "Ihr Profil lässt sich aus der Suche oder per Link öffnen — eine klare Seite über Sie und Ihre Rahmenbedingungen, nicht nur verstreute Posts.",
        },
        {
          title: "Passung zur aktuellen Suche",
          body:
            "Kategorie, Sprachen, Stadt, online oder vor Ort — Nutzer filtern, was sie brauchen. Sie treffen den Moment „jetzt wird gesucht“, nicht nur die Follower im Feed.",
        },
        {
          title: "Zusätzliche Sichtbarkeit statt Ersatz Ihrer Kanäle",
          body:
            "Freuly ergänzt Social Media und persönliche Kontakte: ein weiterer Ort, an dem Sie gefunden werden können, wenn die Suche bereits läuft.",
        },
      ],
    },
    audience: {
      title: "Für wen sich das besonders lohnt",
      bullets: [
        "Fachkräfte in Deutschland, die in den Sprachen ihrer Klientel arbeiten (nicht nur Deutsch).",
        "Wer Stadt, Format und Thema klar zeigen will — ohne langes Hin- und Her vor dem ersten Kontakt.",
        "Selbstständige und kleine Praxen, denen eine nachvollziehbare Erstkontakt-Struktur wichtig ist.",
        "Wer bereits Stammempfehlungen hat, aber eine weitere Möglichkeit sucht, gefunden zu werden.",
      ],
    },
    push: {
      title: "Keine neue Anfrage verpassen",
      intro:
        "Nach der Registrierung können Sie Push-Benachricht aktivieren — Sie sehen neue Anfragen schneller und entscheiden selbst, wann Sie antworten.",
      bullets: [
        "Ein Signal für neue Kontakte zu Ihrem Profil.",
        "Weniger Risiko, eine Anfrage im allgemeinen Nachrichtenstrom zu übersehen.",
        "Schnellere Antwort — gut für Sie und für die Person, die geschrieben hat.",
      ],
      cta: "Profil als Fachkraft anlegen",
      imageAlt: "Push-Benachrichtigung über eine neue Anfrage bei Freuly",
    },
    steps: {
      title: "So funktioniert es",
      items: [
        {
          number: "1",
          title: "Profil anlegen",
          description: "Name, Kategorie, Stadt und Sprachen — die Basis, nach der Sie gefunden werden.",
        },
        {
          number: "2",
          title: "Leistungen und Format beschreiben",
          description: "Text, Fotos, Preise oder Orientierung — damit vor dem Kontakt klar ist, was zu erwarten ist.",
        },
        {
          number: "3",
          title: "Anfragen erhalten und antworten",
          description:
            "Menschen senden Anfragen; Sie entscheiden über Antwort und Konditionen. Wir garantieren kein Volumen — wir helfen Ihnen, im Suchmoment sichtbarer zu sein.",
        },
      ],
    },
    faq: {
      title: "Fragen und kurze Antworten",
      items: [
        {
          q: "Verspricht Freuly eine konkrete Kundenzahl?",
          a: "Nein. Wir stellen Profil und Suche nach Parametern bereit, damit Sie für Menschen auffindbarer sind, die aktiv suchen. Das Ergebnis hängt von Nische, Profil und Saison ab.",
        },
        {
          q: "Ich habe schon Instagram und Telegram — wozu Freuly?",
          a: "Soziale Netzwerke leben von Content und Followern; Freuly adressiert den Fall „jetzt wird strukturiert nach Sprache und Ort gesucht“. Das sind verschiedene Einstiege — sinnvoll kombiniert.",
        },
        {
          q: "Wer sieht mein Profil?",
          a: "Die öffentliche Seite ist für Nutzer des Katalogs und über Links erreichbar — als zusätzliche Sichtbarkeit Ihrer Arbeit.",
        },
        {
          q: "Was ist in der Suche sichtbar?",
          a: "Kategorie, Sprachen, Stadt und Arbeitsformat helfen, unpassende Kontakte vor der ersten Nachricht zu verringern.",
        },
      ],
    },
    finalCta: {
      headline: "Profil als weitere Sichtbarkeit hinzufügen?",
      button: "Zur Registrierung für Fachkräfte",
    },
  },
};
