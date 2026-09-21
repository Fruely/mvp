/**
 * Version metadata for specialist contractual documents.
 * German content in docs/legal/final-review/agb.de.md is authoritative for AGB wording.
 */

export const SPECIALIST_AGB_VERSION = "1.3";

export const SPECIALIST_AGB_EFFECTIVE_DATE = "2026-09-20";

export const SPECIALIST_AGB_DOCUMENT_ID = "freuly-specialist-agb";

export const SPECIALIST_RULES_VERSION = "2.2";

export function getSpecialistRulesVersion(): string {
  return SPECIALIST_RULES_VERSION;
}

/** Human-readable evidence bundle for server-side acceptance logging. */
export function specialistLegalAcceptanceMeta() {
  return {
    agbVersion: SPECIALIST_AGB_VERSION,
    agbDocumentId: SPECIALIST_AGB_DOCUMENT_ID,
    agbEffectiveDate: SPECIALIST_AGB_EFFECTIVE_DATE,
    rulesVersion: getSpecialistRulesVersion(),
  } as const;
}
