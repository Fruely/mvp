import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO service page: Autowerkstatt & Reparatur (child of Auto & Mobilitaet). */
export const autowerkstattReparaturContent: LocalizedSeoCategory = {
  slug: "autowerkstatt-reparatur",
  parentSlug: "auto-mobilitaet",
  categoryType: "child",
  filterOr:
    "category.ilike.%autowerkstatt%,category.ilike.%reparatur%,category.ilike.%автосервис%,category.ilike.%автосервіс%",
  content: {
    de: {
      slug: "autowerkstatt-reparatur",
      parentSlug: "auto-mobilitaet",
      locale: "de",
      categoryType: "child",
      metaTitle:
        "Autowerkstatt & Reparatur in Deutschland — Diagnose, Wartung und Kfz-Service",
      metaDescription:
        "Finden Sie Autowerkstätten und Kfz-Mechaniker in Deutschland: Diagnose, Reparatur, Wartung, Bremsen, Fahrwerk, Motor und TÜV-Vorbereitung.",
      h1: "Autowerkstatt & Reparatur in Deutschland",
      breadcrumbsLabel: "Autowerkstatt & Reparatur",
      homeLabel: "Startseite",
      parentLabel: "Auto & Mobilität",
      intro:
        "Autowerkstatt und Fahrzeugreparatur gehören zu den wichtigsten Dienstleistungen für Autobesitzer in Deutschland. Auch wenn ein Auto auf den ersten Blick normal funktioniert, können Probleme am Fahrwerk, an den Bremsen, am Motor, am Getriebe, an der Lenkung oder an der Elektronik entstehen.",
      sections: [
        {
          heading: "Warum eine Diagnose wichtig ist",
          body:
            "Eine rechtzeitige Diagnose hilft, größere Schäden und unnötige Kosten zu vermeiden. Geräusche beim Fahren, Vibrationen, Startprobleme, Warnleuchten, unruhiger Motorlauf, erhöhter Verbrauch oder Fragen nach der TÜV-Prüfung sind typische Gründe, das Fahrzeug prüfen zu lassen.",
        },
        {
          heading: "Wenn Sprache eine Rolle spielt",
          body:
            "Wichtig ist ein Fachmann, dem man die Symptome genau beschreiben kann. Für viele Menschen ist es deutlich einfacher, technische Themen auf Russisch oder Ukrainisch zu besprechen und danach eine klare Entscheidung über die Reparatur zu treffen.",
        },
        {
          heading: "Welche Leistungen dazugehören",
          body:
            "In der Kategorie „Autowerkstatt & Reparatur“ auf Freuly können Nutzer Autowerkstätten, Kfz-Mechaniker und Spezialisten für Wartung und Reparatur finden. Dazu gehören Diagnose, Austausch von Teilen, Reparatur von Bremsen und Fahrwerk, Motorservice, Vorbereitung auf den TÜV und allgemeine technische Einschätzung des Fahrzeugs.",
        },
        {
          heading: "Eine gute Werkstatt erklärt verständlich",
          body:
            "Diese Kategorie eignet sich sowohl für regelmäßige Wartung als auch für Situationen, in denen ein Auto ungewöhnliche Symptome zeigt. Eine gute Werkstatt repariert nicht nur, sondern erklärt verständlich, was dringend ist, was warten kann und welche Reparaturen wirtschaftlich sinnvoll sind.",
        },
      ],
      specialistsTitle: "Autowerkstätten und Kfz-Mechaniker",
      specialistsEmpty:
        "Sobald passende sichtbare Profile vorhanden sind, erscheinen sie hier.",
      relatedTitle: "Weitere Auto-Themen",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Auto & Mobilität" },
        { href: "autoelektrik", label: "Autoelektrik" },
        { href: "autokauf-beratung", label: "Autokauf & Beratung" },
      ],
      cta: {
        heading: "Autowerkstatt anfragen",
        body: "Beschreiben Sie Symptome, Modell, Baujahr und was bereits geprüft wurde.",
        buttonLabel: "Kategorie öffnen",
        ctaHref: "/de/category/autowerkstatt-reparatur",
      },
      seoText:
        "Autowerkstatt Deutschland, Kfz Reparatur, Automechaniker, Fahrzeugdiagnose, Bremsen Reparatur, Fahrwerk Reparatur, TÜV Vorbereitung, russischsprachige Werkstatt.",
    },
    ru: {
      slug: "autowerkstatt-reparatur",
      parentSlug: "auto-mobilitaet",
      locale: "ru",
      categoryType: "child",
      metaTitle:
        "Автосервис и ремонт авто в Германии — автомеханики, диагностика и обслуживание",
      metaDescription:
        "Найдите автосервис или автомеханика в Германии: диагностика, ремонт, обслуживание, ходовая часть, тормоза, двигатель, подготовка к TÜV.",
      h1: "Автосервис и ремонт авто в Германии",
      breadcrumbsLabel: "Автосервис и ремонт",
      homeLabel: "Главная",
      parentLabel: "Авто и мобильность",
      intro:
        "Автосервис и ремонт автомобиля — одна из самых востребованных услуг для владельцев машин в Германии. Даже если автомобиль внешне выглядит исправным, внутри могут быть проблемы с ходовой частью, тормозной системой, двигателем, коробкой передач, подвеской, рулевым управлением или электроникой.",
      sections: [
        {
          heading: "Почему важна диагностика",
          body:
            "Чем раньше провести диагностику, тем меньше риск дорогого ремонта в будущем. Стук при движении, вибрация на скорости, проблемы с запуском, посторонний шум, ошибки на панели, неравномерная работа двигателя или повышенный расход топлива — всё это поводы не откладывать проверку автомобиля.",
        },
        {
          heading: "Когда важен язык общения",
          body:
            "Особенно важно найти автомеханика, которому можно понятно объяснить симптомы. Когда специалист говорит на русском или украинском языке, проще описать проблему, понять причину поломки и принять решение о ремонте без лишнего стресса.",
        },
        {
          heading: "Какие услуги входят в категорию",
          body:
            "В категории «Автосервис и ремонт» на Freuly могут размещаться автомеханики, автосервисы и специалисты по техническому обслуживанию автомобилей. Они могут помогать с диагностикой, заменой деталей, ремонтом ходовой части, тормозов, двигателя, обслуживанием перед дальней поездкой, подготовкой к TÜV и оценкой общего состояния машины.",
        },
        {
          heading: "Хороший автосервис — это не только ремонт",
          body:
            "Эта категория подходит как для планового обслуживания, так и для ситуаций, когда машина начала вести себя странно и нужно быстро понять, насколько проблема серьёзная. Хороший автосервис — это не только ремонт, но и честное объяснение: что нужно делать срочно, что можно отложить, а какие работы вообще не имеют смысла.",
        },
      ],
      specialistsTitle: "Автосервисы и автомеханики",
      specialistsEmpty: "Когда появятся подходящие видимые профили, они будут здесь.",
      relatedTitle: "Другие авторазделы",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Авто и мобильность" },
        { href: "autoelektrik", label: "Автоэлектрик" },
        { href: "autokauf-beratung", label: "Покупка и подбор авто" },
      ],
      cta: {
        heading: "Отправить заявку в автосервис",
        body: "Опишите симптомы, модель, год выпуска и что уже проверяли.",
        buttonLabel: "Открыть категорию",
        ctaHref: "/ru/category/autowerkstatt-reparatur",
      },
      seoText:
        "автосервис Германия, ремонт авто Германия, автомеханик Германия, диагностика авто, ремонт ходовой, ремонт тормозов, подготовка к TÜV, русскоязычный автосервис.",
    },
    ua: {
      slug: "autowerkstatt-reparatur",
      parentSlug: "auto-mobilitaet",
      locale: "ua",
      categoryType: "child",
      metaTitle:
        "Автосервіс і ремонт авто в Німеччині — автомеханіки, діагностика та обслуговування",
      metaDescription:
        "Знайдіть автосервіс або автомеханіка в Німеччині: діагностика, ремонт, обслуговування, ходова частина, гальма, двигун і підготовка до TÜV.",
      h1: "Автосервіс і ремонт авто в Німеччині",
      breadcrumbsLabel: "Автосервіс і ремонт",
      homeLabel: "Головна",
      parentLabel: "Авто і мобільність",
      intro:
        "Автосервіс і ремонт автомобіля — одна з найважливіших послуг для власників машин у Німеччині. Навіть якщо авто зовні виглядає справним, можуть виникати проблеми з ходовою частиною, гальмами, двигуном, коробкою передач, підвіскою, кермом або електронікою.",
      sections: [
        {
          heading: "Чому важлива діагностика",
          body:
            "Вчасна діагностика допомагає уникнути серйозніших поломок і зайвих витрат. Стукіт під час руху, вібрація, проблеми із запуском, сторонні звуки, помилки на панелі, нестабільна робота двигуна або підвищена витрата пального — це причини не відкладати перевірку автомобіля.",
        },
        {
          heading: "Коли важлива мова спілкування",
          body:
            "Особливо важливо знайти автомеханіка, якому можна зрозуміло пояснити симптоми. Коли спеціаліст говорить українською або російською мовою, простіше описати проблему, зрозуміти причину поломки і прийняти рішення щодо ремонту.",
        },
        {
          heading: "Які послуги входять у категорію",
          body:
            "У категорії «Автосервіс і ремонт» на Freuly можна знайти автомеханіків, автосервіси та спеціалістів з технічного обслуговування автомобілів. Вони можуть допомогти з діагностикою, заміною деталей, ремонтом ходової частини, гальм, двигуна, підготовкою до TÜV та оцінкою загального стану авто.",
        },
        {
          heading: "Хороший автосервіс — це не лише ремонт",
          body:
            "Ця категорія підходить як для планового обслуговування, так і для ситуацій, коли автомобіль почав поводитися незвично. Хороший автосервіс — це не лише ремонт, а й чесне пояснення: що потрібно зробити терміново, що можна відкласти, а які роботи можуть бути економічно недоцільними.",
        },
      ],
      specialistsTitle: "Автосервіси та автомеханіки",
      specialistsEmpty: "Коли з’являться відповідні видимі профілі, вони будуть тут.",
      relatedTitle: "Інші авто розділи",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Авто і мобільність" },
        { href: "autoelektrik", label: "Автоелектрик" },
        { href: "autokauf-beratung", label: "Купівля та підбір авто" },
      ],
      cta: {
        heading: "Надіслати запит в автосервіс",
        body: "Опишіть симптоми, модель, рік випуску і що вже перевіряли.",
        buttonLabel: "Відкрити категорію",
        ctaHref: "/ua/category/autowerkstatt-reparatur",
      },
      seoText:
        "автосервіс Німеччина, ремонт авто Німеччина, автомеханік Німеччина, діагностика авто, ремонт ходової, ремонт гальм, підготовка до TÜV.",
    },
  },
};
