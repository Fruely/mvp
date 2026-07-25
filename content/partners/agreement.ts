/**
 * Partnerprogramm-Bedingungen v1.0 — public agreement source.
 * Canonical / authoritative language: German (DE).
 */
export type { AgreementBlock } from "@/content/partners/agreementContent";
export { getPartnerAgreement, getGermanAgreementPlainText } from "@/content/partners/agreementContent";
export {
  PARTNER_AGREEMENT_VERSION,
  PARTNER_AGREEMENT_EFFECTIVE_DATE,
  PARTNER_AGREEMENT_TITLE,
  PARTNER_PROVIDER,
  PARTNER_REWARD_VALIDATION_DAYS,
} from "@/content/partners/agreementMeta";

import type { Lang } from "@/lib/i18n";
import { getPartnerAgreement } from "@/content/partners/agreementContent";

/** @deprecated Use getPartnerAgreement — kept for call-site compatibility. */
export function getPartnerAgreementDraft(lang: Lang) {
  const doc = getPartnerAgreement(lang);
  return {
    version: doc.version,
    title: doc.title,
    disclaimer: doc.governingNote || "",
    effectiveDate: doc.effectiveDate,
    governingNote: doc.governingNote,
    blocks: doc.blocks,
  };
}
