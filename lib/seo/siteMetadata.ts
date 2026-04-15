/** Shared SEO copy for [lang] routes — keeps hreflang URLs consistent. */
export const SITE_DOMAIN = "https://freuly.de";

export const HREFLANG_HOME = {
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
