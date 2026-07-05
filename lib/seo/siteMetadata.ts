/** Shared SEO copy for [lang] routes — keeps hreflang URLs consistent. */
export const SITE_DOMAIN = "https://freuly.de";
export const SITE_ROOT_URL = `${SITE_DOMAIN}/`;

export const HREFLANG_HOME = {
  "x-default": SITE_ROOT_URL,
  uk: `${SITE_DOMAIN}/ua`,
  ru: `${SITE_DOMAIN}/ru`,
  de: `${SITE_DOMAIN}/de`,
} as const;

export type HreflangTriple = {
  uk: string;
  ru: string;
  de: string;
};

export const HOME_METADATA = {
  ua: {
    title: "Freuly — спеціалісти твоєю мовою в Німеччині",
    description:
      "Знайдіть психологів, юристів, майстрів та інших спеціалістів, які говорять вашою мовою — локально, онлайн або гібридно.",
  },
  ru: {
    title: "Freuly — специалисты на твоём языке в Германии",
    description:
      "Найдите психологов, юристов, мастеров и других специалистов, говорящих на вашем языке — локально, онлайн или гибридно.",
  },
  de: {
    title: "Freuly — Spezialisten auf Ihrer Sprache in Deutschland",
    description:
      "Finden Sie Psychologen, Anwälte, Handwerker und andere Fachkräfte, die Ihre Sprache sprechen — vor Ort, online oder hybrid.",
  },
} as const;

export const ABOUT_METADATA = {
  ua: {
    title: "Про платформу Freuly",
    description:
      "Freuly допомагає знаходити спеціалістів, які говорять вашою мовою: клієнти та професіонали знаходять одне одного без мовного бар’єру.",
  },
  ru: {
    title: "О платформе Freuly",
    description:
      "Freuly помогает находить специалистов, говорящих на вашем языке: клиенты и профессионалы находят друг друга без языкового барьера.",
  },
  de: {
    title: "Über die Freuly-Plattform",
    description:
      "Freuly hilft, Spezialisten zu finden, die Ihre Sprache sprechen: Kunden und Fachkräfte finden ohne Sprachbarriere zusammen.",
  },
} as const;

export const SUPPORT_METADATA = {
  ua: {
    title: "Підтримка Freuly",
    description:
      "Зв’яжіться з підтримкою Freuly: допомога з пошуком спеціаліста та роботою платформи. Відповідаємо зазвичай протягом 24 годин.",
  },
  ru: {
    title: "Поддержка Freuly",
    description:
      "Свяжитесь с поддержкой Freuly: помощь с поиском специалиста и работой платформы. Отвечаем обычно в течение 24 часов.",
  },
  de: {
    title: "Freuly Support",
    description:
      "Kontaktieren Sie den Freuly-Support: Hilfe bei der Spezialistensuche und zur Nutzung der Plattform. Antwort in der Regel innerhalb von 24 Stunden.",
  },
} as const;

export function hreflangAbout(): HreflangTriple {
  return {
    uk: `${SITE_DOMAIN}/ua/about`,
    ru: `${SITE_DOMAIN}/ru/about`,
    de: `${SITE_DOMAIN}/de/about`,
  };
}

export function hreflangSupport(): HreflangTriple {
  return {
    uk: `${SITE_DOMAIN}/ua/support`,
    ru: `${SITE_DOMAIN}/ru/support`,
    de: `${SITE_DOMAIN}/de/support`,
  };
}

export const PRICING_METADATA = {
  ua: {
    title: "Тарифи Freuly — умови для спеціалістів",
    description:
      "Зараз розміщення на Freuly безкоштовне. Майбутні тарифи будуть оголошені заздалегідь. Оплата на платформі поки не приймається.",
  },
  ru: {
    title: "Тарифы Freuly — условия для специалистов",
    description:
      "Сейчас размещение на Freuly бесплатно. Будущие тарифы будут объявлены заранее. Оплата на платформе пока не принимается.",
  },
  de: {
    title: "Freuly Tarife — Konditionen für Fachkräfte",
    description:
      "Die Nutzung für Spezialistinnen und Spezialisten ist derzeit kostenlos. Kostenpflichtige Tarife werden später mit Vorankündigung eingeführt. Es werden noch keine Zahlungen entgegengenommen.",
  },
} as const;

export function hreflangPricing(): HreflangTriple {
  return {
    uk: `${SITE_DOMAIN}/ua/pricing`,
    ru: `${SITE_DOMAIN}/ru/pricing`,
    de: `${SITE_DOMAIN}/de/pricing`,
  };
}

export const SPECIALIST_RULES_METADATA = {
  ua: {
    title: "Правила розміщення спеціалістів на Freuly",
    description:
      "Умови розміщення профілю та послуг спеціалістів на платформі Freuly: достовірність, якість контенту та відповідність кваліфікації.",
  },
  ru: {
    title: "Правила размещения специалистов на Freuly",
    description:
      "Условия размещения профиля и услуг специалистов на платформе Freuly: достоверность, качество контента и соответствие квалификации.",
  },
  de: {
    title: "Regeln für die Platzierung von Spezialisten auf Freuly",
    description:
      "Bedingungen für Profil und Leistungen auf Freuly: Wahrhaftigkeit, Qualität der Inhalte und Nachweis der Qualifikation.",
  },
} as const;

export function hreflangSpecialistRules(): HreflangTriple {
  return {
    uk: `${SITE_DOMAIN}/ua/specialist-rules`,
    ru: `${SITE_DOMAIN}/ru/specialist-rules`,
    de: `${SITE_DOMAIN}/de/specialist-rules`,
  };
}

/** hreflang for app/[lang]/{slug} SEO category landing pages. */
export function hreflangSeoCategory(slug: string): HreflangTriple & { "x-default": string } {
  return {
    uk: `${SITE_DOMAIN}/ua/${slug}`,
    ru: `${SITE_DOMAIN}/ru/${slug}`,
    de: `${SITE_DOMAIN}/de/${slug}`,
    "x-default": `${SITE_DOMAIN}/de/${slug}`,
  };
}
