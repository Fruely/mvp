/**
 * Version metadata for specialist contractual documents.
 * German content in docs/legal/final-review/agb.de.md is authoritative for AGB wording.
 */

export const SPECIALIST_AGB_VERSION =
  process.env.SPECIALIST_AGB_VERSION || process.env.TERMS_VERSION || "1.0";

export const SPECIALIST_AGB_EFFECTIVE_DATE = "2026-08-09";

export const SPECIALIST_AGB_DOCUMENT_ID = "freuly-specialist-agb";

export const SPECIALIST_RULES_VERSION =
  process.env.SPECIALIST_RULES_VERSION || "2.1";

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
