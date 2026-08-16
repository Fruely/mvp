import { createHash } from "node:crypto";
import { getGermanAgreementPlainText } from "@/content/partners/agreementContent";
import { getGermanAgreementPlainTextV10 } from "@/content/partners/agreementContentV10";
import { getGermanAgreementPlainTextV11 } from "@/content/partners/agreementContentV11";
import { getGermanAgreementPlainTextV12 } from "@/content/partners/agreementContentV12";
import {
  PARTNER_AGREEMENT_INTERMEDIATE_VERSION,
  PARTNER_AGREEMENT_LEGACY_VERSION,
  PARTNER_AGREEMENT_PREVIOUS_VERSION,
  PARTNER_AGREEMENT_VERSION,
} from "@/content/partners/agreementMeta";

export function resolveAgreementVersion(version?: string | null): string {
  const v = (version || PARTNER_AGREEMENT_VERSION).trim();
  if (v === PARTNER_AGREEMENT_LEGACY_VERSION) return PARTNER_AGREEMENT_LEGACY_VERSION;
  if (v === PARTNER_AGREEMENT_INTERMEDIATE_VERSION) {
    return PARTNER_AGREEMENT_INTERMEDIATE_VERSION;
  }
  if (v === PARTNER_AGREEMENT_PREVIOUS_VERSION) {
    return PARTNER_AGREEMENT_PREVIOUS_VERSION;
  }
  return PARTNER_AGREEMENT_VERSION;
}

export function getGermanAgreementPlainTextForVersion(version?: string | null): string {
  const resolved = resolveAgreementVersion(version);
  if (resolved === PARTNER_AGREEMENT_LEGACY_VERSION) {
    return getGermanAgreementPlainTextV10();
  }
  if (resolved === PARTNER_AGREEMENT_INTERMEDIATE_VERSION) {
    return getGermanAgreementPlainTextV11();
  }
  if (resolved === PARTNER_AGREEMENT_PREVIOUS_VERSION) {
    return getGermanAgreementPlainTextV12();
  }
  return getGermanAgreementPlainText();
}

/** SHA-256 of the canonical German Partnerprogramm-Bedingungen plain text for a version. */
export function getPartnerAgreementTextSha256(version?: string | null): string {
  return createHash("sha256")
    .update(getGermanAgreementPlainTextForVersion(version), "utf8")
    .digest("hex");
}

export function getPartnerAgreementProofPayload(
  locale?: string | null,
  version?: string | null
) {
  const resolvedVersion = resolveAgreementVersion(version);
  return {
    agreement_version: resolvedVersion,
    agreement_locale: locale || null,
    agreement_text_sha256: getPartnerAgreementTextSha256(resolvedVersion),
    agreement_language_canonical: "de",
  };
}

/** Frozen v1.0 hash for production acceptance verification. */
export const PARTNER_AGREEMENT_V10_SHA256 = getPartnerAgreementTextSha256(
  PARTNER_AGREEMENT_LEGACY_VERSION
);
