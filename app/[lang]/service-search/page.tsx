import { isSupportedLang, type Lang } from "@/lib/i18n";
import ServiceSearchFlow from "@/components/search-flow/ServiceSearchFlow";

type LanguageOption = {
  value: "ua" | "ru" | "de";
  label: string;
};

type FormatOption = {
  value: "online" | "nearby" | "any";
  label: string;
  description: string;
};

type PageText = {
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
  nextCta: string;
  backCta: string;
  emptyServiceError: string;
};

const pageText: Record<Lang, PageText> = {
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
    nextCta: "Дальше",
    backCta: "Назад",
    emptyServiceError: "Введите услугу, чтобы продолжить.",
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
    nextCta: "Далі",
    backCta: "Назад",
    emptyServiceError: "Введіть послугу, щоб продовжити.",
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
    nextCta: "Weiter",
    backCta: "Zurück",
    emptyServiceError: "Bitte geben Sie eine Dienstleistung ein.",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const text = pageText[lang];

  return {
    title: `${text.headline} | Freuly`,
    description: text.description,
  };
}

export default function ServiceSearchPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";

  return <ServiceSearchFlow text={pageText[lang]} />;
}
