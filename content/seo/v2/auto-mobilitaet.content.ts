import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO hub: auto & mobility services in Germany (parent). */
export const autoMobilitaetContent: LocalizedSeoCategory = {
  slug: "auto-mobilitaet",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%auto%,category.ilike.%mobil%,category.ilike.%werkstatt%,category.ilike.%elektrik%",
  content: {
    de: {
      slug: "auto-mobilitaet",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle:
        "Auto & Mobilität in Deutschland — Werkstatt, Autoelektrik und Autokauf-Beratung",
      metaDescription:
        "Finden Sie russisch- und ukrainischsprachige Spezialisten für Auto, Mobilität, Werkstatt, Reparatur, Autoelektrik, Diagnose und Autokauf-Beratung in Deutschland.",
      h1: "Auto & Mobilität in Deutschland",
      breadcrumbsLabel: "Auto & Mobilität",
      homeLabel: "Startseite",
      intro:
        "Auto & Mobilität umfasst viele Situationen, in denen Menschen in Deutschland zuverlässige Unterstützung rund um ihr Fahrzeug brauchen: Reparatur, Wartung, Diagnose, Autoelektrik, Hilfe beim Autokauf, technische Prüfung vor dem Kauf und Vorbereitung auf den TÜV.",
      subcategoriesTitle: "Auto-Dienstleistungen auf Freuly",
      subcategories: [
        {
          slug: "autowerkstatt-reparatur",
          label: "Autowerkstatt & Reparatur",
          description: "Diagnose, Wartung, Kfz-Reparatur und TÜV-Vorbereitung.",
        },
        {
          slug: "autoelektrik",
          label: "Autoelektrik",
          description: "Startprobleme, Batterie, Lichtmaschine, Sensoren und Fehlersuche.",
        },
        {
          slug: "autokauf-beratung",
          label: "Autokauf & Beratung",
          description: "Fahrzeugauswahl und Prüfung vor dem Gebrauchtwagenkauf.",
        },
      ],
      sections: [
        {
          heading: "Wann Auto-Dienstleistungen wichtig sind",
          body:
            "Für viele russisch- und ukrainischsprachige Menschen in Deutschland ist ein Auto ein wichtiger Teil des Alltags. Es geht um Arbeit, Familie, Arzttermine, Schule, Einkäufe und Mobilität in Regionen, in denen öffentliche Verkehrsmittel nicht immer ausreichen. Umso wichtiger ist es, einen Spezialisten zu finden, der technische Probleme verständlich erklären kann.",
        },
        {
          heading: "Welche Spezialisten Nutzer finden können",
          body:
            "Auf Freuly finden Nutzer passende Fachleute für Autowerkstatt, Reparatur, Autoelektrik und Autokauf-Beratung. Besonders hilfreich ist das, wenn man komplexe technische Fragen lieber auf Russisch oder Ukrainisch besprechen möchte.",
        },
        {
          heading: "Wofür diese Kategorie gedacht ist",
          body:
            "Die Kategorie „Auto & Mobilität“ bündelt praktische Dienstleistungen rund um Fahrzeug, Reparatur, Sicherheit und Kaufentscheidung.",
        },
      ],
      specialistsTitle: "Spezialist:innen für Auto & Mobilität",
      specialistsEmpty:
        "Sobald passende sichtbare Profile vorhanden sind, erscheinen sie hier.",
      relatedTitle: "Weitere Bereiche",
      relatedLinks: [
        {
          href: "autowerkstatt-reparatur",
          label: "Autowerkstatt & Reparatur",
          description: "Für Diagnose, Wartung und Reparatur.",
        },
        {
          href: "autoelektrik",
          label: "Autoelektrik",
          description: "Für Startprobleme, Batterie und Elektronik.",
        },
      ],
      cta: {
        heading: "Passende Auto-Kategorie wählen",
        body: "Wenn Sie bereits wissen, ob es um Reparatur, Elektrik oder Kaufberatung geht, öffnen Sie die passende Unterseite.",
        buttonLabel: "Autowerkstatt & Reparatur",
        ctaHref: "/de/autowerkstatt-reparatur",
      },
      seoText:
        "Auto Service Deutschland, Autowerkstatt Deutschland, Autoelektrik, Autokauf Beratung, Kfz Reparatur, russischsprachige Autowerkstatt, ukrainischsprachiger Automechaniker.",
    },
    ru: {
      slug: "auto-mobilitaet",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Авто и мобильность в Германии — автосервисы, автоэлектрики и помощь с покупкой авто",
      metaDescription:
        "Найдите русскоязычных и украиноязычных специалистов по автоуслугам в Германии: автосервис, ремонт, автоэлектрика, диагностика, подбор и покупка автомобиля.",
      h1: "Авто и мобильность в Германии",
      breadcrumbsLabel: "Авто и мобильность",
      homeLabel: "Главная",
      intro:
        "Авто и мобильность в Германии — это не только ремонт машины, но и целый набор ситуаций, в которых человеку нужен понятный специалист: автосервис, диагностика, автоэлектрик, помощь при покупке автомобиля, проверка машины перед сделкой, подготовка к TÜV и консультация по техническому состоянию.",
      subcategoriesTitle: "Автоуслуги на Freuly",
      subcategories: [
        {
          slug: "autowerkstatt-reparatur",
          label: "Автосервис и ремонт",
          description: "Диагностика, ремонт, обслуживание и подготовка к TÜV.",
        },
        {
          slug: "autoelektrik",
          label: "Автоэлектрик",
          description: "Проблемы запуска, аккумулятор, генератор, ошибки и проводка.",
        },
        {
          slug: "autokauf-beratung",
          label: "Покупка и подбор авто",
          description: "Проверка машины перед покупкой и консультация по сделке.",
        },
      ],
      sections: [
        {
          heading: "Когда нужны автоуслуги",
          body:
            "Для многих русскоязычных и украиноязычных жителей Германии автомобиль — это не роскошь, а способ нормально жить: ездить на работу, возить детей, посещать врачей, решать бытовые вопросы и не зависеть полностью от общественного транспорта. Поэтому особенно важно найти специалиста, который не только разбирается в технике, но и может объяснить проблему простым языком.",
        },
        {
          heading: "Каких специалистов можно найти",
          body:
            "На Freuly можно найти специалистов, связанных с автомобильными услугами: автосервисы, автомехаников, автоэлектриков и консультантов по покупке автомобиля. Это удобно, если нужно обсудить ремонт на русском или украинском языке, понять реальную стоимость работ, разобраться с диагностикой или получить второе мнение перед дорогим ремонтом.",
        },
        {
          heading: "Зачем нужна эта категория",
          body:
            "Категория «Авто и мобильность» объединяет практические услуги, которые помогают сохранить автомобиль в рабочем состоянии, безопасно купить машину и быстрее решить технические проблемы без лишней путаницы.",
        },
      ],
      specialistsTitle: "Специалисты по авто и мобильности",
      specialistsEmpty: "Когда появятся подходящие видимые профили, они будут здесь.",
      relatedTitle: "Связанные авторазделы",
      relatedLinks: [
        {
          href: "autowerkstatt-reparatur",
          label: "Автосервис и ремонт",
          description: "Для диагностики, обслуживания и ремонта.",
        },
        {
          href: "autoelektrik",
          label: "Автоэлектрик",
          description: "Для запуска, аккумулятора и электроники.",
        },
      ],
      cta: {
        heading: "Выберите нужное направление",
        body: "Если уже понятно, нужна ли мастерская, автоэлектрик или помощь с покупкой, откройте соответствующую страницу.",
        buttonLabel: "Автосервис и ремонт",
        ctaHref: "/ru/autowerkstatt-reparatur",
      },
      seoText:
        "авто услуги Германия, автосервис Германия, автоэлектрик Германия, ремонт авто Германия, подбор авто Германия, покупка авто Германия, русскоязычный автомеханик, украинский автомеханик.",
    },
    ua: {
      slug: "auto-mobilitaet",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Авто і мобільність у Німеччині — автосервіси, автоелектрики та допомога з купівлею авто",
      metaDescription:
        "Знайдіть україномовних і російськомовних спеціалістів з автоуслуг у Німеччині: автосервіс, ремонт, автоелектрика, діагностика та підбір автомобіля.",
      h1: "Авто і мобільність у Німеччині",
      breadcrumbsLabel: "Авто і мобільність",
      homeLabel: "Головна",
      intro:
        "Авто і мобільність у Німеччині — це не лише ремонт автомобіля, а цілий комплекс ситуацій, у яких потрібен зрозумілий і надійний спеціаліст: автосервіс, діагностика, автоелектрик, допомога з купівлею автомобіля, перевірка машини перед угодою та підготовка до TÜV.",
      subcategoriesTitle: "Авто послуги на Freuly",
      subcategories: [
        {
          slug: "autowerkstatt-reparatur",
          label: "Автосервіс і ремонт",
          description: "Діагностика, ремонт, обслуговування і підготовка до TÜV.",
        },
        {
          slug: "autoelektrik",
          label: "Автоелектрик",
          description: "Запуск, акумулятор, генератор, помилки й електроніка.",
        },
        {
          slug: "autokauf-beratung",
          label: "Купівля та підбір авто",
          description: "Перевірка авто перед покупкою і консультація щодо угоди.",
        },
      ],
      sections: [
        {
          heading: "Коли потрібні авто послуги",
          body:
            "Для багатьох українців у Німеччині автомобіль є важливою частиною повсякденного життя. Це робота, діти, лікарі, покупки, переїзди та мобільність у містах і невеликих населених пунктах. Тому важливо мати можливість звернутися до спеціаліста, який може пояснити технічну проблему зрозумілою мовою.",
        },
        {
          heading: "Яких спеціалістів можна знайти",
          body:
            "На Freuly можна знайти фахівців з автосервісу, ремонту, автоелектрики та консультацій щодо купівлі автомобіля. Це особливо корисно, коли складні технічні питання зручніше обговорити українською або російською мовою.",
        },
        {
          heading: "Навіщо потрібна ця категорія",
          body:
            "Категорія «Авто і мобільність» об’єднує практичні послуги, які допомагають підтримувати автомобіль у справному стані, безпечніше купувати машину та швидше вирішувати технічні проблеми.",
        },
      ],
      specialistsTitle: "Спеціалісти з авто і мобільності",
      specialistsEmpty: "Коли з’являться відповідні видимі профілі, вони будуть тут.",
      relatedTitle: "Пов’язані авто розділи",
      relatedLinks: [
        {
          href: "autowerkstatt-reparatur",
          label: "Автосервіс і ремонт",
          description: "Для діагностики, обслуговування та ремонту.",
        },
        {
          href: "autoelektrik",
          label: "Автоелектрик",
          description: "Для запуску, акумулятора й електроніки.",
        },
      ],
      cta: {
        heading: "Оберіть потрібний напрям",
        body: "Якщо вже зрозуміло, чи потрібен сервіс, автоелектрик або допомога з купівлею, відкрийте відповідну сторінку.",
        buttonLabel: "Автосервіс і ремонт",
        ctaHref: "/ua/autowerkstatt-reparatur",
      },
      seoText:
        "авто послуги Німеччина, автосервіс Німеччина, автоелектрик Німеччина, ремонт авто Німеччина, підбір авто Німеччина, купівля авто Німеччина.",
    },
  },
};
