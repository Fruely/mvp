import type { FlowFormat, FlowLanguage } from "@/lib/search/serviceSearchFlow.logic";

type LanguageOption = {
  value: FlowLanguage;
  label: string;
};

type FormatOption = {
  value: FlowFormat;
  label: string;
  description: string;
};

type PopularCategory = {
  slug: string;
  label: string;
};

export type ServiceSearchFlowText = {
  headline: string;
  description: string;
  startHeadline: string;
  startCta: string;
  serviceQuestion: string;
  serviceInputLabel: string;
  serviceInputPlaceholder: string;
  languageQuestion: string;
  languageOptions: LanguageOption[];
  formatQuestion: string;
  formatOptions: FormatOption[];
  locationQuestion: string;
  locationInputLabel: string;
  locationInputPlaceholder: string;
  radiusLabel: string;
  radiusUnit: string;
  nextCta: string;
  backCta: string;
  submitCta: string;
  submittingCta: string;
  emptyServiceError: string;
  emptyLocationError: string;
  stepProgress: string;
  popularCategoriesLabel: string;
  popularCategories: PopularCategory[];
};

export const SERVICE_SEARCH_FLOW_TEXT: Record<"ru" | "ua" | "de", ServiceSearchFlowText> = {
  ru: {
    headline: "Какую услугу вы ищете?",
    description: "Короткий подбор услуги и специалиста на Freuly",
    startHeadline: "Какую услугу вы ищете?",
    startCta: "Начать поиск",
    serviceQuestion: "Какая услуга вам нужна?",
    serviceInputLabel: "Услуга",
    serviceInputPlaceholder: "Введите услугу",
    languageQuestion: "На каком языке вам удобно получить услугу?",
    languageOptions: [
      { value: "ua", label: "Українська" },
      { value: "ru", label: "Русский" },
      { value: "de", label: "Deutsch" },
    ],
    formatQuestion: "Какой формат вам подходит?",
    formatOptions: [
      {
        value: "online",
        label: "Онлайн",
        description: "Специалист сможет работать с вами дистанционно.",
      },
      {
        value: "nearby",
        label: "Рядом со мной",
        description: "Покажем специалистов поблизости, если это возможно.",
      },
      {
        value: "any",
        label: "Без разницы",
        description: "Подойдут и онлайн, и локальные варианты.",
      },
    ],
    locationQuestion: "Где вам нужна услуга?",
    locationInputLabel: "Город или индекс",
    locationInputPlaceholder: "Например: Köln или 50667",
    radiusLabel: "Радиус поиска",
    radiusUnit: "км",
    nextCta: "Дальше",
    backCta: "Назад",
    submitCta: "Показать специалистов",
    submittingCta: "Поиск…",
    emptyServiceError: "Введите услугу, чтобы продолжить.",
    emptyLocationError: "Укажите город или индекс, чтобы продолжить.",
    stepProgress: "Шаг {current} из {total}",
    popularCategoriesLabel: "Популярные категории:",
    popularCategories: [
      { slug: "psychologists", label: "Психологи" },
      { slug: "lawyers", label: "Адвокаты" },
      { slug: "tutors", label: "Репетиторы" },
      { slug: "migration-consultants", label: "Миграционные консультанты" },
    ],
  },
  ua: {
    headline: "Яку послугу ви шукаєте?",
    description: "Короткий підбір послуги та спеціаліста на Freuly",
    startHeadline: "Яку послугу ви шукаєте?",
    startCta: "Почати пошук",
    serviceQuestion: "Яка послуга вам потрібна?",
    serviceInputLabel: "Послуга",
    serviceInputPlaceholder: "Введіть послугу",
    languageQuestion: "Якою мовою вам зручно отримати послугу?",
    languageOptions: [
      { value: "ua", label: "Українська" },
      { value: "ru", label: "Русский" },
      { value: "de", label: "Deutsch" },
    ],
    formatQuestion: "Який формат вам підходить?",
    formatOptions: [
      {
        value: "online",
        label: "Онлайн",
        description: "Спеціаліст зможе працювати з вами дистанційно.",
      },
      {
        value: "nearby",
        label: "Поруч зі мною",
        description: "Покажемо спеціалістів поблизу, якщо це можливо.",
      },
      {
        value: "any",
        label: "Без різниці",
        description: "Підійдуть і онлайн, і локальні варіанти.",
      },
    ],
    locationQuestion: "Де вам потрібна послуга?",
    locationInputLabel: "Місто або індекс",
    locationInputPlaceholder: "Наприклад: Köln або 50667",
    radiusLabel: "Радіус пошуку",
    radiusUnit: "км",
    nextCta: "Далі",
    backCta: "Назад",
    submitCta: "Показати спеціалістів",
    submittingCta: "Пошук…",
    emptyServiceError: "Введіть послугу, щоб продовжити.",
    emptyLocationError: "Вкажіть місто або індекс, щоб продовжити.",
    stepProgress: "Крок {current} з {total}",
    popularCategoriesLabel: "Популярні категорії:",
    popularCategories: [
      { slug: "psychologists", label: "Психологи" },
      { slug: "lawyers", label: "Адвокати" },
      { slug: "tutors", label: "Репетитори" },
      { slug: "migration-consultants", label: "Міграційні консультанти" },
    ],
  },
  de: {
    headline: "Welche Dienstleistung suchen Sie?",
    description: "Kurze Auswahl einer Dienstleistung und passender Spezialisten auf Freuly",
    startHeadline: "Welche Dienstleistung suchen Sie?",
    startCta: "Suche starten",
    serviceQuestion: "Welche Dienstleistung benötigen Sie?",
    serviceInputLabel: "Dienstleistung",
    serviceInputPlaceholder: "Dienstleistung eingeben",
    languageQuestion: "In welcher Sprache möchten Sie die Dienstleistung erhalten?",
    languageOptions: [
      { value: "ua", label: "Українська" },
      { value: "ru", label: "Русский" },
      { value: "de", label: "Deutsch" },
    ],
    formatQuestion: "Welches Format passt zu Ihnen?",
    formatOptions: [
      {
        value: "online",
        label: "Online",
        description: "Der Spezialist kann aus der Ferne mit Ihnen arbeiten.",
      },
      {
        value: "nearby",
        label: "In meiner Nähe",
        description: "Wir zeigen passende Spezialisten in Ihrer Nähe, wenn möglich.",
      },
      {
        value: "any",
        label: "Egal",
        description: "Online- und lokale Angebote sind beide in Ordnung.",
      },
    ],
    locationQuestion: "Wo benötigen Sie die Dienstleistung?",
    locationInputLabel: "Stadt oder Postleitzahl",
    locationInputPlaceholder: "Zum Beispiel: Köln oder 50667",
    radiusLabel: "Suchradius",
    radiusUnit: "km",
    nextCta: "Weiter",
    backCta: "Zurück",
    submitCta: "Spezialisten anzeigen",
    submittingCta: "Suche…",
    emptyServiceError: "Bitte geben Sie eine Dienstleistung ein.",
    emptyLocationError: "Bitte geben Sie Stadt oder PLZ ein.",
    stepProgress: "Schritt {current} von {total}",
    popularCategoriesLabel: "Beliebte Kategorien:",
    popularCategories: [
      { slug: "psychologists", label: "Psychologen" },
      { slug: "lawyers", label: "Anwälte" },
      { slug: "tutors", label: "Nachhilfelehrer" },
      { slug: "migration-consultants", label: "Migrationsberater" },
    ],
  },
};
