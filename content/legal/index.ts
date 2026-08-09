import { getDatenschutzDocument } from "./datenschutz";
import { getImpressumDocument } from "./impressum";
import type { LegalContentLang, LegalDocument, LegalPublicLang } from "./types";
import { isLegalContentLang, isLegalPublicLang } from "./types";

export type { LegalBlock, LegalContentLang, LegalDocument, LegalPublicLang, LegalSection } from "./types";
export {
  LEGAL_CONTENT_LANGS,
  LEGAL_PUBLIC_LANGS,
  isLegalContentLang,
  isLegalPublicLang,
} from "./types";
export { getDatenschutzDocument, DATENSCHUTZ_BY_LANG } from "./datenschutz";
export { getImpressumDocument, IMPRESSUM_BY_LANG } from "./impressum";
export {
  getAgbDocument,
  getSpecialistRulesDocument,
  getDatenschutzReviewDocument,
  getRankingDisclosureDocument,
  getCheckoutLegalCopy,
  getCookieCopyDocument,
} from "./reviewDocuments";

export type LegalDocumentKind = "impressum" | "datenschutz";

export function getLegalDocument(
  kind: LegalDocumentKind,
  lang: LegalContentLang | LegalPublicLang
): LegalDocument {
  if (kind === "impressum") return getImpressumDocument(lang);
  return getDatenschutzDocument(lang);
}

/** Resolve a public route lang; unknown values fall back to `de` (authoritative). */
export function resolveLegalPublicLang(value: string): LegalPublicLang {
  return isLegalPublicLang(value) ? value : "de";
}

/** Content lookup including prepared `en` texts (not published as routes). */
export function resolveLegalContentLang(value: string): LegalContentLang {
  return isLegalContentLang(value) ? value : "de";
}
