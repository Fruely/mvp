import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO service page: Autokauf & Beratung (child of Auto & Mobilitaet). */
export const autokaufBeratungContent: LocalizedSeoCategory = {
  slug: "autokauf-beratung",
  parentSlug: "auto-mobilitaet",
  categoryType: "child",
  filterOr:
    "category.ilike.%autokauf%,category.ilike.%beratung%,category.ilike.%подбор авто%,category.ilike.%підбір авто%",
  content: {
    de: {
      slug: "autokauf-beratung",
      parentSlug: "auto-mobilitaet",
      locale: "de",
      categoryType: "child",
      metaTitle:
        "Autokauf & Beratung in Deutschland — Fahrzeugprüfung vor dem Kauf",
      metaDescription:
        "Hilfe beim Autokauf in Deutschland: Fahrzeugauswahl, Prüfung vor dem Kauf, technische Einschätzung, Beratung und Begleitung beim Gebrauchtwagenkauf.",
      h1: "Autokauf & Beratung in Deutschland",
      breadcrumbsLabel: "Autokauf & Beratung",
      homeLabel: "Startseite",
      parentLabel: "Auto & Mobilität",
      intro:
        "Ein Auto in Deutschland zu kaufen kann kompliziert sein, besonders wenn man den Markt, die Dokumente, technische Details und typische Risiken beim Gebrauchtwagenkauf nicht gut kennt.",
      sections: [
        {
          heading: "Warum eine Prüfung vor dem Kauf wichtig ist",
          body:
            "Ein Fahrzeug kann in der Anzeige gut aussehen, aber versteckte Mängel haben: Unfallspuren, Probleme mit Motor, Getriebe, Fahrwerk, Elektronik oder unklare Fahrzeughistorie. Ein falscher Kauf kann später sehr teuer werden.",
        },
        {
          heading: "Was ein Spezialist leisten kann",
          body:
            "Ein Spezialist kann bei der Auswahl geeigneter Fahrzeuge helfen, Anzeigen einschätzen, den Verkäufer prüfen, das Auto besichtigen, typische Schwachstellen des Modells erklären und eine technische Einschätzung geben.",
        },
        {
          heading: "Welche Risiken Beratung reduziert",
          body:
            "Reparaturen an Motor, Getriebe, Fahrwerk oder Elektronik können deutlich teurer sein als die Ersparnis beim Kauf. Eine fachliche Beratung vor der Entscheidung kann helfen, Risiken zu erkennen und unnötige Kosten zu vermeiden.",
        },
        {
          heading: "Welche Leistungen dazugehören",
          body:
            "Auf Freuly finden Nutzer Spezialisten für Fahrzeugauswahl, Gebrauchtwagenprüfung, technische Bewertung, Preisberatung, Ausstattung, Laufleistung, TÜV, Servicehistorie und allgemeinen Zustand des Autos.",
        },
        {
          heading: "Warum das besonders hilfreich sein kann",
          body:
            "Für russisch- und ukrainischsprachige Menschen in Deutschland ist diese Unterstützung besonders hilfreich. Ein Fachmann kann nicht nur das Fahrzeug prüfen, sondern auch verständlich erklären, welche Risiken bestehen, welche Fragen man dem Verkäufer stellen sollte und wann es besser ist, auf den Kauf zu verzichten.",
        },
      ],
      specialistsTitle: "Spezialist:innen für Autokauf-Beratung",
      specialistsEmpty:
        "Sobald passende sichtbare Profile vorhanden sind, erscheinen sie hier.",
      relatedTitle: "Weitere Auto-Themen",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Auto & Mobilität" },
        { href: "autowerkstatt-reparatur", label: "Autowerkstatt & Reparatur" },
        { href: "autoelektrik", label: "Autoelektrik" },
      ],
      cta: {
        heading: "Fahrzeug vor dem Kauf prüfen lassen",
        body: "Senden Sie Inserat, Modell, Budget und Fragen zur Historie an passende Spezialisten.",
        buttonLabel: "Kategorie öffnen",
        ctaHref: "/de/specialists/autokauf-beratung",
      },
      seoText:
        "Autokauf Beratung Deutschland, Auto prüfen vor Kauf, Gebrauchtwagen prüfen, Fahrzeugbewertung, Autokauf Hilfe, russischsprachige Autoberatung, ukrainischsprachige Autoberatung.",
    },
    ru: {
      slug: "autokauf-beratung",
      parentSlug: "auto-mobilitaet",
      locale: "ru",
      categoryType: "child",
      metaTitle:
        "Покупка и подбор авто в Германии — проверка машины перед покупкой",
      metaDescription:
        "Помощь с покупкой и подбором автомобиля в Германии: проверка машины перед сделкой, техническая диагностика, консультация и сопровождение покупки.",
      h1: "Покупка и подбор авто в Германии",
      breadcrumbsLabel: "Покупка и подбор авто",
      homeLabel: "Главная",
      parentLabel: "Авто и мобильность",
      intro:
        "Покупка автомобиля в Германии может быть сложной задачей, особенно если человек плохо знает рынок, немецкие документы, технические нюансы и типичные риски при покупке подержанной машины.",
      sections: [
        {
          heading: "Почему нужна проверка перед покупкой",
          body:
            "В объявлении автомобиль может выглядеть хорошо, но на практике у него могут быть скрытые дефекты, следы аварии, проблемы с двигателем, коробкой передач, ходовой частью, электроникой или документами. Даже небольшая ошибка может стоить дорого после покупки.",
        },
        {
          heading: "Что может сделать специалист",
          body:
            "Специалист может помочь выбрать подходящие варианты, оценить объявление, проверить продавца, осмотреть автомобиль, обратить внимание на слабые места конкретной модели, провести базовую диагностику и объяснить, стоит ли машина своих денег.",
        },
        {
          heading: "Какие риски помогает снизить консультация",
          body:
            "Ремонт двигателя, коробки, подвески или электроники может оказаться намного дороже, чем экономия при покупке. Поэтому консультация специалиста перед сделкой часто помогает избежать неудачной покупки и лишних расходов.",
        },
        {
          heading: "Какие услуги входят в категорию",
          body:
            "На Freuly можно найти специалистов, которые помогают с подбором автомобиля, проверкой машины перед покупкой, технической оценкой, консультацией по цене, комплектации, пробегу, TÜV, сервисной истории и общему состоянию авто.",
        },
        {
          heading: "Почему это особенно полезно в Германии",
          body:
            "Для русскоязычных и украиноязычных жителей Германии такая помощь особенно полезна. Специалист может не только посмотреть машину, но и объяснить понятным языком, где есть риск, какие вопросы задать продавцу, какие документы проверить и когда лучше отказаться от покупки.",
        },
      ],
      specialistsTitle: "Специалисты по подбору авто",
      specialistsEmpty: "Когда появятся подходящие видимые профили, они будут здесь.",
      relatedTitle: "Другие авторазделы",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Авто и мобильность" },
        { href: "autowerkstatt-reparatur", label: "Автосервис и ремонт" },
        { href: "autoelektrik", label: "Автоэлектрик" },
      ],
      cta: {
        heading: "Проверить автомобиль перед покупкой",
        body: "Отправьте ссылку на объявление, модель, бюджет и вопросы к истории машины.",
        buttonLabel: "Открыть категорию",
        ctaHref: "/ru/specialists/autokauf-beratung",
      },
      seoText:
        "подбор авто Германия, покупка авто Германия, проверка авто перед покупкой, помощь с покупкой машины, диагностика перед покупкой, купить авто в Германии, автоконсультант Германия.",
    },
    ua: {
      slug: "autokauf-beratung",
      parentSlug: "auto-mobilitaet",
      locale: "ua",
      categoryType: "child",
      metaTitle:
        "Купівля та підбір авто в Німеччині — перевірка машини перед покупкою",
      metaDescription:
        "Допомога з купівлею та підбором автомобіля в Німеччині: перевірка авто перед угодою, технічна оцінка, консультація та супровід покупки.",
      h1: "Купівля та підбір авто в Німеччині",
      breadcrumbsLabel: "Купівля та підбір авто",
      homeLabel: "Головна",
      parentLabel: "Авто і мобільність",
      intro:
        "Купівля автомобіля в Німеччині може бути складною, особливо якщо людина недостатньо добре знає ринок, документи, технічні нюанси та типові ризики під час купівлі вживаного авто.",
      sections: [
        {
          heading: "Чому потрібна перевірка перед покупкою",
          body:
            "В оголошенні машина може виглядати добре, але насправді мати приховані дефекти, сліди аварії, проблеми з двигуном, коробкою передач, ходовою частиною, електронікою або історією обслуговування. Навіть невдала дрібниця може дорого коштувати після покупки.",
        },
        {
          heading: "Що може зробити спеціаліст",
          body:
            "Спеціаліст може допомогти підібрати варіанти, оцінити оголошення, перевірити продавця, оглянути автомобіль, звернути увагу на слабкі місця конкретної моделі та пояснити, чи відповідає машина своїй ціні.",
        },
        {
          heading: "Які ризики допомагає зменшити консультація",
          body:
            "Ремонт двигуна, коробки передач, підвіски або електроніки може виявитися значно дорожчим, ніж зекономлені під час купівлі гроші. Тому консультація спеціаліста перед угодою часто допомагає уникнути проблем.",
        },
        {
          heading: "Які послуги входять у категорію",
          body:
            "На Freuly можна знайти фахівців, які допомагають з підбором автомобіля, перевіркою машини перед купівлею, технічною оцінкою, консультацією щодо ціни, комплектації, пробігу, TÜV, сервісної історії та загального стану авто.",
        },
        {
          heading: "Чому це особливо корисно в Німеччині",
          body:
            "Для українців і російськомовних жителів Німеччини така допомога особливо корисна. Спеціаліст може не лише оглянути автомобіль, а й пояснити зрозумілою мовою, де є ризик, які питання поставити продавцю, які документи перевірити і коли краще відмовитися від покупки.",
        },
      ],
      specialistsTitle: "Спеціалісти з підбору авто",
      specialistsEmpty: "Коли з’являться відповідні видимі профілі, вони будуть тут.",
      relatedTitle: "Інші авто розділи",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Авто і мобільність" },
        { href: "autowerkstatt-reparatur", label: "Автосервіс і ремонт" },
        { href: "autoelektrik", label: "Автоелектрик" },
      ],
      cta: {
        heading: "Перевірити автомобіль перед купівлею",
        body: "Надішліть посилання на оголошення, модель, бюджет і питання до історії машини.",
        buttonLabel: "Відкрити категорію",
        ctaHref: "/ua/specialists/autokauf-beratung",
      },
      seoText:
        "підбір авто Німеччина, купівля авто Німеччина, перевірка авто перед покупкою, допомога з купівлею машини, діагностика перед покупкою, автоконсультант Німеччина.",
    },
  },
};
