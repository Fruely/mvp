import type { LegalContentLang, LegalDocument, LegalPublicLang } from "./types";
import { isLegalPublicLang } from "./types";
import { getDatenschutzReviewDocument } from "./reviewDocuments";

const TRANSLATION_NOTICE = {
  ua: "Цей переклад надано для зручності. У разі розбіжностей визначальною є німецька версія.",
  ru: "Этот перевод предоставлен для удобства. В случае расхождений определяющей является немецкая версия.",
  en: "This translation is provided for convenience. In the event of discrepancies, the German version shall prevail.",
} as const;

function withEnglishPrepared(doc: LegalDocument): LegalDocument {
  return {
    ...doc,
    metaTitle: "Privacy Policy | Freuly",
    metaDescription: "Privacy policy for freuly.de",
    translationNotice: TRANSLATION_NOTICE.en,
  };
}

export function getDatenschutzDocument(
  lang: LegalContentLang | LegalPublicLang
): LegalDocument {
  if (lang === "en") {
    return withEnglishPrepared(getDatenschutzReviewDocument("de"));
  }
  const publicLang = isLegalPublicLang(lang) ? lang : "de";
  return getDatenschutzReviewDocument(publicLang);
}

/** @deprecated use getDatenschutzDocument */
export const DATENSCHUTZ_BY_LANG = {
  de: () => getDatenschutzDocument("de"),
  ua: () => getDatenschutzDocument("ua"),
  ru: () => getDatenschutzDocument("ru"),
  en: () => getDatenschutzDocument("en"),
};
