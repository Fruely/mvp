import { isSupportedLang, type Lang } from "@/lib/i18n";
import ServiceSearchFlow from "@/components/search-flow/ServiceSearchFlow";

type LanguageOption = {
  value: "ua" | "ru" | "de";
  label: string;
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
