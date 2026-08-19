import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO service page: Autoelektrik (child of Auto & Mobilitaet). */
export const autoelektrikContent: LocalizedSeoCategory = {
  slug: "autoelektrik",
  parentSlug: "auto-mobilitaet",
  categoryType: "child",
  filterOr:
    "category.ilike.%autoelektr%,category.ilike.%elektrik%,category.ilike.%автоэлект%,category.ilike.%автоелект%",
  content: {
    de: {
      slug: "autoelektrik",
      parentSlug: "auto-mobilitaet",
      locale: "de",
      categoryType: "child",
      metaTitle:
        "Autoelektrik in Deutschland — Diagnose, Startprobleme und mobile Hilfe",
      metaDescription:
        "Finden Sie Spezialisten für Autoelektrik in Deutschland: Startprobleme, Batterie, Starter, Lichtmaschine, Fehlersuche, Warnleuchten und mobile Hilfe.",
      h1: "Autoelektrik in Deutschland",
      breadcrumbsLabel: "Autoelektrik",
      homeLabel: "Startseite",
      parentLabel: "Auto & Mobilität",
      intro:
        "Autoelektrik ist ein eigenständiger und wichtiger Bereich der Fahrzeugtechnik. Moderne Autos hängen stark von elektronischen Systemen ab: Batterie, Starter, Lichtmaschine, Sensoren, Steuergeräte, Zündung, Beleuchtung, Alarmanlage und Sicherheitssysteme.",
      sections: [
        {
          heading: "Warum Autoelektrik ein eigener Bereich ist",
          body:
            "Ein Problem kann einfach aussehen: Das Auto startet nicht, eine Warnleuchte leuchtet oder ein System funktioniert nicht. Die Ursache kann aber komplex sein: Batterie, Starter, Lichtmaschine, Verkabelung, Sicherungen, Sensoren oder elektronische Steuergeräte.",
        },
        {
          heading: "Wann mobile Hilfe wichtig ist",
          body:
            "Der Vorteil eines Autoelektrikers ist, dass viele Probleme nicht nur in der Werkstatt, sondern auch vor Ort geprüft werden können: auf dem Parkplatz, vor dem Haus, bei der Arbeit oder dort, wo das Auto stehen geblieben ist. Das ist besonders wichtig, wenn das Fahrzeug nicht startet und man es nicht sofort abschleppen lassen möchte.",
        },
        {
          heading: "Typische Probleme",
          body:
            "In der Kategorie „Autoelektrik“ auf Freuly finden Nutzer Spezialisten für Startprobleme, Fehlersuche, Batterie, Starter, Lichtmaschine, Sicherungen, Verkabelung, Beleuchtung, Sensoren, Alarmanlagen und elektronische Fahrzeugstörungen.",
        },
        {
          heading: "Warum Sprache wichtig sein kann",
          body:
            "Für russisch- und ukrainischsprachige Fahrzeughalter ist es oft hilfreich, technische Probleme in der eigenen Sprache erklären zu können: Das Auto stand mehrere Tage und startet nicht mehr, nach dem Batteriewechsel erscheinen Fehlermeldungen, das Licht funktioniert nicht oder die Elektronik fällt sporadisch aus.",
        },
        {
          heading: "Was eine erste Diagnose bringt",
          body:
            "Autoelektrik bedeutet nicht nur Reparatur von Kabeln. Es geht darum, schnell und fachlich einzuschätzen, wo die Ursache liegt und welcher nächste Schritt sinnvoll ist.",
        },
      ],
      specialistsTitle: "Spezialist:innen für Autoelektrik",
      specialistsEmpty:
        "Sobald passende sichtbare Profile vorhanden sind, erscheinen sie hier.",
      relatedTitle: "Weitere Auto-Themen",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Auto & Mobilität" },
        { href: "autowerkstatt-reparatur", label: "Autowerkstatt & Reparatur" },
        { href: "autokauf-beratung", label: "Autokauf & Beratung" },
      ],
      cta: {
        heading: "Autoelektrik-Problem beschreiben",
        body: "Notieren Sie Fehlermeldungen, Batteriewechsel, Startverhalten und ob das Fahrzeug fahrbereit ist.",
        buttonLabel: "Kategorie öffnen",
        ctaHref: "/de/specialists/autoelektrik",
      },
      seoText:
        "Autoelektrik Deutschland, mobiler Autoelektriker, Auto startet nicht, Batterie Auto, Starter, Lichtmaschine, Fehlerdiagnose Auto, russischsprachiger Autoelektriker.",
    },
    ru: {
      slug: "autoelektrik",
      parentSlug: "auto-mobilitaet",
      locale: "ru",
      categoryType: "child",
      metaTitle:
        "Автоэлектрик в Германии — диагностика, запуск авто и выездная помощь",
      metaDescription:
        "Найдите автоэлектрика в Германии: диагностика электроники, проблемы с запуском, аккумулятор, стартер, генератор, ошибки на панели и мобильная помощь.",
      h1: "Автоэлектрик в Германии",
      breadcrumbsLabel: "Автоэлектрик",
      homeLabel: "Главная",
      parentLabel: "Авто и мобильность",
      intro:
        "Автоэлектрик — это отдельная и очень важная категория автомобильных услуг. Современный автомобиль всё больше зависит от электроники: аккумулятора, стартера, генератора, датчиков, блоков управления, сигнализации, системы зажигания, освещения и электронных систем безопасности.",
      sections: [
        {
          heading: "Почему автоэлектрик — отдельная услуга",
          body:
            "Проблема может выглядеть просто: машина не заводится, горит ошибка или не работает часть оборудования. Но причина может быть сложной: аккумулятор, стартер, генератор, проводка, предохранители, датчики или электронные блоки управления.",
        },
        {
          heading: "Когда важна выездная помощь",
          body:
            "Особенность автоэлектрика в том, что многие задачи можно решить не только в автосервисе, но и на месте: во дворе, на парковке, возле дома, у работы или там, где машина остановилась. Это особенно важно, если автомобиль не заводится и его не хочется сразу везти на эвакуаторе в мастерскую.",
        },
        {
          heading: "С какими проблемами обращаются",
          body:
            "В категории «Автоэлектрик» на Freuly можно найти специалистов, которые помогают с проблемами запуска, ошибками на панели приборов, электропроводкой, аккумулятором, светом, датчиками, сигнализацией и другими электронными системами автомобиля.",
        },
        {
          heading: "Почему удобно говорить на своём языке",
          body:
            "Особенно удобно, когда автоэлектрик говорит на русском или украинском языке. Так проще объяснить, что именно произошло: машина стояла несколько дней и перестала заводиться, после замены аккумулятора появились ошибки, не работает свет, периодически пропадает питание или автомобиль ведёт себя нестабильно.",
        },
        {
          heading: "Что даёт первичная диагностика",
          body:
            "Автоэлектрик — это не просто ремонт электрики. Это специалист, который помогает быстро понять, можно ли решить проблему на месте, нужно ли ехать в автосервис или требуется более глубокая диагностика.",
        },
      ],
      specialistsTitle: "Автоэлектрики",
      specialistsEmpty: "Когда появятся подходящие видимые профили, они будут здесь.",
      relatedTitle: "Другие авторазделы",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Авто и мобильность" },
        { href: "autowerkstatt-reparatur", label: "Автосервис и ремонт" },
        { href: "autokauf-beratung", label: "Покупка и подбор авто" },
      ],
      cta: {
        heading: "Опишите проблему автоэлектрику",
        body: "Укажите ошибки, поведение при запуске, аккумулятор и готовность машины к поездке.",
        buttonLabel: "Открыть категорию",
        ctaHref: "/ru/specialists/autoelektrik",
      },
      seoText:
        "автоэлектрик Германия, выездной автоэлектрик, машина не заводится, диагностика автоэлектрики, аккумулятор авто, стартер, генератор, ошибки авто, русскоязычный автоэлектрик.",
    },
    ua: {
      slug: "autoelektrik",
      parentSlug: "auto-mobilitaet",
      locale: "ua",
      categoryType: "child",
      metaTitle:
        "Автоелектрик у Німеччині — діагностика, запуск авто та виїзна допомога",
      metaDescription:
        "Знайдіть автоелектрика в Німеччині: проблеми із запуском, акумулятор, стартер, генератор, помилки на панелі, діагностика та мобільна допомога.",
      h1: "Автоелектрик у Німеччині",
      breadcrumbsLabel: "Автоелектрик",
      homeLabel: "Головна",
      parentLabel: "Авто і мобільність",
      intro:
        "Автоелектрик — це окрема і дуже важлива категорія автомобільних послуг. Сучасний автомобіль значною мірою залежить від електроніки: акумулятора, стартера, генератора, датчиків, блоків керування, запалювання, освітлення, сигналізації та систем безпеки.",
      sections: [
        {
          heading: "Чому автоелектрик — це окрема послуга",
          body:
            "Проблема може виглядати просто: машина не заводиться, світиться помилка або не працює певна система. Але причина може бути складною: акумулятор, стартер, генератор, проводка, запобіжники, датчики або електронні блоки керування.",
        },
        {
          heading: "Коли важлива виїзна допомога",
          body:
            "Особливість автоелектрика в тому, що багато питань можна перевірити не лише в автосервісі, а й на місці: біля дому, на парковці, біля роботи або там, де автомобіль зупинився. Це особливо важливо, якщо машина не заводиться і її не хочеться одразу везти евакуатором до майстерні.",
        },
        {
          heading: "З якими проблемами звертаються",
          body:
            "У категорії «Автоелектрик» на Freuly можна знайти спеціалістів, які допомагають із проблемами запуску, помилками на панелі, акумулятором, стартером, генератором, запобіжниками, проводкою, освітленням, датчиками, сигналізацією та іншими електронними системами автомобіля.",
        },
        {
          heading: "Чому зручно говорити своєю мовою",
          body:
            "Коли спеціаліст говорить українською або російською мовою, легше пояснити, що саме сталося: автомобіль стояв кілька днів і перестав заводитися, після заміни акумулятора з’явилися помилки, не працює світло або електроніка працює нестабільно.",
        },
        {
          heading: "Що дає первинна діагностика",
          body:
            "Автоелектрик — це не просто ремонт проводки. Це спеціаліст, який допомагає швидко зрозуміти, чи можна вирішити проблему на місці, чи потрібно їхати в автосервіс для глибшої діагностики.",
        },
      ],
      specialistsTitle: "Автоелектрики",
      specialistsEmpty: "Коли з’являться відповідні видимі профілі, вони будуть тут.",
      relatedTitle: "Інші авто розділи",
      relatedLinks: [
        { href: "auto-mobilitaet", label: "Авто і мобільність" },
        { href: "autowerkstatt-reparatur", label: "Автосервіс і ремонт" },
        { href: "autokauf-beratung", label: "Купівля та підбір авто" },
      ],
      cta: {
        heading: "Опишіть проблему автоелектрику",
        body: "Вкажіть помилки, поведінку під час запуску, акумулятор і чи може авто їхати.",
        buttonLabel: "Відкрити категорію",
        ctaHref: "/ua/specialists/autoelektrik",
      },
      seoText:
        "автоелектрик Німеччина, виїзний автоелектрик, машина не заводиться, діагностика автоелектрики, акумулятор авто, стартер, генератор, помилки авто.",
    },
  },
};
