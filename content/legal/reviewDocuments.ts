import type { LegalPublicLang } from "./types";
import { getReviewLegalDocument } from "@/lib/legal/reviewMarkdown";

export function getAgbDocument(lang: LegalPublicLang) {
  return getReviewLegalDocument("agb", lang, {
    metaTitle:
      lang === "de"
        ? "AGB für Spezialisten | Freuly"
        : lang === "ru"
          ? "AGB для специалистов | Freuly"
          : "AGB для спеціалістів | Freuly",
    metaDescription:
      lang === "de"
        ? "Allgemeine Geschäftsbedingungen für Spezialisten auf Freuly"
        : lang === "ru"
          ? "Общие условия для специалистов на Freuly"
          : "Загальні умови для спеціалістів на Freuly",
  });
}

export function getSpecialistRulesDocument(lang: LegalPublicLang) {
  return getReviewLegalDocument("specialist-rules", lang, {
    metaTitle:
      lang === "de"
        ? "Regeln für Spezialisten | Freuly"
        : lang === "ru"
          ? "Правила для специалистов | Freuly"
          : "Правила для спеціалістів | Freuly",
    metaDescription:
      lang === "de"
        ? "Verhaltensregeln für die Platzierung von Spezialisten auf Freuly"
        : lang === "ru"
          ? "Правила размещения специалистов на Freuly"
          : "Правила розміщення спеціалістів на Freuly",
  });
}

export function getDatenschutzReviewDocument(lang: LegalPublicLang) {
  return getReviewLegalDocument("datenschutz", lang, {
    metaTitle:
      lang === "de"
        ? "Datenschutzerklärung | Freuly"
        : lang === "ru"
          ? "Политика конфиденциальности | Freuly"
          : "Політика конфіденційності | Freuly",
    metaDescription:
      lang === "de"
        ? "Datenschutzerklärung für freuly.de"
        : lang === "ru"
          ? "Политика конфиденциальности freuly.de"
          : "Політика конфіденційності freuly.de",
  });
}

export function getRankingDisclosureDocument(lang: LegalPublicLang) {
  return getReviewLegalDocument("ranking", lang, {
    metaTitle:
      lang === "de"
        ? "Ranking-Transparenz | Freuly"
        : lang === "ru"
          ? "Прозрачность ранжирования | Freuly"
          : "Прозорість ранжування | Freuly",
    metaDescription:
      lang === "de"
        ? "Informationen zur Sortierung von Spezialisten in der Freuly-Suche"
        : lang === "ru"
          ? "Информация о сортировке специалистов в поиске Freuly"
          : "Інформація про сортування спеціалістів у пошуку Freuly",
  });
}

export function getCheckoutLegalCopy(lang: LegalPublicLang) {
  return getReviewLegalDocument("checkout-copy", lang, {
    metaTitle: "Checkout legal copy",
    metaDescription: "Checkout legal copy",
  });
}

export function getCookieCopyDocument(lang: LegalPublicLang) {
  return getReviewLegalDocument("cookie-copy", lang, {
    metaTitle: "Cookie copy",
    metaDescription: "Cookie copy",
  });
}
